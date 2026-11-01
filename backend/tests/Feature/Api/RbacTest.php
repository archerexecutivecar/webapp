<?php

namespace Tests\Feature\Api;

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\CreatesStaff;
use Tests\TestCase;

class RbacTest extends TestCase
{
    use CreatesStaff, RefreshDatabase;

    public function test_seeded_roles_and_permissions_match_the_approved_matrix_exactly(): void
    {
        $this->seedRbac();
        $this->seedRbac(); // idempotent

        $this->assertSame(9, Role::count());
        foreach (config('rbac.roles') as $key => $def) {
            $actual = Role::where('key', $key)->firstOrFail()->permissions()->pluck('key')->sort()->values()->all();
            $expected = collect($def['permissions'])->sort()->values()->all();
            $this->assertSame($expected, $actual, "Role {$key} permission drift");
        }
    }

    public function test_privileged_permissions_are_not_granted_to_unrelated_roles(): void
    {
        $this->seedRbac();
        $deny = [
            'dispatcher' => ['payments.manage', 'payroll.view', 'pricing.manage', 'users.manage', 'audit.view'],
            'driver_manager' => ['payroll.manage', 'rides.manage', 'pricing.manage'],
            'finance_payroll' => ['pricing.manage', 'dispatch.manage', 'drivers.manage', 'settings.manage'],
            'content_editor' => ['content.publish', 'dashboard.view', 'rides.view'],
            'content_publisher' => ['dashboard.view', 'payments.view'],
            'operations_manager' => ['users.manage', 'roles.manage', 'payments.manage', 'payroll.view', 'drivers.switches'],
            'driver' => ['dashboard.view', 'drivers.view', 'rides.view'],
            'customer' => ['dashboard.view', 'drivers.view', 'rides.view'],
        ];
        foreach ($deny as $role => $keys) {
            $user = $this->userWithRoles([$role]);
            foreach ($keys as $key) {
                $this->assertFalse($user->hasPermission($key), "{$role} must not have {$key}");
            }
        }
    }

    public function test_multiple_roles_grant_the_union_of_permissions(): void
    {
        $user = $this->userWithRoles(['content_editor', 'dispatcher']);

        $this->assertTrue($user->hasPermission('content.edit'));
        $this->assertTrue($user->hasPermission('dispatch.manage'));
        $this->assertFalse($user->hasPermission('content.publish'));
    }

    public function test_suspended_user_has_no_permissions(): void
    {
        $user = $this->userWithRoles(['super_admin']);
        $user->forceFill(['status' => User::STATUS_SUSPENDED])->save();

        $this->assertSame([], $user->permissionKeys());
    }

    public function test_client_cannot_self_assign_status_or_roles_via_mass_assignment(): void
    {
        $user = new User(['name' => 'x', 'email' => 'x@example.com', 'password' => 'p', 'status' => 'suspended', 'roles' => ['super_admin']]);

        $this->assertSame('active', $user->status); // mass-assigned status ignored; model default applies
        $this->assertArrayNotHasKey('roles', $user->getAttributes());
    }

    public function test_an_unprivileged_user_cannot_reach_privileged_endpoints_and_the_denial_is_audited(): void
    {
        foreach (['customer', 'driver', 'content_editor', 'content_publisher'] as $role) {
            [$user, $headers] = $this->actingAsRole($role);

            $this->getJson('/api/v1/admin/dashboard', $headers)
                ->assertStatus(403)
                ->assertJsonPath('error.code', 'FORBIDDEN');

            $this->assertDatabaseHas('audit_logs', ['event' => 'access.denied', 'actor_id' => $user->id]);
        }
    }

    public function test_a_client_supplied_role_claim_is_ignored(): void
    {
        [, $headers] = $this->actingAsRole('customer');

        $this->getJson('/api/v1/admin/dashboard?role=super_admin', $headers + ['X-Role' => 'super_admin'])
            ->assertStatus(403);
    }
}
