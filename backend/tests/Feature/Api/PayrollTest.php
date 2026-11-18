<?php

namespace Tests\Feature\Api;

use App\Models\AuditLog;
use App\Models\Driver;
use App\Models\PayrollDisbursement;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\CreatesStaff;
use Tests\TestCase;

class PayrollTest extends TestCase
{
    use RefreshDatabase, CreatesStaff;

    public function test_pricing_manager_can_fetch_payroll_summaries(): void
    {
        [$user, $headers] = $this->actingAsRole('super_admin');

        $response = $this->withHeaders($headers)->getJson('/api/v1/admin/payroll');

        $response->assertOk();
        $response->assertJsonStructure([
            'data' => [
                'pay_week' => ['start', 'end', 'disbursement_date', 'label'],
                'kpis' => ['total_payout_ready', 'total_cash_kept', 'total_carried_forward', 'ready_count'],
                'drivers',
            ],
        ]);

        $this->assertEquals(245.00, $response->json('data.kpis.total_payout_ready'));
        $this->assertEquals(200.60, $response->json('data.kpis.total_cash_kept'));
        $this->assertEquals(-95.60, $response->json('data.kpis.total_carried_forward'));
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

        $payload = [
            'driver_id' => $driver->id,
            'pay_week_start' => '2026-11-16',
            'pay_week_end' => '2026-11-22',
            'amount' => 245.00,
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
}
