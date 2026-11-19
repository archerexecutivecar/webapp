<?php

namespace App\Http\Controllers\Driver;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Driver;
use App\Models\DriverNotification;
use App\Models\RideRequest;
use App\Support\ApiResponse;
use App\Support\CustomerMailer;
use App\Support\DriverCredentials;
use App\Support\DriverEarningsSummary;
use App\Support\DriverOfferCard;
use App\Support\DriverOfferEligibility;
use App\Support\OperationalFleet;
use App\Support\RideStateMachine;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DriverPortalController extends Controller
{
    protected function allowPreview(): bool
    {
        if (app()->environment('production')) {
            return false;
        }

        return (bool) config('archer.allow_driver_preview', false);
    }

    /**
     * Get the logged-in driver's profile. Staff preview of another driver is opt-in and never in production.
     */
    protected function getDriver(Request $request): ?Driver
    {
        $user = $request->user();
        if (!$user) {
            return null;
        }

        $driver = Driver::with('tier')->where('user_id', $user->id)->first();
        if (!$driver && $user->email) {
            $driver = Driver::with('tier')->where('email', $user->email)->latest()->first();
        }

        return $driver;
    }

    protected function resolveDriverOrPreview(Request $request): ?Driver
    {
        $driver = $this->getDriver($request);
        if ($driver) {
            return $driver;
        }

        if (!$this->allowPreview()) {
            return null;
        }

        $user = $request->user();
        $isAdminOrManager = $user && $user->roles()->whereIn('key', ['super_admin', 'operations_manager', 'dispatcher'])->exists();
        if (!$isAdminOrManager) {
            return null;
        }

        return Driver::with('tier')->first();
    }

    public function profile(Request $request): JsonResponse
    {
        $driver = $this->resolveDriverOrPreview($request);

        if (!$driver) {
            return ApiResponse::error('DRIVER_NOT_FOUND', 'Driver profile not found for this user account.', 404);
        }

        $stats = [
            'total_rides' => RideRequest::where('assigned_driver_id', $driver->id)->count(),
            'pending_rides' => RideRequest::where('assigned_driver_id', $driver->id)->whereIn('status', ['pending', 'dispatched', 'on_my_way', 'at_doorstep'])->count(),
            'completed_rides' => RideRequest::where('assigned_driver_id', $driver->id)->where('status', 'completed')->count(),
            'unread_notifications' => DriverNotification::where('driver_id', $driver->id)->where('is_read', false)->count(),
        ];

        return ApiResponse::data([
            'driver' => $driver,
            'stats' => $stats,
            'preview' => $this->getDriver($request)?->id !== $driver->id,
            'portal' => $this->portalPayload($driver),
        ]);
    }

    /** @return array<string, mixed> */
    protected function portalPayload(Driver $driver): array
    {
        $credentials = DriverCredentials::forDriver($driver);
        $modes = [];
        if ($driver->is_fleet_operator) {
            $modes[] = 'Fleet';
        }
        if ($driver->is_client_car_operator) {
            $modes[] = 'Client car';
        }
        if ($driver->is_owner_operator) {
            $modes[] = 'Owner-operator';
        }

        return [
            'id' => (string) $driver->id,
            'name' => $driver->name,
            'email' => $driver->email,
            'phone' => $driver->phone,
            'tier_number' => $driver->service_tier,
            'tier_label' => $driver->tier?->label,
            'modes' => $modes,
            'is_online' => (bool) $driver->is_online,
            'push_alerts_enabled' => (bool) $driver->push_alerts_enabled,
            'credentials' => $credentials,
        ];
    }

    public function updatePresence(Request $request): JsonResponse
    {
        $driver = $this->getDriver($request);
        if (! $driver) {
            return ApiResponse::error('DRIVER_NOT_FOUND', 'Driver profile not found for this user account.', 404);
        }

        $validated = $request->validate([
            'is_online' => 'required|boolean',
            'push_alerts_enabled' => 'sometimes|boolean',
        ]);

        $driver->is_online = $validated['is_online'];
        $driver->push_alerts_enabled = $validated['push_alerts_enabled'] ?? $validated['is_online'];
        $driver->save();

        AuditLog::record('driver.presence_updated', $request->user()?->id, [
            'driver_id' => $driver->id,
            'is_online' => $driver->is_online,
            'push_alerts_enabled' => $driver->push_alerts_enabled,
        ], $driver);

        return ApiResponse::data(['portal' => $this->portalPayload($driver->fresh('tier'))]);
    }

    public function offers(Request $request): JsonResponse
    {
        $driver = $this->resolveDriverOrPreview($request);
        if (! $driver) {
            return ApiResponse::error('DRIVER_NOT_FOUND', 'Driver profile not found.', 404);
        }

        $offers = RideRequest::query()
            ->where('status', 'broadcast')
            ->whereNull('assigned_driver_id')
            ->orderBy('ride_date')
            ->orderBy('ride_time')
            ->get()
            ->filter(fn (RideRequest $ride) => DriverOfferEligibility::driverMatches($driver, $ride))
            ->map(fn (RideRequest $ride) => DriverOfferCard::present($ride))
            ->values();

        return ApiResponse::data(['offers' => $offers]);
    }

    public function acceptOffer(Request $request, string $rideId): JsonResponse
    {
        $driver = $this->getDriver($request);
        if (! $driver) {
            return ApiResponse::error('DRIVER_NOT_FOUND', 'Driver profile not found.', 404);
        }

        $result = DB::transaction(function () use ($request, $driver, $rideId) {
            $ride = RideRequest::query()->where('id', $rideId)->lockForUpdate()->first();
            if (! $ride) {
                return ['missing' => true];
            }

            if ($ride->status !== 'broadcast' || $ride->assigned_driver_id) {
                return ['taken' => true];
            }

            if (! DriverOfferEligibility::driverMatches($driver, $ride)) {
                return ['ineligible' => true];
            }

            $previous = $ride->status;
            $next = RideStateMachine::assertTransition($previous, 'dispatched');
            $details = is_array($ride->details) ? $ride->details : [];
            $log = $details['status_log'] ?? [];
            $log[] = [
                'status' => 'Accepted',
                'channel' => 'Driver PWA',
                'timestamp' => now()->toDayDateTimeString(),
                'notes' => 'Accepted by '.$driver->name,
            ];
            $details['status_log'] = $log;
            $details['accepted_at'] = now()->toIso8601String();
            $ride->status = $next;
            $ride->assigned_driver_id = $driver->id;
            $ride->details = $details;
            $ride->save();

            AuditLog::record('ride.offer_accepted', $request->user()?->id, [
                'driver_id' => $driver->id,
                'previous_status' => $previous,
                'status' => $next,
            ], $ride);

            return ['ride' => $ride, 'previous' => $previous];
        });

        if (! empty($result['missing'])) {
            return ApiResponse::error('RIDE_NOT_FOUND', 'That ride offer was not found.', 404);
        }
        if (! empty($result['taken'])) {
            return ApiResponse::error('OFFER_UNAVAILABLE', 'Another driver already accepted this ride.', 409);
        }
        if (! empty($result['ineligible'])) {
            return ApiResponse::error('NOT_ELIGIBLE', 'This ride is outside your tier or operating mode.', 403);
        }

        /** @var RideRequest $ride */
        $ride = $result['ride'];
        CustomerMailer::sendRideStatusChanged($ride, $result['previous'], $ride->status);

        return ApiResponse::data([
            'message' => 'Ride accepted.',
            'ride' => $ride->fresh(),
        ]);
    }

    public function earnings(Request $request): JsonResponse
    {
        $driver = $this->resolveDriverOrPreview($request);
        if (! $driver) {
            return ApiResponse::error('DRIVER_NOT_FOUND', 'Driver profile not found.', 404);
        }

        $history = DriverEarningsSummary::history($driver);

        return ApiResponse::data([
            'pay_week' => DriverEarningsSummary::week($driver, $history),
            'history' => $history,
        ]);
    }

    /** Security shifts assigned to this driver (read-only; assignment is decided by staff). */
    public function mySecurityShifts(Request $request): JsonResponse
    {
        $driver = $this->resolveDriverOrPreview($request);
        if (! $driver) {
            return ApiResponse::error('DRIVER_NOT_FOUND', 'Driver profile not found.', 404);
        }

        return ApiResponse::data(['shifts' => DB::table('security_shifts')
            ->where('assigned_driver_id', $driver->id)->whereIn('status', ['assigned', 'swap_pending'])
            ->where('ends_at', '>=', now())->orderBy('starts_at')
            ->get(['id', 'name', 'site_address', 'shift_date_label', 'starts_at', 'ends_at', 'tier', 'status', 'is_critical'])]);
    }

    public function myRides(Request $request): JsonResponse
    {
        $driver = $this->resolveDriverOrPreview($request);

        if (!$driver) {
            return ApiResponse::error('DRIVER_NOT_FOUND', 'Driver profile not found.', 404);
        }

        $query = RideRequest::where('assigned_driver_id', $driver->id)->orderBy('ride_date', 'asc')->orderBy('ride_time', 'asc');

        if ($request->has('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        $rides = $query->get()->map(fn (RideRequest $ride) => $this->assignedRide($ride));

        return ApiResponse::data(['rides' => $rides]);
    }

    /** @return array<string, mixed> */
    protected function assignedRide(RideRequest $ride): array
    {
        return [
            'id' => (string) $ride->id,
            'reference' => $ride->reference,
            'first_name' => $ride->first_name,
            'last_name' => $ride->last_name,
            'phone' => $ride->phone,
            'service_type' => $ride->service_type,
            'driver_tier' => $ride->driver_tier,
            'ride_date' => $ride->ride_date,
            'ride_time' => $ride->ride_time,
            'pickup_location' => $ride->pickup_location,
            'dropoff_location' => $ride->dropoff_location,
            'vehicle' => OperationalFleet::displayName($ride->vehicle) ?? $ride->vehicle,
            'security_addon' => $ride->security_addon,
            'dispatch_notes' => $ride->dispatch_notes,
            'status' => $ride->status,
            'allowed_next' => RideStateMachine::allowedFrom($ride->status),
        ];
    }

    public function updateRideStatus(Request $request, string $rideId): JsonResponse
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

        $driver = $this->getDriver($request);

        if (!$driver) {
            return ApiResponse::error('DRIVER_NOT_FOUND', 'Driver profile not found.', 404);
        }

        $ride = RideRequest::where('id', $rideId)
            ->where('assigned_driver_id', $driver->id)
            ->firstOrFail();

        $validated = $request->validate([
            'status' => 'required|string|in:dispatched,on_my_way,at_doorstep,at_your_doorstep,ride_started,in_progress,ride_ended,completed,cancelled',
            'notes' => 'nullable|string',
        ]);

        try {
            $validated['status'] = RideStateMachine::assertTransition($ride->status, $validated['status']);
        } catch (\InvalidArgumentException $e) {
            return ApiResponse::error('ILLEGAL_STATUS_TRANSITION', $e->getMessage(), 422);
        }

        $previousStatus = $ride->status;
        $ride->status = $validated['status'];
        if (!empty($validated['notes'])) {
            $ride->dispatch_notes = ($ride->dispatch_notes ? $ride->dispatch_notes . "\n" : '') . '[Driver Note]: ' . $validated['notes'];
        }
        $ride->save();

        if ($previousStatus !== $validated['status']) {
            CustomerMailer::sendRideStatusChanged($ride, $previousStatus, $validated['status']);
        }

        return ApiResponse::data([
            'message' => 'Ride status updated successfully',
            'ride' => $this->assignedRide($ride->fresh()),
        ]);
    }

    public function notifications(Request $request): JsonResponse
    {
        $driver = $this->resolveDriverOrPreview($request);

        if (!$driver) {
            return ApiResponse::error('DRIVER_NOT_FOUND', 'Driver profile not found.', 404);
        }

        $notifications = DriverNotification::where('driver_id', $driver->id)
            ->orderBy('created_at', 'desc')
            ->take(30)
            ->get();

        $unreadCount = DriverNotification::where('driver_id', $driver->id)
            ->where('is_read', false)
            ->count();

        return ApiResponse::data([
            'notifications' => $notifications,
            'unread_count' => $unreadCount,
        ]);
    }

    public function markNotificationRead(Request $request, string $id): JsonResponse
    {
        $driver = $this->getDriver($request);

        if (!$driver) {
            return ApiResponse::error('DRIVER_NOT_FOUND', 'Driver profile not found.', 404);
        }

        if ($id === 'all') {
            DriverNotification::where('driver_id', $driver->id)->update(['is_read' => true]);
        } else {
            DriverNotification::where('driver_id', $driver->id)->where('id', $id)->update(['is_read' => true]);
        }

        return ApiResponse::data(['message' => 'Notification marked as read']);
    }
}
