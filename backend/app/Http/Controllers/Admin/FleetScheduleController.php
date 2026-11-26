<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\RideRequest;
use App\Models\Vehicle;
use App\Models\VehicleBlockout;
use App\Support\ApiResponse;
use App\Support\FleetAvailability;
use App\Support\RateCatalog;
use App\Support\SiteRateFleet;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class FleetScheduleController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        if (! Schema::hasTable('vehicles')) {
            return ApiResponse::data([
                'counters' => [
                    'cadillac_escalade' => ['name' => 'Cadillac Escalade', 'free' => 2, 'total' => 2],
                    'chevrolet_suburban' => ['name' => 'Chevrolet Suburban', 'free' => 1, 'total' => 1],
                    'chevrolet_traverse' => ['name' => 'Chevrolet Traverse', 'free' => 0, 'total' => 1],
                    'lincoln_aviator' => ['name' => 'Lincoln Aviator', 'free' => 1, 'total' => 1],
                ],
                'vehicles' => [],
                'timeline' => ['date' => '2026-11-18', 'tracks' => []],
            ]);
        }

        try {
            $this->ensureFleetVehiclesExist();
        } catch (\Throwable $e) {
            // Ignore if seeding already handled
        }

        $dateStr = $request->query('date', now()->toDateString());
        $selectedDate = Carbon::parse($dateStr)->startOfDay();

        $vehicles = Vehicle::with('blockouts')->orderBy('sort_order', 'asc')->get();

        // Dynamically compute live counters from vehicles in database
        $counters = [];
        foreach ($vehicles as $v) {
            $baseName = preg_replace('/\s*#\d+$/', '', $v->name);
            $slug = Str::slug($baseName, '_');
            if (! isset($counters[$slug])) {
                $counters[$slug] = [
                    'name' => $baseName,
                    'free' => 0,
                    'total' => 0,
                ];
            }
            $counters[$slug]['total']++;
            $isBlocked = false;
            if ($v->relationLoaded('blockouts')) {
                $isBlocked = $v->blockouts->contains(function ($b) {
                    return now()->between($b->start_at, $b->end_at);
                });
            }
            $hasActiveRide = false;
            if (Schema::hasTable('ride_requests')) {
                try {
                    $hasActiveRide = RideRequest::where(function ($q) use ($v) {
                        $q->where('vehicle_id', $v->id)
                            ->orWhere('assigned_vehicle', 'like', '%'.$v->name.'%');
                    })->where('status', 'in_progress')->exists();
                } catch (\Throwable $e) {
                    $hasActiveRide = false;
                }
            }
            if (! $v->is_out_of_service && ! $isBlocked && ! $hasActiveRide) {
                $counters[$slug]['free']++;
            }
        }

        // Format vehicle list cards & schedule
        $formattedVehicles = $vehicles->map(function (Vehicle $v) {
            $classAndSize = $v->category ? (($v->class_type === 'first' ? '1st Class · ' : 'Executive Class · ').$v->category) : '1st Class · SUV';

            $bookedRides = [];

            return [
                'id' => $v->id,
                'name' => $v->name,
                'plate' => $v->plate ?: 'Add plate',
                'class_type' => $v->class_type,
                'category' => $v->category,
                'size' => FleetAvailability::sizeOf($v),
                'passengers' => $v->passengers,
                'luggage' => $v->luggage,
                'class_and_size' => $classAndSize,
                'available_from' => $v->available_from ?: '00:00',
                'available_until' => $v->available_until ?: '23:59',
                'available_days' => $v->available_days ?: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
                'is_out_of_service' => (bool) $v->is_out_of_service,
                'status_label' => $v->is_out_of_service ? 'Out of service' : 'Available now',
                'blockouts' => $v->blockouts->map(fn ($b) => [
                    'id' => $b->id,
                    'reason' => $b->reason,
                    'start_at' => $b->start_at->toIso8601String(),
                    'end_at' => $b->end_at->toIso8601String(),
                ]),
                'booked_rides' => $bookedRides,
            ];
        });

        // 24-hr Gantt schedule tracks built dynamically from database vehicles
        $tracks = $vehicles->map(function (Vehicle $v) use ($selectedDate) {
            $vehicleClass = $v->class_type === 'first' ? '1st Class' : 'Executive Class';

            $rideBookings = collect();
            if (Schema::hasTable('ride_requests')) {
                try {
                    $rideBookings = RideRequest::where(function ($q) use ($v) {
                        $q->where('vehicle_id', $v->id)
                            ->orWhere('assigned_vehicle', 'like', '%'.$v->name.'%');
                    })
                        ->whereDate('pickup_at', $selectedDate)
                        ->whereNotIn('status', ['cancelled'])
                        ->get()
                        ->map(function ($ride) {
                            $start = Carbon::parse($ride->pickup_at);
                            $startHour = $start->hour + ($start->minute / 60);
                            $hours = $ride->hours ?: 3;

                            return [
                                'ride_reference' => $ride->reference,
                                'client_name' => $ride->customer_name ?? 'Client',
                                'label' => $ride->reference.' · '.($ride->customer_name ?? 'Client'),
                                'start_hour' => round($startHour, 2),
                                'end_hour' => round(min(24, $startHour + $hours), 2),
                                'color' => 'amber',
                            ];
                        });
                } catch (\Throwable $e) {
                    $rideBookings = collect();
                }
            }

            $blockoutItems = $v->blockouts
                ->filter(function ($b) use ($selectedDate) {
                    return Carbon::parse($b->start_at)->isSameDay($selectedDate);
                })
                ->map(function ($b) {
                    $start = Carbon::parse($b->start_at);
                    $end = Carbon::parse($b->end_at);
                    $startHour = $start->hour + ($start->minute / 60);
                    $endHour = $end->hour + ($end->minute / 60);

                    return [
                        'ride_reference' => 'BLOCKOUT',
                        'client_name' => $b->reason,
                        'label' => 'Blocked · '.$b->reason,
                        'start_hour' => round($startHour, 2),
                        'end_hour' => round($endHour, 2),
                        'color' => 'gray',
                    ];
                });

            $bookings = array_merge($rideBookings->all(), $blockoutItems->all());

            return [
                'vehicle_id' => (string) $v->id,
                'vehicle_name' => $v->name,
                'vehicle_class' => $vehicleClass,
                'bookings' => $bookings,
            ];
        });

        $timeline = [
            'date' => $selectedDate->format('Y-m-d'),
            'date_formatted' => $selectedDate->format('D, M j'),
            'tracks' => $tracks->all(),
        ];

        return ApiResponse::data([
            'counters' => $counters,
            'vehicles' => $formattedVehicles,
            'classes' => SiteRateFleet::classes(),
            'sizes' => SiteRateFleet::sizes(),
            'timeline' => $timeline,
        ]);
    }

    public function blockout(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'vehicle_id' => 'required|string',
            'start_at' => 'required|date',
            'end_at' => 'required|date|after:start_at',
            'reason' => 'required|string|max:255',
        ]);

        $vehicle = Vehicle::find($validated['vehicle_id']);
        if (! $vehicle) {
            return ApiResponse::error('VEHICLE_NOT_FOUND', 'Vehicle not found.', 404);
        }
        $vehicleName = $vehicle->name;

        $blockout = VehicleBlockout::create([
            'vehicle_id' => $validated['vehicle_id'],
            'vehicle_name' => $vehicleName,
            'start_at' => Carbon::parse($validated['start_at']),
            'end_at' => Carbon::parse($validated['end_at']),
            'reason' => $validated['reason'],
            'created_by' => $request->user()?->getKey(),
        ]);

        AuditLog::record('vehicle.blockout.created', $request->user()?->getKey(), [
            'vehicle_id' => $validated['vehicle_id'],
            'reason' => $validated['reason'],
        ], null);

        return ApiResponse::data(['blockout' => $blockout], 201);
    }

    public function storeVehicle(Request $request): JsonResponse
    {
        if (! Schema::hasTable('vehicles')) {
            return ApiResponse::error('SCHEMA_MISSING', 'Fleet vehicles table is not available.', 503);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'plate' => 'nullable|string|max:50',
            'class_type' => ['nullable', 'string', Rule::in(RateCatalog::classKeys())],
            'size' => ['nullable', 'string', Rule::in(RateCatalog::sizeKeys())],
            'category' => 'nullable|string|max:100',
            'passengers' => 'nullable|integer|min:1|max:60',
            'luggage' => 'nullable|integer|min:0|max:60',
            'available_from' => 'nullable|string|max:10',
            'available_until' => 'nullable|string|max:10',
            'available_days' => 'nullable|array',
            'is_out_of_service' => 'nullable|boolean',
            'sort_order' => 'nullable|integer|min:0',
            'is_active' => 'nullable|boolean',
        ]);

        $class = $validated['class_type'] ?? 'exec';
        $size = $validated['size'] ?? 'suv';
        $sizeName = collect(SiteRateFleet::sizes())->firstWhere('id', $size)['name'] ?? $size;
        $category = $validated['category'] ?? $sizeName;

        $vehicle = Vehicle::create([
            'name' => $validated['name'],
            'slug' => Str::slug($validated['name']).'-'.Str::lower(Str::random(4)),
            'plate' => $validated['plate'] ?? null,
            'class_type' => $class,
            'category' => $category,
            'form_value' => $class.'|'.$size,
            'passengers' => $validated['passengers'] ?? 3,
            'luggage' => $validated['luggage'] ?? 3,
            'available_from' => $validated['available_from'] ?? '00:00',
            'available_until' => $validated['available_until'] ?? '23:59',
            'available_days' => $validated['available_days'] ?? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
            'is_out_of_service' => (bool) ($validated['is_out_of_service'] ?? false),
            'sort_order' => $validated['sort_order'] ?? (Vehicle::max('sort_order') + 1),
            'is_active' => $validated['is_active'] ?? true,
        ]);

        AuditLog::record('vehicle.created', $request->user()?->getKey(), ['vehicle_id' => $vehicle->id], $vehicle);

        return ApiResponse::data(['vehicle' => $vehicle], 201);
    }

    public function destroyVehicle(Request $request, string $id): JsonResponse
    {
        $vehicle = Vehicle::findOrFail($id);
        $vehicle->delete();
        AuditLog::record('vehicle.deleted', $request->user()?->getKey(), ['vehicle_id' => $id]);

        return ApiResponse::data(['message' => 'Vehicle deleted.']);
    }

    public function updateVehicle(Request $request, string $id): JsonResponse
    {
        $vehicle = Vehicle::findOrFail($id);
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'plate' => 'nullable|string|max:50',
            'class_type' => ['sometimes', 'string', Rule::in(RateCatalog::classKeys())],
            'size' => ['sometimes', 'string', Rule::in(RateCatalog::sizeKeys())],
            'category' => 'nullable|string|max:100',
            'passengers' => 'nullable|integer|min:1|max:60',
            'luggage' => 'nullable|integer|min:0|max:60',
            'available_from' => 'nullable|string|max:10',
            'available_until' => 'nullable|string|max:10',
            'available_days' => 'nullable|array',
            'is_out_of_service' => 'nullable|boolean',
        ]);

        if (array_key_exists('class_type', $validated) || array_key_exists('size', $validated)) {
            $class = $validated['class_type'] ?? $vehicle->class_type;
            $size = $validated['size'] ?? FleetAvailability::sizeOf($vehicle);
            if (is_string($size) && $size !== '') {
                $validated['class_type'] = $class;
                $validated['form_value'] = $class.'|'.$size;
                if (! array_key_exists('category', $validated) || $validated['category'] === null || $validated['category'] === '') {
                    $validated['category'] = collect(SiteRateFleet::sizes())->firstWhere('id', $size)['name'] ?? $vehicle->category;
                }
            }
        }
        unset($validated['size']);

        $vehicle->update($validated);

        AuditLog::record('vehicle.availability.updated', $request->user()?->getKey(), [
            'vehicle_id' => $vehicle->id,
            'is_out_of_service' => $vehicle->is_out_of_service,
        ], $vehicle);

        return ApiResponse::data(['vehicle' => $vehicle->fresh()]);
    }

    private function ensureFleetVehiclesExist(): void
    {
        if (Vehicle::count() >= 5) {
            return;
        }

        $seeds = [
            ['name' => 'Cadillac Escalade #1', 'class_type' => 'first', 'category' => 'SUV', 'plate' => 'NJ ESC-101', 'sort_order' => 1],
            ['name' => 'Cadillac Escalade #2', 'class_type' => 'first', 'category' => 'SUV', 'plate' => 'NJ ESC-102', 'sort_order' => 2],
            ['name' => 'Chevrolet Suburban', 'class_type' => 'exec', 'category' => 'SUV', 'plate' => 'NJ SUB-201', 'sort_order' => 3],
            ['name' => 'Chevrolet Traverse', 'class_type' => 'exec', 'category' => 'Compact SUV', 'plate' => 'NJ TRV-301', 'sort_order' => 4],
            ['name' => 'Lincoln Aviator', 'class_type' => 'first', 'category' => 'Compact SUV', 'plate' => 'NJ AVI-401', 'sort_order' => 5],
        ];

        foreach ($seeds as $v) {
            $size = str_contains(strtolower($v['category']), 'compact') ? 'sedan' : 'suv';
            Vehicle::firstOrCreate(
                ['name' => $v['name']],
                [
                    'slug' => Str::slug($v['name']),
                    'class_type' => $v['class_type'],
                    'category' => $v['category'],
                    'plate' => $v['plate'],
                    'form_value' => $v['class_type'].'|'.$size,
                    'passengers' => $size === 'suv' ? 6 : 3,
                    'luggage' => $size === 'suv' ? 6 : 3,
                    'available_from' => '00:00',
                    'available_until' => '23:59',
                    'available_days' => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
                    'is_out_of_service' => false,
                    'sort_order' => $v['sort_order'],
                    'is_active' => true,
                ]
            );
        }
    }
}
