<?php

namespace App\Http\Controllers\Driver;

use App\Http\Controllers\Controller;
use App\Models\Driver;
use App\Models\DriverNotification;
use App\Models\RideRequest;
use App\Support\ApiResponse;
use App\Support\CustomerMailer;
use App\Support\RideStateMachine;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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
        ]);
    }

    /** Security shifts assigned to this driver (read-only; assignment is decided by staff). */
    public function mySecurityShifts(Request $request): JsonResponse
    {
        $driver = $this->resolveDriverOrPreview($request);
        if (! $driver) {
            return ApiResponse::error('DRIVER_NOT_FOUND', 'Driver profile not found.', 404);
        }

        return ApiResponse::data(['shifts' => \Illuminate\Support\Facades\DB::table('security_shifts')
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

        return ApiResponse::data(['rides' => $query->get()]);
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
            'ride' => $ride,
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
