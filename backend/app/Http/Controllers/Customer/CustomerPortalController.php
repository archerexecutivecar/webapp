<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use App\Models\RideRequest;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Customer-facing ride history and tracking. Every query is scoped to the signed-in customer's own
 * rides (customer_id); another customer's ride is indistinguishable from one that does not exist.
 */
class CustomerPortalController extends Controller
{
    private const ACTIVE = ['pending', 'dispatched', 'in_progress'];

    public function me(Request $request): JsonResponse
    {
        return ApiResponse::data(CustomerAuthController::payload($request->user()));
    }

    /** GET /v1/customer/rides?scope=upcoming|past|all */
    public function rides(Request $request): JsonResponse
    {
        $scope = $request->validate(['scope' => ['nullable', 'in:upcoming,past,all']])['scope'] ?? 'all';

        $query = RideRequest::with('assignedDriver')->where('customer_id', $request->user()->getKey());
        if ($scope === 'upcoming') {
            $query->whereIn('status', self::ACTIVE);
        } elseif ($scope === 'past') {
            $query->whereIn('status', ['completed', 'cancelled']);
        }

        $rides = $query->orderByDesc('created_at')->limit(100)->get()->map(fn (RideRequest $r) => $this->payload($r, false));

        return ApiResponse::data(['rides' => $rides]);
    }

    /** GET /v1/customer/rides/{id} */
    public function show(Request $request, string $id): JsonResponse
    {
        $ride = RideRequest::with('assignedDriver')
            ->where('customer_id', $request->user()->getKey())
            ->findOrFail($id); // 404 for anyone else's ride

        return ApiResponse::data(['ride' => $this->payload($ride, true)]);
    }

    /** Whitelisted output only: no dispatch notes, no internal ids beyond the ride's own. */
    private function payload(RideRequest $r, bool $full): array
    {
        $out = [
            'id' => $r->id,
            'reference' => $r->reference,
            'request_type' => $r->request_type,
            'service_type' => $r->service_type,
            'status' => $r->status,
            'status_label' => $this->label($r),
            'ride_date' => $r->ride_date,
            'ride_time' => $r->ride_time,
            'pickup_location' => $r->pickup_location,
            'dropoff_location' => $r->dropoff_location,
            'vehicle' => $r->vehicle,
            'driver_tier' => $r->driver_tier,
            'created_at' => $r->created_at?->toIso8601String(),
            'chauffeur' => $r->assignedDriver && in_array($r->status, ['dispatched', 'in_progress', 'completed'], true)
                ? ['name' => $r->assignedDriver->name, 'avatar_url' => $r->assignedDriver->avatar_url]
                : null,
        ];

        if ($full) {
            $out['details'] = $r->details;
            $out['timeline'] = $this->timeline($r);
            $out['updated_at'] = $r->updated_at?->toIso8601String();
        }

        return $out;
    }

    private function label(RideRequest $r): string
    {
        return match ($r->status) {
            'pending' => 'Request received',
            'dispatched' => 'Chauffeur assigned',
            'in_progress' => 'On the way',
            'completed' => 'Completed',
            'cancelled' => 'Cancelled',
            default => ucfirst(str_replace('_', ' ', (string) $r->status)),
        };
    }

    /**
     * Progress steps derived from the current status. Per-step timestamps are not available until
     * ride status history exists (see docs/RIDE_STATE_MACHINE.md), so only "requested" carries a time.
     */
    private function timeline(RideRequest $r): array
    {
        $order = ['pending' => 0, 'dispatched' => 1, 'in_progress' => 2, 'completed' => 3];
        $rank = $order[$r->status] ?? ($r->status === 'cancelled' ? -1 : 0);
        $steps = [
            ['key' => 'pending', 'label' => 'Request received'],
            ['key' => 'dispatched', 'label' => 'Chauffeur assigned'],
            ['key' => 'in_progress', 'label' => 'On the way'],
            ['key' => 'completed', 'label' => 'Completed'],
        ];

        return array_map(fn (array $s) => $s + [
            'reached' => $rank >= $order[$s['key']],
            'current' => $rank === $order[$s['key']],
            'at' => $s['key'] === 'pending' ? $r->created_at?->toIso8601String() : null,
        ], $steps);
    }
}
