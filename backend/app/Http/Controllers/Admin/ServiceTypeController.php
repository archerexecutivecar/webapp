<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ServiceType;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class ServiceTypeController extends Controller
{
    /** List all service types for admin management */
    public function index(): JsonResponse
    {
        $services = ServiceType::orderBy('sort_order', 'asc')->get();

        return ApiResponse::data(['services' => $services]);
    }

    /** Store a new service type */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255', 'unique:service_types,slug'],
            'tagline' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'badge' => ['nullable', 'string', 'max:100'],
            'icon' => ['nullable', 'string', 'max:100'],
            'image_url' => ['nullable', 'string', 'max:500'],
            'features' => ['nullable', 'array'],
            'features.*' => ['string', 'max:255'],
            'min_hours' => ['nullable', 'integer', 'min:0', 'max:24'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $validated['slug'] = !empty($validated['slug']) 
            ? Str::slug($validated['slug']) 
            : Str::slug($validated['name']);

        // Default sort order to next integer if not supplied
        if (!isset($validated['sort_order'])) {
            $validated['sort_order'] = (ServiceType::max('sort_order') ?? 0) + 1;
        }

        $service = ServiceType::create($validated);

        return ApiResponse::created(['service' => $service]);
    }

    /** Show single service type */
    public function show(string $id): JsonResponse
    {
        $service = ServiceType::findOrFail($id);

        return ApiResponse::data(['service' => $service]);
    }

    /** Update service type */
    public function update(Request $request, string $id): JsonResponse
    {
        $service = ServiceType::findOrFail($id);

        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'slug' => ['sometimes', 'required', 'string', 'max:255', Rule::unique('service_types', 'slug')->ignore($service->id)],
            'tagline' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'badge' => ['nullable', 'string', 'max:100'],
            'icon' => ['nullable', 'string', 'max:100'],
            'image_url' => ['nullable', 'string', 'max:500'],
            'features' => ['nullable', 'array'],
            'features.*' => ['string', 'max:255'],
            'min_hours' => ['nullable', 'integer', 'min:0', 'max:24'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        if (isset($validated['slug'])) {
            $validated['slug'] = Str::slug($validated['slug']);
        }

        $service->update($validated);

        return ApiResponse::data(['service' => $service]);
    }

    /** Delete (soft delete) a service type */
    public function destroy(string $id): JsonResponse
    {
        $service = ServiceType::findOrFail($id);
        $service->delete();

        return ApiResponse::data(['message' => "Service '{$service->name}' removed successfully."]);
    }

    /** Reorder services in bulk */
    public function reorder(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'ordered_ids' => ['required', 'array'],
            'ordered_ids.*' => ['required', 'uuid', 'exists:service_types,id'],
        ]);

        foreach ($validated['ordered_ids'] as $index => $id) {
            ServiceType::where('id', $id)->update(['sort_order' => $index + 1]);
        }

        return ApiResponse::data(['message' => 'Service ordering updated successfully.']);
    }
}
