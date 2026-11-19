<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Driver;
use App\Models\SiteTier;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SiteTierController extends Controller
{
    private function rules(bool $partial = false): array
    {
        $rules = [
            'kind' => 'required|in:driver,security',
            'tier' => 'required|integer|min:1|max:255',
            'label' => 'required|string|max:255',
            'title' => 'required|string|max:255',
            'call_only' => 'nullable|boolean',
            'credentials' => 'required|array|max:12',
            'credentials.*' => 'string|max:255',
            'suited_for' => 'required|array|max:12',
            'suited_for.*' => 'string|max:255',
            'sort_order' => 'nullable|integer|min:0',
            'is_active' => 'nullable|boolean',
        ];

        return $partial ? array_map(fn ($r) => str_starts_with($r, 'required') ? 'sometimes|'.$r : $r, $rules) : $rules;
    }

    public function index(): JsonResponse
    {
        return ApiResponse::data(['tiers' => SiteTier::orderBy('kind')->orderBy('sort_order')->get()]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate($this->rules());
        if (SiteTier::where('kind', $data['kind'])->where('tier', $data['tier'])->exists()) {
            return ApiResponse::error('DUPLICATE_TIER', 'That tier already exists for this type.', 422);
        }
        $row = SiteTier::create($data);
        AuditLog::record('site.tier.created', $request->user()->getKey(), ['id' => $row->id], $row);

        return ApiResponse::data(['item' => $row], 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $row = SiteTier::findOrFail($id);
        $row->update($request->validate($this->rules(true)));
        AuditLog::record('site.tier.updated', $request->user()->getKey(), ['id' => $row->id], $row);

        return ApiResponse::data(['item' => $row->fresh()]);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $row = SiteTier::findOrFail($id);
        // A chauffeur tier that drivers are assigned to cannot be removed: hide it instead, or move the drivers first.
        if ($row->kind === 'driver' && ($count = Driver::where('service_tier', $row->tier)->count()) > 0) {
            return ApiResponse::error('TIER_IN_USE', "{$count} driver(s) are assigned to this tier. Move them to another tier first, or hide the tier instead.", 409);
        }
        $row->delete();
        AuditLog::record('site.tier.deleted', $request->user()->getKey(), ['id' => $id]);

        return ApiResponse::data(['message' => 'Deleted']);
    }
}
