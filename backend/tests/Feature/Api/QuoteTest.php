<?php

namespace Tests\Feature\Api;

use App\Models\PricingSetting;
use App\Models\RateCard;
use App\Models\SiteVehicle;
use Database\Seeders\SiteContentSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\CreatesStaff;
use Tests\TestCase;

/** Every pricing rule in docs/PRICING_ENGINE_PLAN.md section 4, computed by hand in integer cents. */
class QuoteTest extends TestCase
{
    use CreatesStaff, RefreshDatabase;

    private const URL = '/api/v1/quotes';

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(SiteContentSeeder::class);
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
        SiteVehicle::where(['vehicle_class' => 'exec', 'size' => 'suv'])->update(['passengers' => 6, 'bags' => 6]);
        $this->postJson(self::URL, $this->hourly(['passengers' => 7]))->assertStatus(422)->assertJsonPath('error.code', 'OVER_CAPACITY');
        $this->postJson(self::URL, $this->hourly(['tier' => 9]))->assertStatus(422)->assertJsonPath('error.code', 'TIER_UNAVAILABLE');

        SiteVehicle::where(['vehicle_class' => 'exec', 'size' => 'suv'])->update(['is_active' => false]);
        $this->postJson(self::URL, $this->hourly())->assertStatus(422)->assertJsonPath('error.code', 'VEHICLE_UNAVAILABLE');

        $this->set('hourly', ['is_active' => false]);
        $this->postJson(self::URL, $this->hourly())->assertStatus(422)->assertJsonPath('error.code', 'SERVICE_UNAVAILABLE');
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
}
