<?php

namespace App\Http\Controllers\Driver;

use App\Http\Controllers\Controller;
use App\Models\Driver;
use App\Models\DriverNotification;
use App\Models\RideRequest;
use App\Support\ApiResponse;
use App\Support\CustomerMailer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DriverPortalController extends Controller
{
    /**
     * Get the logged-in driver's profile
     */
    protected function getDriver(Request $request): ?Driver
    {
        $user = $request->user();
        if (!$user) return null;

        // Find driver by user_id first, then fallback to email matching (latest created)
        $driver = Driver::with('tier')->where('user_id', $user->id)->first();
        if (!$driver && $user->email) {
            $driver = Driver::with('tier')->where('email', $user->email)->latest()->first();
        }
        return $driver;
    }

    /**
     * Driver Dashboard & Active Profile Info
     */
    public function profile(Request $request): JsonResponse
    {
        $driver = $this->getDriver($request);

        // If an admin or manager accesses the portal, provide administrative view of first active driver or mock profile
        if (!$driver) {
            $user = $request->user();
            $isAdminOrManager = $user && $user->roles()->whereIn('key', ['super_admin', 'operations_manager', 'dispatcher'])->exists();

            if ($isAdminOrManager) {
                $driver = Driver::with('tier')->first();
                if (!$driver) {
                    $driver = new Driver([
                        'id' => 'admin-preview',
                        'name' => $user->name . ' (Admin Preview)',
                        'email' => $user->email,
                        'phone' => '+1 (800) ARCHER',
                        'is_active' => true,
                    ]);
                }
            } else {
                return ApiResponse::error('DRIVER_NOT_FOUND', 'Driver profile not found for this user account.', 404);
            }
        }

        $stats = [
            'total_rides' => RideRequest::where('assigned_driver_id', $driver->id)->count(),
            'pending_rides' => RideRequest::where('assigned_driver_id', $driver->id)->whereIn('status', ['pending', 'dispatched'])->count(),
            'completed_rides' => RideRequest::where('assigned_driver_id', $driver->id)->where('status', 'completed')->count(),
            'unread_notifications' => DriverNotification::where('driver_id', $driver->id)->where('is_read', false)->count(),
        ];

        return ApiResponse::data([
            'driver' => $driver,
            'stats' => $stats,
        ]);
    }

    /**
     * List all rides assigned to this driver
     */
    public function myRides(Request $request): JsonResponse
    {
        $driver = $this->getDriver($request);

        if (!$driver) {
            $user = $request->user();
            $isAdminOrManager = $user && $user->roles()->whereIn('key', ['super_admin', 'operations_manager', 'dispatcher'])->exists();

            if ($isAdminOrManager) {
                $driver = Driver::with('tier')->first();
            }

            if (!$driver) {
                return ApiResponse::error('DRIVER_NOT_FOUND', 'Driver profile not found.', 404);
            }
        }

        $query = RideRequest::where('assigned_driver_id', $driver->id)->orderBy('ride_date', 'asc')->orderBy('ride_time', 'asc');

        if ($request->has('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        $rides = $query->get();

        return ApiResponse::data(['rides' => $rides]);
    }

    /**
     * Driver updates the status of an assigned ride (e.g. Dispatched -> In Progress -> Completed)
     */
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
            return ApiResponse::error('Driver profile not found.', 404);
        }

        $ride = RideRequest::where('id', $rideId)
            ->where('assigned_driver_id', $driver->id)
            ->firstOrFail();

        $validated = $request->validate([
            'status' => 'required|string|in:dispatched,in_progress,completed,cancelled',
            'notes' => 'nullable|string',
        ]);

        $previousStatus = $ride->status;
        $ride->status = $validated['status'];
        if (!empty($validated['notes'])) {
            $ride->dispatch_notes = ($ride->dispatch_notes ? $ride->dispatch_notes . "\n" : "") . "[Driver Note]: " . $validated['notes'];
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

    /**
     * Driver in-app notifications
     */
    public function notifications(Request $request): JsonResponse
    {
        $driver = $this->getDriver($request);

        if (!$driver) {
            $user = $request->user();
            $isAdminOrManager = $user && $user->roles()->whereIn('key', ['super_admin', 'operations_manager', 'dispatcher'])->exists();

            if ($isAdminOrManager) {
                $driver = Driver::with('tier')->first();
            }

            if (!$driver) {
                return ApiResponse::error('DRIVER_NOT_FOUND', 'Driver profile not found.', 404);
            }
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

    /**
     * Mark notifications as read
     */
    public function markNotificationRead(Request $request, string $id): JsonResponse
    {
        $driver = $this->getDriver($request);

        if (!$driver) {
            return ApiResponse::error('Driver profile not found.', 404);
        }

        if ($id === 'all') {
            DriverNotification::where('driver_id', $driver->id)->update(['is_read' => true]);
        } else {
            DriverNotification::where('driver_id', $driver->id)->where('id', $id)->update(['is_read' => true]);
        }

        return ApiResponse::data(['message' => 'Notification marked as read']);
    }
}
