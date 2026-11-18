<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Driver;
use App\Models\DriverNotification;
use App\Models\RideRequest;
use App\Support\ApiResponse;
use App\Support\CustomerMailer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class RideDispatchController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = RideRequest::with('assignedDriver')->orderBy('created_at', 'desc');

        if ($request->filled('status') && $request->status !== 'all') {
            $status = $request->status;
            if ($status === 'new' || $status === 'new_request') {
                $query->whereIn('status', ['pending', 'new']);
            } elseif ($status === 'dispatched' || $status === 'driver_assigned') {
                $query->whereIn('status', ['dispatched', 'driver_assigned', 'broadcast']);
            } else {
                $query->where('status', $status);
            }
        }

        if ($request->filled('q')) {
            $q = trim($request->q);
            $query->where(function ($sub) use ($q) {
                $sub->where('first_name', 'like', "%{$q}%")
                    ->orWhere('last_name', 'like', "%{$q}%")
                    ->orWhere('phone', 'like', "%{$q}%")
                    ->orWhere('email', 'like', "%{$q}%")
                    ->orWhere('reference', 'like', "%{$q}%");
            });
        }

        if ($request->filled('from')) {
            $query->where('ride_date', '>=', $request->from);
        }

        if ($request->filled('to')) {
            $query->where('ride_date', '<=', $request->to);
        }

        $rides = $query->get();

        return ApiResponse::data(['rides' => $rides]);
    }

    public function show(string $id): JsonResponse
    {
        $ride = RideRequest::with('assignedDriver')->findOrFail($id);
        return ApiResponse::data(['ride' => $ride]);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        if ($request->isJson() && ! $request->has('status') && is_string($raw = $request->getContent())) {
            $trimmed = trim($raw);
            if (str_starts_with($trimmed, '"') || str_starts_with($trimmed, '{')) {
                $decoded = json_decode($trimmed, true);
                if (is_string($decoded)) {
                    $decoded = json_decode($decoded, true);
                }
                if (is_array($decoded)) {
                    $request->merge($decoded);
                }
            }
        }

        return DB::transaction(function () use ($request, $id) {
            $ride = RideRequest::where('id', $id)->lockForUpdate()->firstOrFail();
            $previousDriverId = $ride->assigned_driver_id;
            $previousStatus = $ride->status;

            $validated = $request->validate([
                'status' => 'sometimes|required|string|in:pending,new,broadcast,dispatched,driver_assigned,in_progress,completed,cancelled',
                'assigned_driver_id' => 'nullable|exists:drivers,id',
                'first_name' => 'nullable|string|max:100',
                'last_name' => 'nullable|string|max:100',
                'phone' => 'nullable|string|max:50',
                'email' => 'nullable|email|max:150',
                'service_type' => 'nullable|string|max:50',
                'driver_tier' => 'nullable|string|max:20',
                'ride_date' => 'nullable|string|max:30',
                'ride_time' => 'nullable|string|max:30',
                'vehicle' => 'nullable|string|max:100',
                'driver_preference' => 'nullable|string|max:100',
                'pickup_location' => 'nullable|string|max:255',
                'dropoff_location' => 'nullable|string|max:255',
                'dispatch_notes' => 'nullable|string',
                'details' => 'nullable|array',
            ]);

            // If updating details, merge with existing details
            if ($request->has('details')) {
                $existingDetails = $ride->details ?? [];
                $newDetails = array_merge($existingDetails, $request->input('details', []));
                $validated['details'] = $newDetails;
            }

            // Client Car Dispatch Safety Lock:
            // If assigning a driver for Client Car Service, verify agreement is signed
            $isClientCar = ($validated['service_type'] ?? $ride->service_type) === 'client-car'
                || ($validated['service_type'] ?? $ride->service_type) === 'client_car';

            $newDriverId = array_key_exists('assigned_driver_id', $validated)
                ? $validated['assigned_driver_id']
                : $ride->assigned_driver_id;

            if ($isClientCar && $newDriverId && $newDriverId !== $previousDriverId) {
                $details = $validated['details'] ?? $ride->details ?? [];
                $isSigned = !empty($details['is_client_car_signed']);
                if (!$isSigned && !$request->boolean('override_agreement')) {
                    return ApiResponse::error(
                        'CLIENT_CAR_AGREEMENT_REQUIRED',
                        'Dispatch is blocked: Client Car Service Agreement has not been signed or recorded.',
                        422
                    );
                }
            }

            $ride->update($validated);

            if (isset($validated['status']) && $validated['status'] !== $previousStatus) {
                CustomerMailer::sendRideStatusChanged($ride, $previousStatus, $validated['status']);
                AuditLog::record('ride.status_updated', $request->user()?->id, [
                    'before' => ['status' => $previousStatus],
                    'after' => ['status' => $validated['status']],
                ], $ride);
            }

            // Driver assignment notification & audit
            if (!empty($validated['assigned_driver_id']) && $validated['assigned_driver_id'] !== $previousDriverId) {
                DriverNotification::create([
                    'driver_id' => $validated['assigned_driver_id'],
                    'ride_request_id' => $ride->id,
                    'title' => 'New Ride Assigned (' . $ride->reference . ')',
                    'message' => 'You have been dispatched for a ride on ' . $ride->ride_date . ' at ' . $ride->ride_time . '. Passenger: ' . $ride->first_name . ' ' . $ride->last_name . '.',
                    'type' => 'assignment',
                    'is_read' => false,
                ]);

                AuditLog::record('ride.driver_assigned', $request->user()?->id, [
                    'before' => ['assigned_driver_id' => $previousDriverId],
                    'after' => ['assigned_driver_id' => $validated['assigned_driver_id']],
                ], $ride);
            }

            return ApiResponse::data(['ride' => $ride->fresh()->load('assignedDriver')]);
        });
    }

    /**
     * Create a manual Phone Booking from Central Dispatch.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'first_name' => 'required|string|max:100',
            'last_name' => 'nullable|string|max:100',
            'phone' => 'required|string|max:50',
            'email' => 'nullable|email|max:150',
            'service_type' => 'required|string|max:50',
            'driver_tier' => 'nullable|string|max:20',
            'ride_date' => 'required|string|max:30',
            'ride_time' => 'required|string|max:30',
            'vehicle' => 'nullable|string|max:100',
            'pickup_location' => 'required|string|max:255',
            'dropoff_location' => 'nullable|string|max:255',
            'dispatch_notes' => 'nullable|string',
            'driver_preference' => 'nullable|string|max:100',
            'assigned_driver_id' => 'nullable|exists:drivers,id',
            'details' => 'nullable|array',
        ]);

        $reference = 'AR-' . strtoupper(Str::random(4));
        while (RideRequest::where('reference', $reference)->exists()) {
            $reference = 'AR-' . strtoupper(Str::random(4));
        }

        $ride = RideRequest::create(array_merge($validated, [
            'reference' => $reference,
            'request_type' => 'phone',
            'status' => !empty($validated['assigned_driver_id']) ? 'dispatched' : 'pending',
            'details' => array_merge($validated['details'] ?? [], [
                'created_via' => 'phone_booking',
                'status_log' => [
                    [
                        'status' => 'New request',
                        'channel' => 'Phone Booking',
                        'timestamp' => now()->toDayDateTimeString(),
                        'agent' => $request->user()?->name ?? 'Dispatcher',
                    ],
                ],
            ]),
        ]));

        AuditLog::record('ride.phone_booking_created', $request->user()?->id, [
            'reference' => $reference,
            'phone' => $validated['phone'],
        ], $ride);

        return ApiResponse::data(['ride' => $ride->load('assignedDriver')], 201);
    }

    /**
     * Record signed Client Car Service agreement manually.
     */
    public function recordAgreement(Request $request, string $id): JsonResponse
    {
        $ride = RideRequest::findOrFail($id);
        $details = $ride->details ?? [];
        $details['is_client_car_signed'] = true;
        $details['agreement_signed_at'] = now()->toISOString();
        $details['agreement_recorded_by'] = $request->user()?->name ?? 'Staff';

        $ride->update(['details' => $details]);

        AuditLog::record('client_car.agreement_recorded', $request->user()?->id, [
            'is_client_car_signed' => true,
        ], $ride);

        return ApiResponse::data([
            'ride' => $ride->fresh()->load('assignedDriver'),
            'message' => 'Client Car Service Agreement recorded successfully.',
        ]);
    }

    /**
     * Broadcast ride request to all qualified operators of matching Tier and Operating Mode.
     */
    public function broadcast(Request $request, string $id): JsonResponse
    {
        $ride = RideRequest::findOrFail($id);
        $tier = (int) ($ride->driver_tier ?? 1);
        $isClientCar = str_contains(strtolower($ride->service_type), 'client');

        $query = Driver::where('is_active', true)->where('service_tier', '<=', $tier);
        if ($isClientCar) {
            $query->where('is_client_car_operator', true);
        } else {
            $query->where('is_fleet_operator', true);
        }

        $drivers = $query->get();
        foreach ($drivers as $driver) {
            DriverNotification::create([
                'driver_id' => $driver->id,
                'ride_request_id' => $ride->id,
                'title' => "Broadcast Offer ({$ride->reference})",
                'message' => "New {$ride->service_type} ride offer on {$ride->ride_date} at {$ride->ride_time}. First to accept secures the run.",
                'type' => 'broadcast',
                'is_read' => false,
            ]);
        }

        $details = $ride->details ?? [];
        $statusLog = $details['status_log'] ?? [];
        $statusLog[] = [
            'status' => 'Broadcast',
            'channel' => 'Dispatch',
            'timestamp' => now()->toDayDateTimeString(),
            'notes' => 'Broadcasted to ' . $drivers->count() . ' qualified operators.',
        ];
        $details['status_log'] = $statusLog;
        $details['broadcast_at'] = now()->toISOString();
        $details['broadcast_recipients_count'] = $drivers->count();

        $ride->update([
            'status' => 'broadcast',
            'details' => $details,
        ]);

        return ApiResponse::data([
            'ride' => $ride->fresh()->load('assignedDriver'),
            'recipients_count' => $drivers->count(),
            'message' => "Offer broadcasted to {$drivers->count()} qualified operators.",
        ]);
    }
}

