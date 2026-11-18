<?php

namespace Tests\Feature\Api;

use App\Models\Driver;
use App\Models\RideRequest;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\Support\CreatesStaff;
use Tests\TestCase;

class PaymentsEarningsTest extends TestCase
{
    use CreatesStaff, RefreshDatabase;

    public function test_pricing_manager_gets_payments_and_earnings_from_completed_rides(): void
    {
        [, $h] = $this->actingAsRole('super_admin');

        $driver = Driver::create([
            'name' => 'Paul Malesky',
            'email' => 'paul@archer.test',
            'phone' => '(732) 555-0141',
            'is_active' => true,
        ]);

        RideRequest::create([
            'reference' => 'AR-9001',
            'phone' => '+15551234567',
            'service_type' => 'hourly',
            'first_name' => 'Priya',
            'last_name' => 'Nair',
            'status' => 'completed',
            'ride_date' => now()->toDateString(),
            'assigned_driver_id' => $driver->id,
            'details' => [
                'fare' => 840.00,
                'booking_fee' => 5.00,
                'tax' => 55.98,
                'tip' => 110.00,
                'client_paid' => 1010.98,
                'card_fee' => 35.53,
                'driver_pay' => 157.50,
                'archer_profit' => 441.97,
                'payment_method' => 'Card',
            ],
        ]);

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

        $this->assertEquals(1010.98, $response->json('data.kpis.collected'));
        $this->assertEquals(267.50, $response->json('data.kpis.driver_pay_tips'));
        $this->assertEquals(55.98, $response->json('data.kpis.sales_tax'));
        $this->assertEquals(35.53, $response->json('data.kpis.card_fees'));
        $this->assertEquals(441.97, $response->json('data.kpis.archer_profit'));
        $this->assertEquals('AR-9001', $response->json('data.ledger.0.ride_reference'));
        $this->assertEquals((string) $driver->id, $response->json('data.ledger.0.driver_id'));
    }

    public function test_payments_filter_by_driver(): void
    {
        [, $h] = $this->actingAsRole('super_admin');

        $driver = Driver::create([
            'name' => 'Paul Malesky',
            'email' => 'paul@archer.test',
            'phone' => '(732) 555-0141',
            'is_active' => true,
        ]);

        $other = Driver::create([
            'name' => 'Joseph Klein',
            'email' => 'joseph@archer.test',
            'phone' => '(732) 555-0142',
            'is_active' => true,
        ]);

        foreach ([[$driver, 'AR-9001', 1010.98], [$other, 'AR-9002', 200.60]] as [$d, $ref, $paid]) {
            RideRequest::create([
                'id' => (string) Str::uuid(),
                'reference' => $ref,
                'phone' => '+15551234567',
                'service_type' => 'hourly',
                'first_name' => 'Client',
                'status' => 'completed',
                'ride_date' => now()->toDateString(),
                'assigned_driver_id' => $d->id,
                'details' => [
                    'fare' => $paid,
                    'client_paid' => $paid,
                    'driver_pay' => 75,
                    'payment_method' => 'Card',
                ],
            ]);
        }

        $response = $this->getJson('/api/v1/admin/payments-earnings?driver=' . urlencode($driver->id), $h);

        $response->assertOk();
        $this->assertCount(1, $response->json('data.ledger'));
        $this->assertEquals('AR-9001', $response->json('data.ledger.0.ride_reference'));
        $this->assertEquals(1010.98, $response->json('data.kpis.collected'));
    }
}