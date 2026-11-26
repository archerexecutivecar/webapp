<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\SiteContent;
use App\Models\SiteTier;
use App\Models\SiteVehicle;
use App\Support\AssistantProfileRules;
use App\Support\OperationalFleet;
use App\Support\RideStateMachine;
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
    /** @var array{tiers: \Illuminate\Support\Collection, vehicles: \Illuminate\Support\Collection, services: array<string, string>}|null */
    private ?array $catalog = null;

    public function me(Request $request): JsonResponse
    {
        return ApiResponse::data(CustomerAuthController::payload($request->user()));
    }

    /**
     * PUT /v1/customer/profile — the customer may save their own home address.
     * Preferred driver, notes, and payment flags stay with Admin.
     */
    public function updateProfile(Request $request): JsonResponse
    {
        $data = $request->validate([
            'home_address' => ['nullable', 'string', 'max:255'],
        ]);

        $user = $request->user();
        $prefs = $user->preferences ?? [];
        $address = trim((string) ($data['home_address'] ?? ''));
        $prefs['home_address'] = $address !== '' ? $address : null;
        $user->forceFill(['preferences' => $prefs])->save();

        AuditLog::record('customer.profile_updated', $user->getKey(), ['fields' => ['home_address']], $user);

        return ApiResponse::data(CustomerAuthController::payload($user->fresh()));
    }

    /** GET /v1/customer/rides?scope=upcoming|past|all */
    public function rides(Request $request): JsonResponse
    {
        $scope = $request->validate(['scope' => ['nullable', 'in:upcoming,past,all']])['scope'] ?? 'all';

        $query = RideRequest::with('assignedDriver')->where('customer_id', $request->user()->getKey());
        if ($scope === 'upcoming') {
            $query->whereIn('status', RideStateMachine::UPCOMING);
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

    /** GET /v1/customer/rides/{id}/tracking */
    public function tracking(Request $request, string $id): JsonResponse
    {
        $ride = RideRequest::with('assignedDriver')
            ->where('customer_id', $request->user()->getKey())
            ->findOrFail($id);

        $active = in_array($ride->status, ['on_my_way', 'at_doorstep', 'at_your_doorstep', 'ride_started', 'in_progress'], true);
        $driver = $ride->assignedDriver;

        $hasFreshLocation = $driver
            && $driver->current_lat !== null
            && $driver->current_lng !== null
            && $driver->last_location_at !== null
            && $driver->last_location_at->greaterThanOrEqualTo(now()->subMinutes(3));

        $driverTelemetry = null;
        if ($active && $hasFreshLocation) {
            $driverTelemetry = [
                'name' => $driver->name,
                'avatar_url' => $driver->avatar_url,
                'lat' => (float) $driver->current_lat,
                'lng' => (float) $driver->current_lng,
                'heading' => $driver->heading !== null ? (float) $driver->heading : null,
                'speed' => $driver->speed !== null ? (float) $driver->speed : null,
                'last_location_at' => $driver->last_location_at?->toIso8601String(),
            ];
        }

        $targetLat = in_array($ride->status, ['ride_started', 'in_progress'], true) ? $ride->dropoff_lat : $ride->pickup_lat;
        $targetLng = in_array($ride->status, ['ride_started', 'in_progress'], true) ? $ride->dropoff_lng : $ride->pickup_lng;
        $etaMinutes = null;

        if ($driverTelemetry && $targetLat !== null && $targetLng !== null) {
            $etaMinutes = $this->calculateEstimatedMinutes(
                $driverTelemetry['lat'],
                $driverTelemetry['lng'],
                $targetLat,
                $targetLng
            );
        }

        return ApiResponse::data([
            'id' => $ride->id,
            'reference' => $ride->reference,
            'status' => $ride->status,
            'status_label' => $this->label($ride),
            'is_live' => $active && $driverTelemetry !== null,
            'driver' => $driverTelemetry,
            'pickup' => [
                'address' => $ride->pickup_location,
                'lat' => $ride->pickup_lat !== null ? (float) $ride->pickup_lat : null,
                'lng' => $ride->pickup_lng !== null ? (float) $ride->pickup_lng : null,
            ],
            'dropoff' => [
                'address' => $ride->dropoff_location,
                'lat' => $ride->dropoff_lat !== null ? (float) $ride->dropoff_lat : null,
                'lng' => $ride->dropoff_lng !== null ? (float) $ride->dropoff_lng : null,
            ],
            'eta_minutes' => $etaMinutes,
        ]);
    }

    private function calculateEstimatedMinutes(float $lat1, float $lon1, float $lat2, float $lon2): int
    {
        $theta = $lon1 - $lon2;
        $dist = sin(deg2rad($lat1)) * sin(deg2rad($lat2)) + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * cos(deg2rad($theta));
        $dist = acos(max(-1.0, min(1.0, $dist)));
        $dist = rad2deg($dist);
        $miles = $dist * 60 * 1.1515;

        $minutes = (int) ceil(($miles / 25) * 60);
        return max(1, $minutes);
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
            'cancellation_reason' => $r->status === 'cancelled' ? $r->cancellation_reason : null,
            'cancelled_at' => $r->cancelled_at?->toIso8601String(),
            'ride_date' => $r->ride_date,
            'ride_time' => $r->ride_time,
            'pickup_location' => $r->pickup_location,
            'pickup_lat' => $r->pickup_lat !== null ? (float) $r->pickup_lat : null,
            'pickup_lng' => $r->pickup_lng !== null ? (float) $r->pickup_lng : null,
            'dropoff_location' => $r->dropoff_location,
            'dropoff_lat' => $r->dropoff_lat !== null ? (float) $r->dropoff_lat : null,
            'dropoff_lng' => $r->dropoff_lng !== null ? (float) $r->dropoff_lng : null,
            'vehicle' => $r->vehicle,
            'driver_tier' => $r->driver_tier,
            'created_at' => $r->created_at?->toIso8601String(),
            'chauffeur' => $r->assignedDriver
                ? [
                    'name' => $r->assignedDriver->name,
                    'avatar_url' => $r->assignedDriver->avatar_url,
                    'phone' => $r->assignedDriver->phone,
                    'bio' => $r->assignedDriver->bio ?: 'Senior Tier-1 Executive Chauffeur • Defensive Vehicle Handling & Dignitary Protocol Specialist',
                    'vehicle_model' => $r->assignedDriver->owner_vehicle_model,
                    'vehicle_plate' => $r->assignedDriver->owner_vehicle_plate,
                ]
                : null,
            'summary' => $this->summary($r),
        ];

        if ($full) {
            $out['details'] = $r->details;
            $out['timeline'] = $this->timeline($r);
            $out['updated_at'] = $r->updated_at?->toIso8601String();
        }

        return $out;
    }

    /**
     * Customer-safe card facts. Names come from Admin site content, tiers, and fleet.
     * Internal notes, prices, and the raw details document stay off this object.
     *
     * @return array<string, mixed>
     */
    private function summary(RideRequest $r): array
    {
        $catalog = $this->catalog();
        $details = is_array($r->details) ? $r->details : [];
        $slug = match ($r->service_type) {
            'p2p' => 'point-to-point',
            'client', 'client-car' => 'client-car',
            'assistant-week' => 'assistants',
            default => (string) $r->service_type,
        };
        $kind = $r->service_type === 'security' ? 'security' : 'driver';
        $tier = $catalog['tiers']->first(
            fn (SiteTier $t) => $t->kind === $kind && (string) $t->tier === (string) $r->driver_tier
        );

        $model = null;
        $sizeLabel = null;
        $vehicleText = null;
        if (is_string($r->vehicle) && preg_match('/^([^|]+)\|([^|]+)$/', $r->vehicle, $m)) {
            $cars = OperationalFleet::active($m[1], $m[2]);
            $model = $cars->isEmpty() ? null : $cars->pluck('name')->unique()->implode(' · ');
            $sizeLabel = $cars->first()?->category;
        } elseif (is_string($r->vehicle) && $r->vehicle !== '') {
            $vehicleText = $r->vehicle;
        }

        $flight = $details['airline_flight'] ?? null;
        if (! is_string($flight) || $flight === '') {
            $flight = trim(((string) ($details['airline'] ?? '')).' '.((string) ($details['flight_number'] ?? '')));
            $flight = $flight !== '' ? $flight : null;
        }

        $guards = $details['guards'] ?? null;
        if (! is_numeric($guards) || (int) $guards < 1) {
            $guards = is_numeric($r->security_addon) ? (int) $r->security_addon : null;
        } else {
            $guards = (int) $guards;
        }

        return [
            'service_name' => $catalog['services'][$slug] ?? null,
            'tier_label' => $tier?->label,
            'tier_title' => $tier?->title,
            'vehicle_model' => $model,
            'vehicle_size_label' => $sizeLabel,
            'vehicle_text' => $vehicleText,
            'passengers' => is_numeric($details['passengers'] ?? null) ? (int) $details['passengers'] : null,
            'bags' => is_numeric($details['bags'] ?? $details['checked_bags'] ?? null)
                ? (int) ($details['bags'] ?? $details['checked_bags'])
                : null,
            'hours' => is_numeric($details['hours'] ?? null) ? (int) $details['hours'] : null,
            'flight' => $flight,
            'terminal' => is_string($details['terminal'] ?? null) && $details['terminal'] !== '' ? $details['terminal'] : null,
            'guards' => $guards !== null && $guards > 0 ? $guards : null,
        ];
    }

    /** @return array{tiers: \Illuminate\Support\Collection<int, SiteTier>, vehicles: \Illuminate\Support\Collection<int, SiteVehicle>, services: array<string, string>} */
    private function catalog(): array
    {
        if ($this->catalog !== null) {
            return $this->catalog;
        }

        $services = [];
        foreach (SiteContent::query()->where('key', 'like', 'service.%')->get() as $row) {
            $name = $row->data['name'] ?? null;
            if (is_string($name) && $name !== '') {
                $services[substr((string) $row->key, strlen('service.'))] = $name;
            }
        }

        return $this->catalog = [
            'tiers' => SiteTier::query()->where('is_active', true)->get(),
            'vehicles' => SiteVehicle::query()->where('is_active', true)->get(),
            'services' => $services,
        ];
    }

    private function label(RideRequest $r): string
    {
        return match (RideStateMachine::normalize((string) $r->status)) {
            'new', 'pending' => 'Request received',
            'broadcast' => 'Finding a chauffeur',
            'dispatched' => 'Chauffeur assigned',
            'on_my_way' => 'On the way',
            'at_doorstep' => 'At the pickup',
            'ride_started', 'in_progress' => 'Trip in progress',
            'ride_ended', 'close_out' => 'Wrapping up',
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
        $rank = RideStateMachine::progressRank($r->status);
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
