<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\PricingSetting;
use App\Models\RateCard;
use App\Models\SiteTier;
use App\Support\ApiResponse;
use App\Support\ChauffeurPay;
use App\Support\RateCatalog;
use App\Support\SiteRateFleet;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/** Rates are financial data: gated by pricing.manage and every change records old and new values. */
class RateCardController extends Controller
{
    public function index(): JsonResponse
    {
        return ApiResponse::data(['rates' => RateCard::orderBy('kind')->orderBy('vehicle_class')->orderBy('size')->orderBy('tier')->get()]);
    }

    /** PUT /admin/rates — body: { rates: [{id, amount_cents, is_active?}] } */
    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'rates' => 'required|array|min:1|max:200',
            'rates.*.id' => 'required|uuid|exists:rate_cards,id',
            'rates.*.amount_cents' => 'required|integer|min:0|max:100000000',
            'rates.*.is_active' => 'nullable|boolean',
        ]);

        DB::transaction(function () use ($data, $request): void {
            foreach ($data['rates'] as $row) {
                $card = RateCard::lockForUpdate()->findOrFail($row['id']);
                $before = ['amount_cents' => $card->amount_cents, 'is_active' => $card->is_active];
                $card->fill(['amount_cents' => $row['amount_cents'], 'is_active' => $row['is_active'] ?? $card->is_active])->save();
                if ($card->wasChanged()) {
                    AuditLog::record('site.rate.updated', $request->user()->getKey(), [
                        'kind' => $card->kind, 'vehicle_class' => $card->vehicle_class, 'size' => $card->size, 'tier' => $card->tier,
                        'before' => $before, 'after' => ['amount_cents' => $card->amount_cents, 'is_active' => $card->is_active],
                    ], $card);
                }
            }
        });

        return $this->index();
    }

    /** GET /admin/site-rates/matrix — unified payload matching Screenshot 10 */
    public function matrix(): JsonResponse
    {
        $hourlyRates = RateCard::where('kind', 'hourly')->get();
        $p2pRates = RateCard::where('kind', 'point_to_point')->get();
        $clientCarRates = RateCard::where('kind', 'client_car_hourly')->get();
        $securityRates = RateCard::where('kind', 'security_hourly')->get();
        $hourlySetting = PricingSetting::where('service', 'hourly')->first();

        $classes = SiteRateFleet::classes();
        $sizes = SiteRateFleet::sizes();

        $knownNames = [1 => 'Essential', 2 => 'Executive', 3 => 'Elite', 4 => 'Armed'];
        $driverTiers = SiteTier::where('kind', 'driver')->get()->keyBy('tier');
        $tierNumbers = collect(RateCard::query()->distinct()->orderBy('tier')->pluck('tier'))
            ->map(fn ($tier) => (int) $tier)
            ->unique()
            ->sort()
            ->values();
        if ($tierNumbers->isEmpty()) {
            $tierNumbers = collect([1, 2, 3, 4]);
        }

        $chauffeurPay = [];
        $clientCarAndSecurity = [];
        foreach ($tierNumbers as $tier) {
            $label = $driverTiers->get($tier)?->label;
            $fallbackName = $knownNames[$tier] ?? null;
            $chauffeurPay[$tier] = [
                'tier' => $tier,
                'name' => $label ?: ($fallbackName ? 'T'.$tier.' '.$fallbackName : 'Tier '.$tier),
                'hourly_rate' => ChauffeurPay::dollarsForTier($tier),
                'is_active' => (bool) ($driverTiers->get($tier)?->is_active ?? true),
            ];

            $clientCard = $clientCarRates->first(fn ($r) => (int) $r->tier === $tier && $r->vehicle_class === null && $r->size === null);
            $securityCard = $securityRates->first(fn ($r) => (int) $r->tier === $tier && $r->vehicle_class === null && $r->size === null);
            $clientCarAndSecurity[] = [
                'tier' => $tier,
                'tier_label' => $label ?: ($fallbackName ? 'T'.$tier.' '.$fallbackName : 'Tier '.$tier),
                'client_car_card_id' => $clientCard?->id,
                'client_rate' => $clientCard ? $clientCard->amount_cents / 100 : 0,
                'client_car_active' => (bool) ($clientCard?->is_active),
                'security_card_id' => $securityCard?->id,
                'security_rate' => $securityCard ? $securityCard->amount_cents / 100 : 0,
                'security_active' => (bool) ($securityCard?->is_active),
            ];
        }

        // 3. Fees and Pay Rules
        $feesAndPayRules = [
            'booking_fee' => $hourlySetting ? ($hourlySetting->booking_fee_cents / 100) : 5.00,
            'sales_tax_pct' => 6.625,
            'card_fee_pct' => 3.5,
            'card_fee_charge' => 0.15,
            'suggested_tip_pct' => 20,
            'hourly_minimum_hr' => 4,
            'p2p_driver_pay_minimum_hr' => 3,
            'client_car_minimum_hr' => 3,
            'owner_operator_facilitation_fee' => 25,
            'tier_4_armed_enabled' => false,
        ];

        $vehicleInfo = [];
        foreach (SiteRateFleet::vehicles() as $key => $info) {
            $vehicleInfo[$key] = [
                'class_label' => $info['class_label'],
                'size_vehicle' => $info['size_name'],
                'model' => $info['model'],
            ];
        }

        $matrix = [];
        foreach ($tierNumbers as $tier) {
            $matrix[$tier] = [];
            foreach ($vehicleInfo as $key => $info) {
                [$cls, $sz] = explode('|', $key, 2);

                $hCard = $hourlyRates->first(fn ($r) => $r->vehicle_class === $cls && $r->size === $sz && (int) $r->tier === $tier);
                $pCard = $p2pRates->first(fn ($r) => $r->vehicle_class === $cls && $r->size === $sz && (int) $r->tier === $tier);

                $hourlyDollars = $hCard ? ($hCard->amount_cents / 100) : 0;
                $p2pDollars = ($pCard && $pCard->is_active && $pCard->amount_cents > 0) ? ($pCard->amount_cents / 100) : null;

                $matrix[$tier][] = [
                    'key' => $key,
                    'class_key' => $cls,
                    'size_key' => $sz,
                    'class_label' => $info['class_label'],
                    'size_vehicle' => $info['size_vehicle'].' · '.$info['model'],
                    'hourly_card_id' => $hCard?->id,
                    'hourly_rate' => $hourlyDollars,
                    'p2p_card_id' => $pCard?->id,
                    'p2p_rate' => $p2pDollars,
                    'call_for_pricing' => $sz === 'van' || $p2pDollars === null,
                    'bookable' => $hCard ? (bool) $hCard->is_active : false,
                ];
            }
        }

        return ApiResponse::data([
            'classes' => $classes,
            'sizes' => $sizes,
            'chauffeur_pay' => $chauffeurPay,
            'fees_and_pay_rules' => $feesAndPayRules,
            'client_car_and_security' => $clientCarAndSecurity,
            'rate_matrix' => $matrix,
        ]);
    }

    /** PUT /admin/site-rates/matrix — save changes to matrix & fees */
    public function updateMatrix(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'fees_and_pay_rules' => 'nullable|array',
            'fees_and_pay_rules.booking_fee' => 'nullable|numeric|min:0',
            'fees_and_pay_rules.tier_4_armed_enabled' => 'nullable|boolean',
            'rate_updates' => 'nullable|array',
            'rate_updates.*.card_id' => 'required|uuid|exists:rate_cards,id',
            'rate_updates.*.amount_cents' => 'required|integer|min:0',
            'rate_updates.*.is_active' => 'nullable|boolean',
            'client_car_rates' => 'nullable|array|max:30',
            'client_car_rates.*.tier' => 'required|integer|min:1|max:255',
            'client_car_rates.*.amount_cents' => 'required|integer|min:0|max:100000000',
            'client_car_rates.*.is_active' => 'required|boolean',
            'security_rates' => 'nullable|array|max:30',
            'security_rates.*.tier' => 'required|integer|min:1|max:255',
            'security_rates.*.amount_cents' => 'required|integer|min:0|max:100000000',
            'security_rates.*.is_active' => 'required|boolean',
            'chauffeur_pay' => 'nullable|array|max:30',
            'chauffeur_pay.*.tier' => 'required|integer|min:1|max:255',
            'chauffeur_pay.*.hourly_rate' => 'nullable|numeric|min:0|max:100000',
        ]);

        DB::transaction(function () use ($validated, $request) {
            if (! empty($validated['rate_updates'])) {
                foreach ($validated['rate_updates'] as $update) {
                    $card = RateCard::lockForUpdate()->findOrFail($update['card_id']);
                    $card->update([
                        'amount_cents' => $update['amount_cents'],
                        'is_active' => $update['is_active'] ?? $card->is_active,
                    ]);
                }
            }

            if (! empty($validated['client_car_rates'])) {
                foreach ($validated['client_car_rates'] as $row) {
                    $this->saveFlatRate('client_car_hourly', (int) $row['tier'], (int) $row['amount_cents'], (bool) $row['is_active'], $request);
                    if ($row['is_active']) {
                        RateCatalog::offerTier('driver', (int) $row['tier']);
                    }
                }
            }
            if (! empty($validated['chauffeur_pay'])) {
                foreach ($validated['chauffeur_pay'] as $row) {
                    $cents = $row['hourly_rate'] === null ? null : (int) round(((float) $row['hourly_rate']) * 100);
                    SiteTier::where('kind', 'driver')->where('tier', (int) $row['tier'])->update(['pay_cents' => $cents]);
                }
            }
            if (! empty($validated['security_rates'])) {
                foreach ($validated['security_rates'] as $row) {
                    $this->saveFlatRate('security_hourly', (int) $row['tier'], (int) $row['amount_cents'], (bool) $row['is_active'], $request);
                    if ($row['is_active']) {
                        RateCatalog::offerTier('security', (int) $row['tier']);
                    }
                }
            }
            if (! empty($validated['fees_and_pay_rules'])) {
                $rules = $validated['fees_and_pay_rules'];
                if (isset($rules['booking_fee'])) {
                    $feeCents = (int) round($rules['booking_fee'] * 100);
                    PricingSetting::whereIn('service', ['hourly', 'airport', 'p2p'])->update([
                        'booking_fee_cents' => $feeCents,
                    ]);
                }
            }

            AuditLog::record('site.rates.matrix_updated', $request->user()?->getKey(), [
                'updated_count' => count($validated['rate_updates'] ?? []),
            ], null);
        });

        return $this->matrix();
    }

    public function storeClass(Request $request): JsonResponse
    {
        $data = $request->validate(['name' => 'required|string|max:80']);
        $row = RateCatalog::addClass(trim($data['name']));
        AuditLog::record('site.rate_class.created', $request->user()->getKey(), ['key' => $row->key, 'name' => $row->name]);

        return ApiResponse::data(['class' => ['id' => $row->key, 'name' => $row->name, 'is_active' => true]], 201);
    }

    public function storeSize(Request $request): JsonResponse
    {
        $data = $request->validate(['name' => 'required|string|max:80']);
        $row = RateCatalog::addSize(trim($data['name']));
        AuditLog::record('site.rate_size.created', $request->user()->getKey(), ['key' => $row->key, 'name' => $row->name]);

        return ApiResponse::data(['size' => ['id' => $row->key, 'name' => $row->name, 'is_active' => true]], 201);
    }

    public function storeTier(Request $request): JsonResponse
    {
        $data = $request->validate(['label' => 'required|string|max:80']);
        $row = RateCatalog::addTier(trim($data['label']));
        AuditLog::record('site.rate_tier.created', $request->user()->getKey(), ['tier' => $row->tier, 'label' => $row->label], $row);

        return ApiResponse::data(['tier' => ['tier' => $row->tier, 'label' => $row->label]], 201);
    }

    public function retireClass(Request $request, string $key): JsonResponse
    {
        RateCatalog::retireClass($key);
        AuditLog::record('site.rate_class.retired', $request->user()->getKey(), ['key' => $key]);

        return ApiResponse::data(['message' => 'Class retired.']);
    }

    public function activateClass(Request $request, string $key): JsonResponse
    {
        RateCatalog::activateClass($key);
        AuditLog::record('site.rate_class.activated', $request->user()->getKey(), ['key' => $key]);

        return ApiResponse::data(['message' => 'Class activated.']);
    }

    public function destroyClass(Request $request, string $key): JsonResponse
    {
        RateCatalog::deleteClass($key);
        AuditLog::record('site.rate_class.deleted', $request->user()->getKey(), ['key' => $key]);

        return ApiResponse::data(['message' => 'Class deleted.']);
    }

    public function retireSize(Request $request, string $key): JsonResponse
    {
        RateCatalog::retireSize($key);
        AuditLog::record('site.rate_size.retired', $request->user()->getKey(), ['key' => $key]);

        return ApiResponse::data(['message' => 'Size retired.']);
    }

    public function activateSize(Request $request, string $key): JsonResponse
    {
        RateCatalog::activateSize($key);
        AuditLog::record('site.rate_size.activated', $request->user()->getKey(), ['key' => $key]);

        return ApiResponse::data(['message' => 'Size activated.']);
    }

    public function destroySize(Request $request, string $key): JsonResponse
    {
        RateCatalog::deleteSize($key);
        AuditLog::record('site.rate_size.deleted', $request->user()->getKey(), ['key' => $key]);

        return ApiResponse::data(['message' => 'Size deleted.']);
    }

    public function retireTier(Request $request, int $tier): JsonResponse
    {
        RateCatalog::retireTier($tier);
        AuditLog::record('site.rate_tier.retired', $request->user()->getKey(), ['tier' => $tier]);

        return ApiResponse::data(['message' => 'Tier retired.']);
    }

    public function activateTier(Request $request, int $tier): JsonResponse
    {
        RateCatalog::activateTier($tier);
        AuditLog::record('site.rate_tier.activated', $request->user()->getKey(), ['tier' => $tier]);

        return ApiResponse::data(['message' => 'Tier activated.']);
    }

    public function destroyTier(Request $request, int $tier): JsonResponse
    {
        RateCatalog::deleteTier($tier);
        AuditLog::record('site.rate_tier.deleted', $request->user()->getKey(), ['tier' => $tier]);

        return ApiResponse::data(['message' => 'Tier deleted.']);
    }

    private function saveFlatRate(string $kind, int $tier, int $cents, bool $active, Request $request): void
    {
        $card = RateCard::where('kind', $kind)->where('tier', $tier)->whereNull('vehicle_class')->whereNull('size')->lockForUpdate()->first();
        if (! $card) {
            $card = RateCard::create([
                'kind' => $kind,
                'vehicle_class' => null,
                'size' => null,
                'tier' => $tier,
                'amount_cents' => $cents,
                'is_active' => $active,
            ]);
            AuditLog::record('site.rate.updated', $request->user()->getKey(), [
                'kind' => $kind, 'tier' => $tier, 'after' => ['amount_cents' => $cents, 'is_active' => $active],
            ], $card);

            return;
        }

        $before = ['amount_cents' => $card->amount_cents, 'is_active' => $card->is_active];
        $card->update(['amount_cents' => $cents, 'is_active' => $active]);
        if ($card->wasChanged()) {
            AuditLog::record('site.rate.updated', $request->user()->getKey(), [
                'kind' => $kind, 'tier' => $tier,
                'before' => $before, 'after' => ['amount_cents' => $card->amount_cents, 'is_active' => $card->is_active],
            ], $card);
        }
    }
}
