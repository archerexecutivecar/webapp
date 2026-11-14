<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Support\AssistantProfileRules;
use Illuminate\Support\Arr;
use App\Models\AssistantProfile;
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

    /**
     * GET /v1/customer/assistant-profiles — the EA/PA profiles saved with this account's email
     * (the same match Admin uses). Signing in proves the email, so customers only ever see their own.
     */
    public function assistantProfiles(Request $request): JsonResponse
    {
        $profiles = AssistantProfile::where('email', $request->user()->email)->orderByDesc('created_at')->get()
            ->map(fn (AssistantProfile $p) => [
                'reference' => $p->reference,
                'first_name' => $p->first_name,
                'last_name' => $p->last_name,
                'email' => $p->email,
                'mobile' => $p->mobile,
                'company' => $p->company,
                'created_at' => $p->created_at?->toIso8601String(),
                'data' => $p->data ?? [],
            ]);

        return ApiResponse::data(['profiles' => $profiles]);
    }

    /**
     * PUT /v1/customer/assistant-profiles/{reference} — the customer edits their own EA/PA profile.
     * Same validation as sign-up. The email stays fixed (it links the profile to this account); each section sent
     * replaces the stored one. Audited without personal details: only which sections changed.
     */
    public function updateAssistantProfile(Request $request, string $reference): JsonResponse
    {
        $profile = AssistantProfile::where('reference', $reference)
            ->where('email', $request->user()->email)
            ->firstOrFail(); // 404 for anyone else's profile

        $data = $request->validate([
            'first_name' => ['sometimes', 'required', 'string', 'max:100'],
            'last_name' => ['sometimes', 'required', 'string', 'max:100'],
            'mobile' => ['sometimes', 'required', 'string', 'max:50'],
            'company' => ['sometimes', 'nullable', 'string', 'max:150'],
        ] + AssistantProfileRules::sections());

        $before = $profile->data ?? [];
        $sections = Arr::only($data, AssistantProfileRules::SECTIONS);
        $profile->fill(Arr::only($data, ['first_name', 'last_name', 'mobile', 'company']));
        $profile->data = array_merge($before, $sections);
        $changed = array_keys(array_filter($sections, fn ($v, $k) => ($before[$k] ?? null) !== $v, ARRAY_FILTER_USE_BOTH));
        $contactChanged = $profile->isDirty(['first_name', 'last_name', 'mobile', 'company']);
        $profile->save();

        if ($changed || $contactChanged) {
            AuditLog::record('assistant_profile.updated_by_customer', $request->user()->getKey(), [
                'reference' => $profile->reference,
                'sections' => array_values(array_merge($changed, $contactChanged ? ['contact'] : [])),
            ], $profile);
        }

        return $this->assistantProfiles($request);
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
