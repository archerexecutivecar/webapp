<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NavigationController extends Controller
{
    /** Returns only the navigation the authenticated user may see. Visibility is not authorization; each module enforces its own permissions. */
    public function show(Request $request): JsonResponse
    {
        $held = $request->user()->permissionKeys();

        $groups = collect(config('navigation.groups'))
            ->map(function (array $group) use ($held) {
                $items = collect($group['items'])
                    ->filter(fn (array $item) => (bool) array_intersect($item['permissions'], $held))
                    ->map(fn (array $item) => collect($item)->except('permissions')->all())
                    ->values()->all();

                return ['key' => $group['key'], 'label' => $group['label'], 'items' => $items];
            })
            ->filter(fn (array $group) => $group['items'])
            ->values()->all();

        return ApiResponse::data(['groups' => $groups]);
    }
}
