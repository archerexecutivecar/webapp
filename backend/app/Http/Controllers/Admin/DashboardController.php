<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Driver;
use App\Models\RideRequest;
use App\Models\Role;
use App\Models\User;
use App\Models\SiteVehicle;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $user = $request->user();

        // 1. Live Operational Ride Metrics
        $totalRides = RideRequest::count();
        $pendingRides = RideRequest::where('status', 'pending')->count();
        $dispatchedRides = RideRequest::where('status', 'dispatched')->count();
        $inProgressRides = RideRequest::where('status', 'in_progress')->count();
        $completedRides = RideRequest::where('status', 'completed')->count();
        $cancelledRides = RideRequest::where('status', 'cancelled')->count();

        // 2. Chauffeur & Fleet Readiness
        $totalDrivers = Driver::count();
        $activeDrivers = Driver::where('is_active', true)->count();
        $totalVehicles = SiteVehicle::count();
        $activeVehicles = SiteVehicle::where('is_active', true)->count();

        // 3. Today & Weekly Trend
        $todayDate = now()->toDateString();
        $todayRidesCount = RideRequest::where('ride_date', $todayDate)->count();
        $newTodayCount = RideRequest::whereDate('created_at', $todayDate)->count();

        // 4. Service Type Breakdown
        $serviceBreakdown = RideRequest::select('service_type', DB::raw('count(*) as count'))
            ->groupBy('service_type')
            ->pluck('count', 'service_type')
            ->all();

        // 5. Status Breakdown
        $statusBreakdown = [
            'pending' => $pendingRides,
            'dispatched' => $dispatchedRides,
            'in_progress' => $inProgressRides,
            'completed' => $completedRides,
            'cancelled' => $cancelledRides,
        ];

        // 6. Latest Dispatch Queue (Incoming Passenger Requests)
        $latestRides = RideRequest::with('assignedDriver')
            ->orderBy('created_at', 'desc')
            ->take(8)
            ->get();

        // 7. Active Fleet Chauffeurs
        $rosterDrivers = Driver::with('tier')
            ->where('is_active', true)
            ->orderBy('sort_order', 'asc')
            ->take(6)
            ->get();

        // 8. Chauffeur Utilization (Rides assigned per driver)
        $driverAssignments = RideRequest::whereNotNull('assigned_driver_id')
            ->whereIn('status', ['pending', 'dispatched', 'in_progress'])
            ->select('assigned_driver_id', DB::raw('count(*) as active_trips'))
            ->groupBy('assigned_driver_id')
            ->pluck('active_trips', 'assigned_driver_id')
            ->all();

        $rosterDriversWithStats = $rosterDrivers->map(function ($driver) use ($driverAssignments) {
            return [
                'id' => $driver->id,
                'name' => $driver->name,
                'phone' => $driver->phone,
                'bio' => $driver->bio,
                'tier' => $driver->tier ? ['name' => $driver->tier->name] : null,
                'is_active' => $driver->is_active,
                'active_missions' => $driverAssignments[$driver->id] ?? 0,
            ];
        });

        // 9. Dispatch Efficiency Score
        $dispatchEfficiency = $totalRides > 0 
            ? round((($totalRides - $pendingRides) / $totalRides) * 100) 
            : 100;

        // 10. Core Staff & Security Audit Metrics (matches original schema for DashboardTest)
        $staffUsers = [
            'total' => User::count(),
            'active' => User::where('status', User::STATUS_ACTIVE)->count(),
            'suspended' => User::where('status', User::STATUS_SUSPENDED)->count(),
        ];

        $usersByRole = Role::withCount('users')->orderBy('key')->get()
            ->map(fn (Role $r) => ['role' => $r->key, 'name' => $r->name, 'users' => $r->users_count])
            ->all();

        $security = [
            'failed_logins_24h' => AuditLog::where('event', 'auth.login_failed')
                ->where('created_at', '>=', now()->subDay())->count(),
            'successful_logins_24h' => AuditLog::where('event', 'auth.login')
                ->where('created_at', '>=', now()->subDay())->count(),
        ];

        $data = [
            'metrics' => [
                'total_rides' => $totalRides,
                'pending_requests' => $pendingRides,
                'dispatched_rides' => $dispatchedRides,
                'in_progress_rides' => $inProgressRides,
                'completed_rides' => $completedRides,
                'cancelled_rides' => $cancelledRides,
                'today_scheduled' => $todayRidesCount,
                'new_today' => $newTodayCount,
                'active_drivers' => $activeDrivers,
                'total_drivers' => $totalDrivers,
                'active_fleet' => $activeVehicles,
                'total_fleet' => $totalVehicles,
                'dispatch_efficiency' => $dispatchEfficiency,
            ],
            'staff_users' => $staffUsers,
            'users_by_role' => $usersByRole,
            'security' => $security,
            'service_breakdown' => $serviceBreakdown,
            'status_breakdown' => $statusBreakdown,
            'latest_rides' => $latestRides,
            'roster_drivers' => $rosterDriversWithStats,
        ];

        if ($user->hasPermission('audit.view')) {
            $data['recent_audit_events'] = $this->recentEvents($user)->map(fn (AuditLog $a) => [
                'id' => $a->id,
                'event' => $a->event,
                'actor_id' => $a->actor_id,
                'created_at' => $a->created_at->toIso8601String(),
            ])->all();
        }

        return ApiResponse::data($data, 200, ['generated_at' => now()->toIso8601String()]);
    }

    private function recentEvents(User $user)
    {
        $query = AuditLog::query()->latest('id')->limit(10);

        // Financial-only applies when every audit-capable role the user holds is restricted.
        $auditRoles = Role::whereIn('key', $user->roleKeys())
            ->whereHas('permissions', fn ($q) => $q->where('key', 'audit.view'))
            ->pluck('key')->all();

        if (! array_diff($auditRoles, config('rbac.audit_financial_only_roles'))) {
            $query->where(function ($q) {
                foreach (config('rbac.financial_event_prefixes') as $prefix) {
                    $q->orWhere('event', 'like', $prefix.'%');
                }
            });
        }

        return $query->get();
    }
}
