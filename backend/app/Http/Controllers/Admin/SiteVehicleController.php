<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\SiteVehicle;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SiteVehicleController extends Controller
{
    private function rules(bool $partial = false): array
    {
        $rules = [
            'vehicle_class' => 'required|in:exec,first',
            'size' => 'required|in:sedan,suv,van',
            'size_label' => 'required|string|max:60',
            'model' => 'required|string|max:255',
            'blurb' => 'required|string|max:255',
            'passengers' => 'nullable|integer|min:1|max:60',
            'bags' => 'nullable|integer|min:0|max:60',
            'image_url' => 'nullable|string|max:500',
            'image_alt' => 'nullable|string|max:255',
            'sort_order' => 'nullable|integer|min:0',
            'is_active' => 'nullable|boolean',
        ];

        return $partial ? array_map(fn ($r) => str_starts_with($r, 'required') ? 'sometimes|'.$r : $r, $rules) : $rules;
    }

    /** sort_order and is_active are NOT NULL columns with defaults; an explicit null must fall back to the default, not fail the insert. */
    private function withoutNullDefaults(array $data): array
    {
        foreach (['sort_order', 'is_active'] as $key) {
            if (array_key_exists($key, $data) && $data[$key] === null) {
                unset($data[$key]);
            }
        }

        return $data;
    }

    public function index(): JsonResponse
    {
        return ApiResponse::data(['vehicles' => SiteVehicle::orderBy('sort_order')->get()]);
    }

    public function store(Request $request): JsonResponse
    {
        $row = SiteVehicle::create($this->withoutNullDefaults($request->validate($this->rules())));
        AuditLog::record('site.vehicle.created', $request->user()->getKey(), ['id' => $row->id], $row);

        return ApiResponse::data(['item' => $row], 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $row = SiteVehicle::findOrFail($id);
        $row->update($this->withoutNullDefaults($request->validate($this->rules(true))));
        AuditLog::record('site.vehicle.updated', $request->user()->getKey(), ['id' => $row->id], $row);

        return ApiResponse::data(['item' => $row->fresh()]);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $row = SiteVehicle::findOrFail($id);
        $row->delete();
        AuditLog::record('site.vehicle.deleted', $request->user()->getKey(), ['id' => $id]);

        return ApiResponse::data(['message' => 'Deleted']);
    }
}
