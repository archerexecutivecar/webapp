<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\DriverTier;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class DriverTierController extends Controller
{
    public function index(): JsonResponse
    {
        $tiers = DriverTier::orderBy('sort_order', 'asc')->get();
        return ApiResponse::data(['tiers' => $tiers]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'tier_code' => 'required|string|max:50',
            'slug' => 'nullable|string|max:255|unique:driver_tiers,slug',
            'subtitle' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'multiplier' => 'nullable|numeric|min:0',
            'sort_order' => 'nullable|integer',
            'is_active' => 'nullable|boolean',
        ]);

        if (empty($validated['slug'])) {
            $validated['slug'] = Str::slug($validated['name']);
        }

        $tier = DriverTier::create($validated);
        return ApiResponse::data(['tier' => $tier], 201);
    }

    public function show(string $id): JsonResponse
    {
        $tier = DriverTier::findOrFail($id);
        return ApiResponse::data(['tier' => $tier]);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $tier = DriverTier::findOrFail($id);
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'tier_code' => 'sometimes|required|string|max:50',
            'slug' => 'sometimes|required|string|max:255|unique:driver_tiers,slug,' . $tier->id,
            'subtitle' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'multiplier' => 'nullable|numeric|min:0',
            'sort_order' => 'nullable|integer',
            'is_active' => 'nullable|boolean',
        ]);

        $tier->update($validated);
        return ApiResponse::data(['tier' => $tier]);
    }

    public function destroy(string $id): JsonResponse
    {
        $tier = DriverTier::findOrFail($id);
        $tier->delete();
        return ApiResponse::data(['message' => 'Driver tier deleted successfully']);
    }
}
