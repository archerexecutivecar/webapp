<?php

namespace Tests\Feature\Api;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\CreatesStaff;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use CreatesStaff, RefreshDatabase;

    public function test_requires_authentication(): void
    {
        $this->getJson('/api/v1/admin/dashboard')->assertStatus(401)->assertJsonPath('error.code', 'UNAUTHENTICATED');
    }

    public function test_unauthenticated_request_without_json_accept_header_still_gets_the_json_401(): void
    {
        $this->get('/api/v1/admin/dashboard')->assertStatus(401)->assertJsonPath('error.code', 'UNAUTHENTICATED');
    }

    public function test_every_dashboard_role_is_allowed(): void
    {
        foreach (['super_admin', 'operations_manager', 'dispatcher', 'driver_manager', 'finance_payroll'] as $role) {
            [, $headers] = $this->actingAsRole($role);
            $this->getJson('/api/v1/admin/dashboard', $headers)->assertOk();
        }
    }

    public function test_metrics_come_from_the_database(): void
    {
        [$admin, $headers] = $this->actingAsRole('super_admin');
        $this->userWithRoles(['dispatcher']);
        $this->userWithRoles(['dispatcher'], ['status' => User::STATUS_SUSPENDED]);
        $this->userWithRoles(['driver']);
        AuditLog::record('auth.login_failed');
        AuditLog::record('auth.login_failed');
        AuditLog::record('auth.login', $admin->id);

        $res = $this->getJson('/api/v1/admin/dashboard', $headers)->assertOk();

        $res->assertJsonPath('data.staff_users.total', 4)
            ->assertJsonPath('data.staff_users.active', 3)
            ->assertJsonPath('data.staff_users.suspended', 1)
            ->assertJsonPath('data.security.failed_logins_24h', 2)
            ->assertJsonPath('data.security.successful_logins_24h', 1)
            ->assertJsonStructure(['data' => ['users_by_role', 'recent_audit_events'], 'meta' => ['generated_at']]);

        $byRole = collect($res->json('data.users_by_role'))->pluck('users', 'role');
        $this->assertSame(2, $byRole['dispatcher']);
        $this->assertSame(1, $byRole['driver']);
        $this->assertSame(1, $byRole['super_admin']);
    }

    public function test_old_login_events_are_excluded_from_24h_counts(): void
    {
        [, $headers] = $this->actingAsRole('super_admin');
        $row = AuditLog::record('auth.login_failed');
        \DB::table('audit_logs')->where('id', $row->id)->update(['created_at' => now()->subDays(2)]);

        $this->getJson('/api/v1/admin/dashboard', $headers)->assertJsonPath('data.security.failed_logins_24h', 0);
    }

    public function test_audit_events_are_hidden_from_roles_without_audit_view(): void
    {
        [, $headers] = $this->actingAsRole('dispatcher');

        $this->getJson('/api/v1/admin/dashboard', $headers)->assertOk()->assertJsonMissingPath('data.recent_audit_events');
    }

    public function test_finance_only_sees_financial_audit_events(): void
    {
        AuditLog::record('payment.refunded');
        AuditLog::record('payroll.run');
        AuditLog::record('auth.login_failed');
        [, $headers] = $this->actingAsRole('finance_payroll');

        $events = collect($this->getJson('/api/v1/admin/dashboard', $headers)->json('data.recent_audit_events'))->pluck('event');

        $this->assertEqualsCanonicalizing(['payment.refunded', 'payroll.run'], $events->all());
    }

    public function test_ops_manager_sees_all_audit_events_and_finance_plus_ops_is_unrestricted(): void
    {
        AuditLog::record('auth.login_failed');
        [, $ops] = $this->actingAsRole('operations_manager');
        [, $both] = $this->actingAsRole('finance_payroll', 'operations_manager');

        foreach ([$ops, $both] as $headers) {
            $events = collect($this->getJson('/api/v1/admin/dashboard', $headers)->json('data.recent_audit_events'))->pluck('event');
            $this->assertContains('auth.login_failed', $events->all());
        }
    }

    public function test_audit_logs_are_immutable(): void
    {
        $row = AuditLog::record('x.y');

        $this->expectException(\LogicException::class);
        $row->update(['event' => 'tampered']);
    }

    public function test_unknown_api_route_returns_the_standard_error_envelope_and_unhandled_errors_do_not_leak(): void
    {
        $this->getJson('/api/v1/nope')->assertStatus(404)->assertJsonPath('error.code', 'NOT_FOUND');
    }
}
