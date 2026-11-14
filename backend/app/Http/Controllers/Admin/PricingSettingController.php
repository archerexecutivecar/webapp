<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\PricingSetting;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/** Per-service pricing rules. Financial data: gated by pricing.manage, every change audited with before/after. */
class PricingSettingController extends Controller
{
    public function index(): JsonResponse
    {
        $order = array_flip(PricingSetting::SERVICES);

        return ApiResponse::data(['settings' => PricingSetting::all()->sortBy(fn ($s) => $order[$s->service] ?? 99)->values()]);
    }

    public function update(Request $request, string $service): JsonResponse
    {
        abort_unless(in_array($service, PricingSetting::SERVICES, true), 404);
        $cents = ['sometimes', 'integer', 'min:0', 'max:10000000'];
        $bp = ['sometimes', 'integer', 'min:0', 'max:10000'];
        $count = ['sometimes', 'nullable', 'integer', 'min:0', 'max:100'];
        $data = $request->validate([
            'pricing_mode' => ['sometimes', Rule::in(in_array($service, ['airport', 'p2p'], true) ? ['flat', 'hourly', 'per_mile'] : ['hourly'])],
            'van_hourly' => ['sometimes', 'boolean'], 'included_stops' => ['sometimes', 'integer', 'min:0', 'max:20'],
            'min_hours' => $count, 'min_miles' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:2000'],
            'booking_fee_cents' => $cents, 'stop_fee_cents' => $cents, 'max_stops' => $count,
            'per_passenger_cents' => $cents, 'included_passengers' => ['sometimes', 'integer', 'min:0', 'max:60'],
            'per_bag_cents' => $cents, 'included_bags' => ['sometimes', 'integer', 'min:0', 'max:60'],
            'guard_hours_mode' => ['sometimes', Rule::in(['ride', 'custom'])], 'guard_min_hours' => $count,
            'tax_bp' => $bp, 'tax_includes_fees' => ['sometimes', 'boolean'], 'card_fee_bp' => $bp,
            'gratuity_suggested_bp' => $bp, 'is_active' => ['sometimes', 'boolean'],
        ]);

        $row = DB::transaction(function () use ($service, $data, $request) {
            $row = PricingSetting::where('service', $service)->lockForUpdate()->firstOrFail();
            $before = $row->only(array_keys($data));
            $row->fill($data)->save();
            if ($row->wasChanged()) {
                AuditLog::record('pricing.settings.updated', $request->user()->getKey(), [
                    'service' => $service, 'before' => $before, 'after' => $row->only(array_keys($data)),
                ], $row);
            }

            return $row;
        });

        return ApiResponse::data(['setting' => $row->fresh()]);
    }
}
