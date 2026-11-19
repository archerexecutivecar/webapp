<?php

namespace Tests\Feature\Api;

use App\Models\PricingSetting;
use App\Models\RateCard;
use App\Models\SiteTier;
use App\Models\Vehicle;
use Database\Seeders\SiteContentSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\CreatesStaff;
use Tests\Support\SeedsOperationalFleet;
use Tests\TestCase;

/** Every pricing rule in docs/PRICING_ENGINE_PLAN.md section 4, computed by hand in integer cents. */
class QuoteTest extends TestCase
{
    use CreatesStaff, RefreshDatabase, SeedsOperationalFleet;

    private const URL = '/api/v1/quotes';

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(SiteContentSeeder::class);
        $this->seedOperationalFleet();
    }

    private function hourly(array $over = []): array
    {
        return $over + ['service' => 'hourly', 'tier' => 1, 'vehicle_class' => 'exec', 'vehicle_size' => 'suv', 'hours' => 4, 'passengers' => 1, 'bags' => 0];
    }

    private function set(string $service, array $values): void
    {
        PricingSetting::where('service', $service)->firstOrFail()->update($values);
    }

    public function test_hourly_quote_matches_the_published_estimate(): void
    {
        // Suburban, Executive Class, Tier 1: $80/hr × 4 + $10 booking fee = $330 (the current website estimate).
        $q = $this->postJson(self::URL, $this->hourly())->assertOk()->json('data.quote');

        $this->assertSame(32000, $q['subtotal_cents']);
        $this->assertSame(1000, $q['booking_fee_cents']);
        $this->assertSame(33000, $q['total_cents']);
        $this->assertSame(6400, $q['gratuity_suggested_cents']);
        $this->assertFalse($q['gratuity_included']);
    }

    public function test_minimum_hours_apply(): void
    {
        $q = $this->postJson(self::URL, $this->hourly(['hours' => 2]))->assertOk()->json('data.quote');
        $this->assertSame(32000, $q['subtotal_cents']);

        $this->set('hourly', ['min_hours' => 6]);
        $this->assertSame(48000, $this->postJson(self::URL, $this->hourly())->json('data.quote.subtotal_cents'));
    }

    public function test_passengers_and_bags_charge_beyond_the_included_amount_and_default_to_zero(): void
    {
        $this->assertSame(32000, $this->postJson(self::URL, $this->hourly(['passengers' => 5, 'bags' => 4]))->json('data.quote.subtotal_cents'));

        $this->set('hourly', ['per_passenger_cents' => 500, 'included_passengers' => 2, 'per_bag_cents' => 200, 'included_bags' => 1]);
        $q = $this->postJson(self::URL, $this->hourly(['passengers' => 4, 'bags' => 3]))->json('data.quote');

        $this->assertSame(32000 + 2 * 500 + 2 * 200, $q['subtotal_cents']);
    }

    public function test_stop_fee_and_optional_stop_limit(): void
    {
        $this->set('hourly', ['stop_fee_cents' => 2000]);
        $this->assertSame(36000, $this->postJson(self::URL, $this->hourly(['stops' => 2]))->json('data.quote.subtotal_cents'));

        $this->set('hourly', ['max_stops' => 1]);
        $this->postJson(self::URL, $this->hourly(['stops' => 2]))->assertStatus(422)->assertJsonPath('error.code', 'TOO_MANY_STOPS');
    }

    public function test_booking_fee_tax_and_card_fee_are_admin_set_and_can_be_zero(): void
    {
        $this->set('hourly', ['booking_fee_cents' => 0]);
        $this->assertSame(32000, $this->postJson(self::URL, $this->hourly())->json('data.quote.total_cents'));

        $this->set('hourly', ['booking_fee_cents' => 1000, 'tax_bp' => 1000, 'card_fee_bp' => 300]);
        $q = $this->postJson(self::URL, $this->hourly())->json('data.quote');
        $this->assertSame(3200, $q['tax_cents']);              // 10% of $320
        $this->assertSame(1086, $q['card_fee_cents']);          // 3% of $362
        $this->assertSame(32000 + 1000 + 3200 + 1086, $q['total_cents']);

        $this->set('hourly', ['tax_includes_fees' => true]);
        $this->assertSame(3300, $this->postJson(self::URL, $this->hourly())->json('data.quote.tax_cents'));
    }

    public function test_security_add_on_uses_security_tier_rate_and_ride_or_custom_hours(): void
    {
        // 2 guards × Tier 2 ($60) × 4 ride hours.
        $q = $this->postJson(self::URL, $this->hourly(['guards' => 2, 'security_tier' => 2]))->json('data.quote');
        $this->assertSame(32000 + 48000, $q['subtotal_cents']);

        $this->set('hourly', ['guard_hours_mode' => 'custom', 'guard_min_hours' => 3]);
        $q = $this->postJson(self::URL, $this->hourly(['guards' => 1, 'security_tier' => 1, 'guard_hours' => 2]))->json('data.quote');
        $this->assertSame(32000 + 4500 * 3, $q['subtotal_cents']);
    }

    public function test_point_to_point_per_mile_needs_an_admin_rate_and_respects_minimum_miles(): void
    {
        $this->set('p2p', ['pricing_mode' => 'per_mile', 'min_miles' => 40]);
        $trip = ['service' => 'p2p', 'tier' => 1, 'vehicle_class' => 'exec', 'vehicle_size' => 'suv', 'miles' => 30];

        $this->postJson(self::URL, $trip)->assertStatus(422)->assertJsonPath('error.code', 'RATE_NOT_CONFIGURED');

        RateCard::where(['kind' => 'per_mile', 'vehicle_class' => 'exec', 'size' => 'suv', 'tier' => 1])->update(['amount_cents' => 350, 'is_active' => true]);
        $this->assertSame(40 * 350, $this->postJson(self::URL, $trip)->json('data.quote.subtotal_cents'));
        $this->postJson(self::URL, ['miles' => null] + $trip)->assertStatus(422)->assertJsonPath('error.code', 'DISTANCE_REQUIRED');
    }

    public function test_airport_can_be_switched_to_hourly(): void
    {
        $this->set('airport', ['pricing_mode' => 'hourly', 'min_hours' => null]);
        $q = $this->postJson(self::URL, ['service' => 'airport'] + $this->hourly(['hours' => 3]))->json('data.quote');
        $this->assertSame(24000, $q['subtotal_cents']);
    }

    /** Design canvas "Book" board: trips use a flat fare from Rates (Point to point) by tier × class × size. */
    public function test_point_to_point_and_airport_use_the_design_trip_fare(): void
    {
        $trip = ['service' => 'p2p', 'tier' => 1, 'vehicle_class' => 'exec', 'vehicle_size' => 'suv'];
        $q = $this->postJson(self::URL, $trip)->assertOk()->json('data.quote');
        $this->assertSame(15500, $q['subtotal_cents']);          // Suburban, Executive, Tier 1: "From $155"
        $this->assertSame(16500, $q['total_cents']);             // + $10 booking fee
        $this->assertTrue($q['is_from_price']);
        $this->assertSame('per trip', $q['lines'][0]['per']);

        $this->assertSame(31000, $this->postJson(self::URL, ['service' => 'airport', 'tier' => 4, 'vehicle_class' => 'first', 'vehicle_size' => 'suv'])->json('data.quote.subtotal_cents'));
    }

    public function test_trip_includes_one_stop_then_twenty_dollars_each_up_to_three(): void
    {
        $trip = ['service' => 'p2p', 'tier' => 1, 'vehicle_class' => 'exec', 'vehicle_size' => 'suv'];
        $one = $this->postJson(self::URL, $trip + ['stops' => 1])->json('data.quote');
        $this->assertSame(15500, $one['subtotal_cents']);
        $this->assertSame(1, $one['included_stops']);

        $this->assertSame(15500 + 2 * 2000, $this->postJson(self::URL, $trip + ['stops' => 3])->json('data.quote.subtotal_cents'));
        $this->postJson(self::URL, $trip + ['stops' => 4])->assertStatus(422)->assertJsonPath('error.code', 'TOO_MANY_STOPS');
    }

    public function test_sprinter_on_a_trip_is_hourly_with_four_hour_minimum_and_free_stops(): void
    {
        $q = $this->postJson(self::URL, ['service' => 'p2p', 'tier' => 1, 'vehicle_class' => 'exec', 'vehicle_size' => 'van', 'stops' => 3])->json('data.quote');
        $this->assertSame(17500 * 4, $q['subtotal_cents']);      // $175/hr × 4 hrs, stops free
        $this->assertFalse($q['is_from_price']);
        $this->assertSame('Sprinter, hourly only', $q['lines'][0]['note']);
    }

    public function test_guards_on_a_trip_bill_three_hours_or_the_sprinter_hours(): void
    {
        $trip = ['service' => 'p2p', 'tier' => 1, 'vehicle_class' => 'exec', 'guards' => 1, 'security_tier' => 1];
        $this->assertSame(15500 + 4500 * 3, $this->postJson(self::URL, $trip + ['vehicle_size' => 'suv'])->json('data.quote.subtotal_cents'));
        $this->assertSame(17500 * 4 + 4500 * 4, $this->postJson(self::URL, $trip + ['vehicle_size' => 'van'])->json('data.quote.subtotal_cents'));
    }

    public function test_hourly_allows_five_free_stops_and_security_has_three_hour_minimum(): void
    {
        $this->assertSame(32000, $this->postJson(self::URL, $this->hourly(['stops' => 5]))->json('data.quote.subtotal_cents'));
        $this->postJson(self::URL, $this->hourly(['stops' => 6]))->assertStatus(422);
        $this->assertSame(4500 * 3, $this->postJson(self::URL, ['service' => 'security', 'tier' => 1, 'guards' => 1, 'hours' => 1])->json('data.quote.subtotal_cents'));
    }

    public function test_client_car_and_security_services(): void
    {
        $this->assertSame(4500 * 3, $this->postJson(self::URL, ['service' => 'client', 'tier' => 1, 'hours' => 1])->json('data.quote.subtotal_cents'));
        $this->assertSame(2 * 7500 * 5, $this->postJson(self::URL, ['service' => 'security', 'tier' => 3, 'guards' => 2, 'hours' => 5])->json('data.quote.subtotal_cents'));
    }

    public function test_unavailable_service_tier_vehicle_and_over_capacity_are_rejected(): void
    {
        Vehicle::where('form_value', 'exec|suv')->update(['passengers' => 6, 'luggage' => 6]);
        $this->postJson(self::URL, $this->hourly(['passengers' => 7]))->assertStatus(422)->assertJsonPath('error.code', 'OVER_CAPACITY');
        $this->postJson(self::URL, $this->hourly(['tier' => 9]))->assertStatus(422)->assertJsonPath('error.code', 'TIER_UNAVAILABLE');

        Vehicle::where('form_value', 'exec|suv')->update(['is_active' => false]);
        $this->postJson(self::URL, $this->hourly())->assertStatus(422)->assertJsonPath('error.code', 'VEHICLE_UNAVAILABLE');

        $this->set('hourly', ['is_active' => false]);
        $this->postJson(self::URL, $this->hourly())->assertStatus(422)->assertJsonPath('error.code', 'SERVICE_UNAVAILABLE');
    }

    public function test_standalone_security_is_checked_against_security_tiers_not_chauffeur_tiers(): void
    {
        $security = ['service' => 'security', 'tier' => 3, 'guards' => 1, 'hours' => 3];

        SiteTier::where(['kind' => 'driver', 'tier' => 3])->update(['is_active' => false]);
        $this->assertSame(7500 * 3, $this->postJson(self::URL, $security)->assertOk()->json('data.quote.subtotal_cents'));

        SiteTier::where(['kind' => 'driver', 'tier' => 3])->update(['is_active' => true]);
        SiteTier::where(['kind' => 'security', 'tier' => 3])->update(['is_active' => false]);
        $this->postJson(self::URL, $security)->assertStatus(422)->assertJsonPath('error.code', 'TIER_UNAVAILABLE');
        $this->postJson(self::URL, $this->hourly(['tier' => 3]))->assertOk();
    }

    public function test_a_party_fits_when_any_active_fleet_car_of_that_size_can_carry_them(): void
    {
        Vehicle::where('form_value', 'exec|suv')->update(['passengers' => 6, 'luggage' => 6, 'sort_order' => 5]);
        Vehicle::create([
            'name' => 'GMC Yukon', 'slug' => 'gmc-yukon', 'class_type' => 'exec', 'category' => 'FULL-SIZE SUV',
            'form_value' => 'exec|suv', 'passengers' => 2, 'luggage' => 2, 'sort_order' => 1, 'is_active' => true,
        ]);

        $this->postJson(self::URL, $this->hourly(['passengers' => 3]))->assertOk();
        $this->assertSame('GMC Yukon × 4 hrs', $this->postJson(self::URL, $this->hourly(['passengers' => 2]))->json('data.quote.lines.0.label'));
        $this->postJson(self::URL, $this->hourly(['passengers' => 7]))->assertStatus(422)->assertJsonPath('error.code', 'OVER_CAPACITY');
    }

    public function test_sprinter_trip_fare_rows_exist_switched_off_until_admin_prices_them(): void
    {
        $this->set('p2p', ['van_hourly' => false]);
        $trip = ['service' => 'p2p', 'tier' => 1, 'vehicle_class' => 'exec', 'vehicle_size' => 'van'];
        $this->postJson(self::URL, $trip)->assertStatus(422)->assertJsonPath('error.code', 'RATE_NOT_CONFIGURED');

        $row = ['kind' => 'point_to_point', 'vehicle_class' => 'exec', 'size' => 'van', 'tier' => 1];
        $this->assertSame(8, RateCard::where(['kind' => 'point_to_point', 'size' => 'van', 'is_active' => false, 'amount_cents' => 0])->count());
        $this->assertSame(1, RateCard::where($row)->update(['amount_cents' => 40000, 'is_active' => true]));
        $this->assertSame(40000, $this->postJson(self::URL, $trip)->assertOk()->json('data.quote.subtotal_cents'));
    }

    public function test_client_cannot_send_a_total(): void
    {
        $q = $this->postJson(self::URL, $this->hourly(['total_cents' => 1, 'amount_cents' => 1]))->json('data.quote');
        $this->assertSame(33000, $q['total_cents']);
    }

    public function test_admin_settings_need_pricing_permission_are_audited_and_simulate_matches_public(): void
    {
        [, $editor] = $this->actingAsRole('content_editor');
        $this->putJson('/api/v1/admin/pricing-settings/hourly', ['booking_fee_cents' => 0], $editor)->assertForbidden();

        [, $ops] = $this->actingAsRole('operations_manager');
        $this->getJson('/api/v1/admin/pricing-settings', $ops)->assertOk()->assertJsonCount(5, 'data.settings');
        $this->putJson('/api/v1/admin/pricing-settings/hourly', ['booking_fee_cents' => -1], $ops)->assertUnprocessable();
        $this->putJson('/api/v1/admin/pricing-settings/hourly', ['pricing_mode' => 'per_mile'], $ops)->assertUnprocessable();
        $this->putJson('/api/v1/admin/pricing-settings/hourly', ['booking_fee_cents' => 1500], $ops)->assertOk();
        $this->assertDatabaseHas('audit_logs', ['event' => 'pricing.settings.updated']);

        $sim = $this->postJson('/api/v1/admin/pricing/simulate', $this->hourly(), $ops)->assertOk()->json('data.quote');
        $this->assertSame($this->postJson(self::URL, $this->hourly())->json('data.quote'), $sim);
        $this->assertSame(33500, $sim['total_cents']);
    }

    public function test_tier_4_hourly_rates_follow_approved_developer_logic(): void
    {
        // Traverse (exec sedan) Tier 4 = $190/hr. 4 hrs = $760 base + $10 fee = $770 ($77000 cents)
        $t4Sedan = $this->postJson(self::URL, [
            'service' => 'hourly', 'tier' => 4, 'vehicle_class' => 'exec', 'vehicle_size' => 'sedan', 'hours' => 4
        ])->assertOk()->json('data.quote');
        $this->assertSame(76000, $t4Sedan['subtotal_cents']);
        $this->assertSame(77000, $t4Sedan['total_cents']);

        // Suburban (exec SUV) Tier 4 = $215/hr. 4 hrs = $860 base + $10 fee = $870 ($87000 cents)
        $t4Suv = $this->postJson(self::URL, [
            'service' => 'hourly', 'tier' => 4, 'vehicle_class' => 'exec', 'vehicle_size' => 'suv', 'hours' => 4
        ])->assertOk()->json('data.quote');
        $this->assertSame(86000, $t4Suv['subtotal_cents']);
        $this->assertSame(87000, $t4Suv['total_cents']);

        // Aviator (first sedan) Tier 4 = $210/hr. 4 hrs = $840 base + $10 fee = $850 ($85000 cents)
        $t4FirstSedan = $this->postJson(self::URL, [
            'service' => 'hourly', 'tier' => 4, 'vehicle_class' => 'first', 'vehicle_size' => 'sedan', 'hours' => 4
        ])->assertOk()->json('data.quote');
        $this->assertSame(84000, $t4FirstSedan['subtotal_cents']);
        $this->assertSame(85000, $t4FirstSedan['total_cents']);

        // Escalade (first SUV) Tier 4 = $235/hr. 4 hrs = $940 base + $10 fee = $950 ($95000 cents)
        $t4FirstSuv = $this->postJson(self::URL, [
            'service' => 'hourly', 'tier' => 4, 'vehicle_class' => 'first', 'vehicle_size' => 'suv', 'hours' => 4
        ])->assertOk()->json('data.quote');
        $this->assertSame(94000, $t4FirstSuv['subtotal_cents']);
        $this->assertSame(95000, $t4FirstSuv['total_cents']);
    }

    public function test_airport_pricing_nj_vs_nypa_vs_other(): void
    {
        // 1. NJ Airport (EWR): Escalade Tier 1 uses flat point-to-point trip fare ($200) + $10 fee = $210
        $njAirport = $this->postJson(self::URL, [
            'service' => 'airport', 'airport_code' => 'EWR', 'tier' => 1, 'vehicle_class' => 'first', 'vehicle_size' => 'suv'
        ])->assertOk()->json('data.quote');
        $this->assertSame(20000, $njAirport['subtotal_cents']);
        $this->assertSame(21000, $njAirport['total_cents']);
        $this->assertTrue($njAirport['is_from_price']);

        // 2. NY/PA Airport (JFK): Escalade Tier 1 uses HOURLY rate ($100) × 4 hours minimum + $10 fee = $410
        $jfkAirport = $this->postJson(self::URL, [
            'service' => 'airport', 'airport_code' => 'JFK', 'tier' => 1, 'vehicle_class' => 'first', 'vehicle_size' => 'suv'
        ])->assertOk()->json('data.quote');
        $this->assertSame(40000, $jfkAirport['subtotal_cents']);
        $this->assertSame(41000, $jfkAirport['total_cents']);
        $this->assertFalse($jfkAirport['is_from_price']);

        // 3. Any Sprinter to an airport: always uses hourly rate ($175) × 4 hours + $10 fee = $710
        $sprinterAirport = $this->postJson(self::URL, [
            'service' => 'airport', 'airport_code' => 'EWR', 'tier' => 1, 'vehicle_class' => 'exec', 'vehicle_size' => 'van'
        ])->assertOk()->json('data.quote');
        $this->assertSame(17500 * 4, $sprinterAirport['subtotal_cents']);
        $this->assertSame(17500 * 4 + 1000, $sprinterAirport['total_cents']);

        // 4. Other airport / FBO: shows "Dispatch will quote"
        $otherAirport = $this->postJson(self::URL, [
            'service' => 'airport', 'airport_code' => 'OTHER', 'tier' => 1, 'vehicle_class' => 'exec', 'vehicle_size' => 'suv'
        ])->assertOk()->json('data.quote');
        $this->assertTrue($otherAirport['dispatch_will_quote']);
        $this->assertSame(0, $otherAirport['total_cents']);
    }

    public function test_round_trip_pricing(): void
    {
        // Point-to-point round trip: Suburban Tier 1 = $155 × 2 = $310 base + $10 fee = $320
        $p2pRound = $this->postJson(self::URL, [
            'service' => 'p2p', 'tier' => 1, 'vehicle_class' => 'exec', 'vehicle_size' => 'suv', 'round_trip' => true
        ])->assertOk()->json('data.quote');
        $this->assertSame(31000, $p2pRound['subtotal_cents']);
        $this->assertSame(32000, $p2pRound['total_cents']);
        $this->assertTrue($p2pRound['round_trip']);

        // JFK Airport round trip: Escalade Tier 1 = ($100 × 4) × 2 = $800 base + $10 fee = $810
        $jfkRound = $this->postJson(self::URL, [
            'service' => 'airport', 'airport_code' => 'JFK', 'tier' => 1, 'vehicle_class' => 'first', 'vehicle_size' => 'suv', 'round_trip' => true
        ])->assertOk()->json('data.quote');
        $this->assertSame(80000, $jfkRound['subtotal_cents']);
        $this->assertSame(81000, $jfkRound['total_cents']);
    }

    public function test_fbo_and_hotel_guest_rides_service_charge(): void
    {
        // FBO & Hotel guest rides add $24.95 service charge
        $fboRide = $this->postJson(self::URL, [
            'service' => 'p2p', 'tier' => 1, 'vehicle_class' => 'exec', 'vehicle_size' => 'suv', 'is_fbo_hotel' => true
        ])->assertOk()->json('data.quote');

        // $155 base + $24.95 service charge = $179.95 subtotal; + $10 booking fee = $189.95 total ($18995 cents)
        $this->assertSame(15500 + 2495, $fboRide['subtotal_cents']);
        $this->assertSame(15500 + 2495 + 1000, $fboRide['total_cents']);
    }
}
