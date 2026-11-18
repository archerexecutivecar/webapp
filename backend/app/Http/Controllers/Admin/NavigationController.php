<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Driver;
use App\Models\RideRequest;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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

        $badges = [
            'rides' => max(1, $pendingRides),
            'drivers' => max(1, $pendingDrivers),
            'security-leads' => 1,
            'contracts-shifts' => 2,
            'swap-approvals' => 1,
            'credentials' => 2,
        ];

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
            'badges' => $badges,
        ]);
    }
}

