<?php

namespace Tests\Feature\Api;

use App\Models\RateCard;
use App\Models\RateSize;
use App\Models\SiteTier;
use App\Models\SiteVehicle;
use App\Models\Vehicle;
use Database\Seeders\SiteContentSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\CreatesStaff;
use Tests\Support\SeedsOperationalFleet;
use Tests\TestCase;

class SiteRatesMatrixTest extends TestCase
{
    use CreatesStaff, RefreshDatabase, SeedsOperationalFleet;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(SiteContentSeeder::class);
        $this->seedOperationalFleet();
    }

    public function test_pricing_manager_gets_rates_matrix(): void
    {
        [, $h] = $this->actingAsRole('super_admin');

        $response = $this->getJson('/api/v1/admin/site-rates/matrix', $h);

        $response->assertOk();
        $response->assertJsonStructure([
            'data' => [
                'classes',
                'sizes',
                'chauffeur_pay',
                'fees_and_pay_rules',
                'client_car_and_security',
                'rate_matrix',
            ],
        ]);

        $response->assertJsonPath('data.chauffeur_pay.1.hourly_rate', 25);
        $response->assertJsonPath('data.chauffeur_pay.2.hourly_rate', 30);
        $response->assertJsonPath('data.chauffeur_pay.3.hourly_rate', 35);
        $response->assertJsonPath('data.chauffeur_pay.4.hourly_rate', 55);
        $response->assertJsonPath('data.client_car_and_security.0.client_rate', 45);
        $response->assertJsonPath('data.client_car_and_security.0.security_rate', 45);
        $response->assertJsonPath('data.client_car_and_security.0.client_car_active', true);
        $response->assertJsonPath('data.client_car_and_security.0.security_active', true);
    }

    public function test_pricing_manager_updates_matrix_and_booking_fee(): void
    {
        [, $h] = $this->actingAsRole('super_admin');

        $card = RateCard::first();

        $response = $this->putJson('/api/v1/admin/site-rates/matrix', [
            'fees_and_pay_rules' => [
                'booking_fee' => 5.00,
            ],
            'rate_updates' => [
                [
                    'card_id' => $card->id,
                    'amount_cents' => 8500,
                    'is_active' => true,
                ],
            ],
        ], $h);

        $response->assertOk();
        $card->refresh();
        $this->assertEquals(8500, $card->amount_cents);

        $this->assertDatabaseHas('pricing_settings', [
            'booking_fee_cents' => 500,
        ]);
    }

    public function test_new_class_and_tier_start_unpublished_and_saved_rates_change_the_quote(): void
    {
        [, $h] = $this->actingAsRole('super_admin');

        $this->postJson('/api/v1/admin/site-rates/classes', ['name' => 'Coach'], $h)
            ->assertCreated()
            ->assertJsonPath('data.class.id', 'coach');

        $this->assertDatabaseHas('rate_cards', [
            'kind' => 'hourly', 'vehicle_class' => 'coach', 'size' => 'sedan', 'tier' => 1,
            'amount_cents' => 0, 'is_active' => false,
        ]);
        $this->assertDatabaseHas('site_vehicles', [
            'vehicle_class' => 'coach', 'size' => 'sedan', 'is_active' => false,
        ]);

        $this->postJson('/api/v1/admin/site-rates/tiers', ['label' => 'Night Watch'], $h)
            ->assertCreated()
            ->assertJsonPath('data.tier.tier', 5);
        $this->assertDatabaseHas('site_tiers', ['kind' => 'driver', 'tier' => 5, 'is_active' => false]);
        $this->assertDatabaseHas('site_tiers', ['kind' => 'security', 'tier' => 5, 'is_active' => false]);
        $this->assertFalse((bool) RateCard::where('kind', 'client_car_hourly')->where('tier', 5)->whereNull('vehicle_class')->value('is_active'));
        $this->assertSame(0, (int) RateCard::where('kind', 'security_hourly')->where('tier', 5)->whereNull('vehicle_class')->value('amount_cents'));

        $this->putJson('/api/v1/admin/site-rates/matrix', [
            'client_car_rates' => [['tier' => 1, 'amount_cents' => 5000, 'is_active' => true]],
            'security_rates' => [['tier' => 3, 'amount_cents' => 8000, 'is_active' => true]],
        ], $h)->assertOk();

        $this->assertSame(5000 * 3, $this->postJson('/api/v1/quotes', [
            'service' => 'client', 'tier' => 1, 'hours' => 1,
        ])->json('data.quote.subtotal_cents'));
        $this->assertSame(2 * 8000 * 5, $this->postJson('/api/v1/quotes', [
            'service' => 'security', 'tier' => 3, 'guards' => 2, 'hours' => 5,
        ])->json('data.quote.subtotal_cents'));

        RateCard::where(['kind' => 'hourly', 'vehicle_class' => 'coach', 'size' => 'sedan', 'tier' => 1])
            ->update(['amount_cents' => 9000, 'is_active' => true]);
        SiteVehicle::where(['vehicle_class' => 'coach', 'size' => 'sedan'])->update(['is_active' => true]);
        Vehicle::create([
            'name' => 'Coach Sedan', 'slug' => 'coach-sedan', 'class_type' => 'coach', 'category' => 'Sedan',
            'form_value' => 'coach|sedan', 'passengers' => 3, 'luggage' => 3, 'is_active' => true,
        ]);

        $this->assertSame(9000 * 4, $this->postJson('/api/v1/quotes', [
            'service' => 'hourly', 'tier' => 1, 'vehicle_class' => 'coach', 'vehicle_size' => 'sedan',
            'hours' => 4, 'passengers' => 1, 'bags' => 0,
        ])->json('data.quote.subtotal_cents'));
    }

    public function test_catalog_rejects_duplicates_and_editors_without_pricing_access(): void
    {
        [, $h] = $this->actingAsRole('super_admin');
        $this->postJson('/api/v1/admin/site-rates/sizes', ['name' => 'SUV'], $h)
            ->assertStatus(422)
            ->assertJsonPath('error.code', 'VALIDATION_FAILED');

        [, $editor] = $this->actingAsRole('content_editor');
        $this->postJson('/api/v1/admin/site-rates/classes', ['name' => 'Coach'], $editor)->assertForbidden();
    }

    public function test_retiring_a_size_stops_offering_its_rates(): void
    {
        [, $h] = $this->actingAsRole('super_admin');

        $this->postJson('/api/v1/admin/site-rates/sizes/van/retire', [], $h)->assertOk();

        $this->assertFalse((bool) RateSize::where('key', 'van')->value('is_active'));
        $this->assertSame(0, RateCard::where('size', 'van')->where('is_active', true)->count());
        $this->assertSame(0, SiteVehicle::where('size', 'van')->where('is_active', true)->count());

        // Re-activating restores the size
        $this->postJson('/api/v1/admin/site-rates/sizes/van/activate', [], $h)->assertOk();
        $this->assertTrue((bool) RateSize::where('key', 'van')->value('is_active'));
    }

    public function test_toggling_and_deleting_tiers_and_classes(): void
    {
        [, $h] = $this->actingAsRole('super_admin');

        // Add custom tier 5
        $this->postJson('/api/v1/admin/site-rates/tiers', ['label' => 'Custom Shift'], $h)->assertCreated();
        $tier = (int) SiteTier::where('label', 'Custom Shift')->value('tier');
        $this->assertGreaterThan(4, $tier);

        // Retire custom tier
        $this->postJson("/api/v1/admin/site-rates/tiers/{$tier}/retire", [], $h)->assertOk();
        $this->assertFalse((bool) SiteTier::where('tier', $tier)->where('kind', 'driver')->value('is_active'));

        // Re-activate custom tier
        $this->postJson("/api/v1/admin/site-rates/tiers/{$tier}/activate", [], $h)->assertOk();
        $this->assertTrue((bool) SiteTier::where('tier', $tier)->where('kind', 'driver')->value('is_active'));

        // Delete custom tier
        $this->deleteJson("/api/v1/admin/site-rates/tiers/{$tier}", [], $h)->assertOk();
        $this->assertDatabaseMissing('site_tiers', ['tier' => $tier]);

        // Core tiers (1-4) cannot be deleted
        $this->deleteJson('/api/v1/admin/site-rates/tiers/1', [], $h)->assertStatus(422);

        // Add and delete custom class
        $this->postJson('/api/v1/admin/site-rates/classes', ['name' => 'Armored Car'], $h)->assertCreated();
        $this->assertDatabaseHas('rate_classes', ['key' => 'armored_car']);
        $this->deleteJson('/api/v1/admin/site-rates/classes/armored_car', [], $h)->assertOk();
        $this->assertDatabaseMissing('rate_classes', ['key' => 'armored_car']);
    }

    public function test_saved_chauffeur_hourly_pay_replaces_the_published_figure(): void
    {
        [, $h] = $this->actingAsRole('super_admin');

        $this->putJson('/api/v1/admin/site-rates/matrix', [
            'chauffeur_pay' => [
                ['tier' => 2, 'hourly_rate' => 32.5],
            ],
        ], $h)->assertOk()
            ->assertJsonPath('data.chauffeur_pay.2.hourly_rate', 32.5)
            ->assertJsonPath('data.chauffeur_pay.1.hourly_rate', 25);

        $this->assertSame(3250, (int) SiteTier::where('kind', 'driver')->where('tier', 2)->value('pay_cents'));
    }
}
