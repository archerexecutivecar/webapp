<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Driver;
use App\Models\RideRequest;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;

class NavigationController extends Controller
{
    /** Returns only the navigation the authenticated user may see. Visibility is not authorization; each module enforces its own permissions. */
    public function show(Request $request): JsonResponse
    {
        $held = $request->user()->permissionKeys();

        $pendingRides = RideRequest::whereIn('status', ['pending', 'new', 'broadcast', 'reassignment_requested'])
            ->whereNull('assigned_driver_id')
            ->count();

        $pendingDrivers = Driver::where('is_active', true)
            ->where(function ($q) {
                $q->whereNull('user_id');
            })->count();

        $badges = [];
        if ($pendingRides > 0) {
            $badges['rides'] = $pendingRides;
        }
        if ($pendingDrivers > 0) {
            $badges['drivers'] = $pendingDrivers;
        }

        if (Schema::hasTable('security_leads')) {
            $openLeads = (int) \DB::table('security_leads')->whereIn('status', ['new', 'open', 'pending'])->count();
            if ($openLeads > 0) {
                $badges['security-leads'] = $openLeads;
            }
        }
        if (Schema::hasTable('security_swap_requests')) {
            $pendingSwaps = (int) \DB::table('security_swap_requests')->where('status', 'pending')->count();
            if ($pendingSwaps > 0) {
                $badges['swap-approvals'] = $pendingSwaps;
            }
        }

        $groups = collect(config('navigation.groups'))
            ->map(function (array $group) use ($held, $badges) {
                $items = collect($group['items'])
                    ->filter(fn (array $item) => (bool) array_intersect($item['permissions'], $held))
                    ->map(function (array $item) use ($badges) {
                        $clean = collect($item)->except('permissions')->all();
                        if (isset($badges[$item['key']])) {
                            $clean['badge'] = $badges[$item['key']];
                        }
                        return $clean;
                    })
                    ->values()->all();

                return ['key' => $group['key'], 'label' => $group['label'], 'items' => $items];
            })
            ->filter(fn (array $group) => $group['items'])
            ->values()->all();

        return ApiResponse::data([
            'groups' => $groups,
            'badges' => (object) $badges,
        ]);
    }
}
