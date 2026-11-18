<?php

namespace Tests\Feature\Api;

use App\Models\RateCard;
use Database\Seeders\SiteContentSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\CreatesStaff;
use Tests\TestCase;

class SiteRatesMatrixTest extends TestCase
{
    use CreatesStaff, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(SiteContentSeeder::class);
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
        $response->assertJsonPath('data.client_car_and_security.0.driver_guard_pay', 30);
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
}
