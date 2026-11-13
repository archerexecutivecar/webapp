<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Vehicle;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class VehicleController extends Controller
{
    public function index(): JsonResponse
    {
        $vehicles = Vehicle::orderBy('sort_order', 'asc')->get();
        return ApiResponse::data(['vehicles' => $vehicles]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'form_value' => 'required|string|max:100',
            'class_type' => 'required|string|max:50',
            'category' => 'required|string|max:100',
            'slug' => 'nullable|string|max:255|unique:vehicles,slug',
            'passengers' => 'nullable|integer|min:1',
            'luggage' => 'nullable|integer|min:0',
            'image_url' => 'nullable|string|max:255',
            'availability' => 'nullable|string|max:50',
            'availability_label' => 'nullable|string|max:255',
            'sort_order' => 'nullable|integer',
            'is_active' => 'nullable|boolean',
        ]);

        if (empty($validated['slug'])) {
            $validated['slug'] = Str::slug($validated['name']);
        }

        $vehicle = Vehicle::create($validated);
        return ApiResponse::data(['vehicle' => $vehicle], 201);
    }

    public function show(string $id): JsonResponse
    {
        $vehicle = Vehicle::findOrFail($id);
        return ApiResponse::data(['vehicle' => $vehicle]);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $vehicle = Vehicle::findOrFail($id);
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'form_value' => 'sometimes|required|string|max:100',
            'class_type' => 'sometimes|required|string|max:50',
            'category' => 'sometimes|required|string|max:100',
            'slug' => 'sometimes|required|string|max:255|unique:vehicles,slug,' . $vehicle->id,
            'passengers' => 'nullable|integer|min:1',
            'luggage' => 'nullable|integer|min:0',
            'image_url' => 'nullable|string|max:255',
            'availability' => 'nullable|string|max:50',
            'availability_label' => 'nullable|string|max:255',
            'sort_order' => 'nullable|integer',
            'is_active' => 'nullable|boolean',
        ]);

        $vehicle->update($validated);
        return ApiResponse::data(['vehicle' => $vehicle]);
    }

    public function destroy(string $id): JsonResponse
    {
        $vehicle = Vehicle::findOrFail($id);
        $vehicle->delete();
        return ApiResponse::data(['message' => 'Vehicle deleted successfully']);
    }
}
