<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\PricingSetting;
use App\Models\RateCard;
use App\Support\ApiResponse;
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

        // 1. Classes & Sizes lists
        $classes = [
            ['id' => 'exec', 'name' => 'Executive Class'],
            ['id' => 'first', 'name' => '1st Class'],
        ];

        $sizes = [
            ['id' => 'sedan', 'name' => 'Sedan / Compact SUV'],
            ['id' => 'suv', 'name' => 'SUV'],
            ['id' => 'van', 'name' => 'Sprinter'],
        ];

        // 2. Chauffeur Pay per hour ($25, $30, $35, $55)
        $chauffeurPay = [
            1 => ['tier' => 1, 'name' => 'Essential', 'hourly_rate' => 25],
            2 => ['tier' => 2, 'name' => 'Executive', 'hourly_rate' => 30],
            3 => ['tier' => 3, 'name' => 'Elite', 'hourly_rate' => 35],
            4 => ['tier' => 4, 'name' => 'Armed', 'hourly_rate' => 55],
        ];

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

        // 4. Combined Client Car and Security Rates table
        $clientCarAndSecurity = [
            [
                'tier' => 1,
                'tier_label' => 'T1 Essential',
                'client_rate' => 45,
                'driver_guard_pay' => 30,
                'archer_keeps' => 15,
            ],
            [
                'tier' => 2,
                'tier_label' => 'T2 Executive',
                'client_rate' => 60,
                'driver_guard_pay' => 40,
                'archer_keeps' => 20,
            ],
            [
                'tier' => 3,
                'tier_label' => 'T3 Elite',
                'client_rate' => 75,
                'driver_guard_pay' => 50,
                'archer_keeps' => 25,
            ],
            [
                'tier' => 4,
                'tier_label' => 'T4 Armed',
                'client_rate' => 'Call',
                'driver_guard_pay' => 100,
                'archer_keeps' => null,
            ],
        ];

        // 5. Client Rate Table (Tier × Class × Size Matrix)
        $vehicleInfo = [
            'exec|sedan' => ['class_label' => 'Executive Class', 'size_vehicle' => 'Sedan / Compact SUV', 'model' => 'Chevrolet Traverse'],
            'exec|suv' => ['class_label' => 'Executive Class', 'size_vehicle' => 'SUV', 'model' => 'Chevrolet Suburban'],
            'exec|van' => ['class_label' => 'Executive Class', 'size_vehicle' => 'Sprinter', 'model' => 'Mercedes-Benz Sprinter (14)'],
            'first|sedan' => ['class_label' => '1st Class', 'size_vehicle' => 'Sedan / Compact SUV', 'model' => 'Lincoln Aviator'],
            'first|suv' => ['class_label' => '1st Class', 'size_vehicle' => 'SUV', 'model' => 'Cadillac Escalade'],
            'first|van' => ['class_label' => '1st Class', 'size_vehicle' => 'Sprinter', 'model' => 'Mercedes-Benz Sprinter (11)'],
        ];

        $matrix = [];
        for ($tier = 1; $tier <= 4; $tier++) {
            $matrix[$tier] = [];
            foreach ($vehicleInfo as $key => $info) {
                [$cls, $sz] = explode('|', $key);

                $hCard = $hourlyRates->first(fn ($r) => $r->vehicle_class === $cls && $r->size === $sz && $r->tier === $tier);
                $pCard = $p2pRates->first(fn ($r) => $r->vehicle_class === $cls && $r->size === $sz && $r->tier === $tier);

                $isSprinter = $sz === 'van';
                $hourlyDollars = $hCard ? ($hCard->amount_cents / 100) : ($isSprinter ? ($cls === 'first' ? 225 : 175) : 70);
                $p2pDollars = ($pCard && $pCard->is_active && $pCard->amount_cents > 0) ? ($pCard->amount_cents / 100) : null;
                $callForPricing = $isSprinter || ($p2pDollars === null);

                $matrix[$tier][] = [
                    'key' => $key,
                    'class_key' => $cls,
                    'size_key' => $sz,
                    'class_label' => $info['class_label'],
                    'size_vehicle' => $info['size_vehicle'] . ' · ' . $info['model'],
                    'hourly_card_id' => $hCard?->id,
                    'hourly_rate' => $hourlyDollars,
                    'p2p_card_id' => $pCard?->id,
                    'p2p_rate' => $p2pDollars,
                    'call_for_pricing' => $callForPricing,
                    'bookable' => $hCard ? (bool) $hCard->is_active : true,
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
        ]);

        DB::transaction(function () use ($validated, $request) {
            // 1. Update individual rate cards
            if (!empty($validated['rate_updates'])) {
                foreach ($validated['rate_updates'] as $update) {
                    $card = RateCard::lockForUpdate()->findOrFail($update['card_id']);
                    $card->update([
                        'amount_cents' => $update['amount_cents'],
                        'is_active' => $update['is_active'] ?? $card->is_active,
                    ]);
                }
            }

            // 2. Update booking fee & rules in PricingSetting
            if (!empty($validated['fees_and_pay_rules'])) {
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
}
