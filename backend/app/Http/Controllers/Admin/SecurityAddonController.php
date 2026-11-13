<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\SecurityAddon;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SecurityAddonController extends Controller
{
    public function index(): JsonResponse
    {
        $addons = SecurityAddon::orderBy('sort_order', 'asc')->get();
        return ApiResponse::data(['addons' => $addons]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'form_value' => 'required|string|max:50|unique:security_addons,form_value',
            'guards_count' => 'nullable|integer|min:0',
            'description' => 'nullable|string',
            'hourly_rate' => 'nullable|numeric|min:0',
            'sort_order' => 'nullable|integer',
            'is_active' => 'nullable|boolean',
        ]);

        $addon = SecurityAddon::create($validated);
        return ApiResponse::data(['addon' => $addon], 201);
    }

    public function show(string $id): JsonResponse
    {
        $addon = SecurityAddon::findOrFail($id);
        return ApiResponse::data(['addon' => $addon]);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $addon = SecurityAddon::findOrFail($id);
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'form_value' => 'sometimes|required|string|max:50|unique:security_addons,form_value,' . $addon->id,
            'guards_count' => 'nullable|integer|min:0',
            'description' => 'nullable|string',
            'hourly_rate' => 'nullable|numeric|min:0',
            'sort_order' => 'nullable|integer',
            'is_active' => 'nullable|boolean',
        ]);

        $addon->update($validated);
        return ApiResponse::data(['addon' => $addon]);
    }

    public function destroy(string $id): JsonResponse
    {
        $addon = SecurityAddon::findOrFail($id);
        $addon->delete();
        return ApiResponse::data(['message' => 'Security add-on deleted successfully']);
    }
}
