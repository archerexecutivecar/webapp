<?php

namespace Tests\Feature\Api;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\CreatesStaff;
use Tests\TestCase;

class PaymentsEarningsTest extends TestCase
{
    use CreatesStaff, RefreshDatabase;

    public function test_pricing_manager_gets_payments_and_earnings(): void
    {
        [, $h] = $this->actingAsRole('super_admin');

        $response = $this->getJson('/api/v1/admin/payments-earnings', $h);

        $response->assertOk();
        $response->assertJsonStructure([
            'data' => [
                'period',
                'drivers',
                'kpis' => [
                    'collected',
                    'driver_pay_tips',
                    'sales_tax',
                    'card_fees',
                    'archer_profit',
                ],
                'totals',
                'ledger',
            ],
        ]);

        $this->assertEquals(1211.58, $response->json('data.kpis.collected'));
        $this->assertEquals(372.50, $response->json('data.kpis.driver_pay_tips'));
        $this->assertEquals(66.58, $response->json('data.kpis.sales_tax'));
        $this->assertEquals(35.53, $response->json('data.kpis.card_fees'));
        $this->assertEquals(526.97, $response->json('data.kpis.archer_profit'));
    }

    public function test_payments_filter_by_driver(): void
    {
        [, $h] = $this->actingAsRole('super_admin');

        $response = $this->getJson('/api/v1/admin/payments-earnings?driver=Paul+Malesky', $h);

        $response->assertOk();
        $this->assertCount(1, $response->json('data.ledger'));
        $this->assertEquals('AR-1046', $response->json('data.ledger.0.ride_reference'));
        $this->assertEquals(1010.98, $response->json('data.kpis.collected'));
        $this->assertEquals(441.97, $response->json('data.kpis.archer_profit'));
    }
}
