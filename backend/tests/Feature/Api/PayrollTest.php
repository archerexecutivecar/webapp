<?php

namespace Tests\Feature\Api;

use App\Models\AuditLog;
use App\Models\Driver;
use App\Models\PayrollDisbursement;
use App\Models\RideRequest;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\CreatesStaff;
use Tests\TestCase;

class PayrollTest extends TestCase
{
    use RefreshDatabase, CreatesStaff;

    public function test_pricing_manager_can_fetch_payroll_summaries_from_completed_rides(): void
    {
        [$user, $headers] = $this->actingAsRole('super_admin');

        $weekStart = now()->startOfWeek()->toDateString();

        $driver = Driver::create([
            'name' => 'Paul Malesky',
            'email' => 'paul.malesky@archer.test',
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
            'ride_date' => $weekStart,
            'assigned_driver_id' => $driver->id,
            'details' => [
                'fare' => 840.00,
                'tip' => 110.00,
                'driver_pay' => 135.00,
                'client_paid' => 1010.98,
                'payment_method' => 'Card',
                'hours' => 4.5,
                'tier_rate' => 30.00,
            ],
        ]);

        $response = $this->withHeaders($headers)->getJson('/api/v1/admin/payroll?week=' . $weekStart);

        $response->assertOk();
        $response->assertJsonStructure([
            'data' => [
                'pay_week' => ['start', 'end', 'disbursement_date', 'label'],
                'kpis' => ['total_payout_ready', 'total_cash_kept', 'total_carried_forward', 'ready_count'],
                'drivers',
            ],
        ]);

        $this->assertEquals(245.00, $response->json('data.kpis.total_payout_ready'));
        $this->assertEquals(1, $response->json('data.kpis.ready_count'));

        $driverRow = collect($response->json('data.drivers'))->firstWhere('name', 'Paul Malesky');
        $this->assertNotNull($driverRow);
        $this->assertEquals('AR-9001', $driverRow['rides'][0]['ride_reference']);
        $this->assertEquals((string) $driver->id, $driverRow['rides'][0]['driver_id']);
    }

    public function test_pricing_manager_can_record_payroll_disbursement(): void
    {
        [$user, $headers] = $this->actingAsRole('super_admin');

        $driver = Driver::create([
            'name' => 'Paul Malesky',
            'email' => 'paul.malesky@archer.test',
            'phone' => '(732) 555-0141',
            'is_active' => true,
        ]);

        RideRequest::create([
            'reference' => 'AR-9002',
            'phone' => '+15551234567',
            'service_type' => 'hourly',
            'first_name' => 'Priya',
            'last_name' => 'Nair',
            'status' => 'completed',
            'ride_date' => '2026-11-18',
            'assigned_driver_id' => $driver->id,
            'details' => [
                'fare' => 840.00,
                'tip' => 110.00,
                'driver_pay' => 135.00,
                'client_paid' => 1010.98,
                'payment_method' => 'Card',
                'hours' => 4.5,
                'tier_rate' => 30.00,
            ],
        ]);

        $payload = [
            'driver_id' => $driver->id,
            'pay_week_start' => '2026-11-16',
            'pay_week_end' => '2026-11-22',
            'amount' => 99999.00, // tampered client amount must be ignored
            'payment_method' => 'check',
            'reference_number' => 'CHK-10892',
            'notes' => 'Archer check signed by director',
        ];

        $response = $this->withHeaders($headers)->postJson('/api/v1/admin/payroll/disbursements', $payload);

        $response->assertOk();
        $this->assertDatabaseHas('payroll_disbursements', [
            'driver_id' => $driver->id,
            'pay_week_start' => '2026-11-16',
            'net_amount' => 245.00,
            'payment_method' => 'check',
            'reference_number' => 'CHK-10892',
        ]);

        $this->assertDatabaseHas('audit_logs', [
            'event' => 'payroll.disbursed',
        ]);
    }

    public function test_disbursement_rejects_driver_with_no_payout_due(): void
    {
        [, $headers] = $this->actingAsRole('super_admin');

        $driver = Driver::create([
            'name' => 'Idle Driver',
            'email' => 'idle.driver@archer.test',
            'phone' => '(732) 555-0142',
            'is_active' => true,
        ]);

        $this->withHeaders($headers)->postJson('/api/v1/admin/payroll/disbursements', [
            'driver_id' => $driver->id,
            'pay_week_start' => '2026-11-16',
            'pay_week_end' => '2026-11-22',
            'payment_method' => 'ach',
            'reference_number' => 'ACH-001',
        ])->assertStatus(422)->assertJsonPath('error.code', 'NO_PAYOUT_DUE');
    }
}