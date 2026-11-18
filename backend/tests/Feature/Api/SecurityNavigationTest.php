<?php

namespace Tests\Feature\Api;

use App\Models\Permission;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\CreatesStaff;
use Tests\TestCase;

class SecurityNavigationTest extends TestCase
{
    use CreatesStaff, RefreshDatabase;

    private function navKeys(array $headers): array
    {
        return collect($this->getJson('/api/v1/admin/navigation', $headers)->assertOk()->json('data.groups'))->pluck('key')->all();
    }

    public function test_super_admin_sees_security_nav_after_grant_migration_on_db_missing_permissions(): void
    {
        [, $headers] = $this->actingAsRole('super_admin');
        // Simulate a live DB that predates the security.* permissions (deploys never run the seeder).
        Permission::whereIn('key', ['security.view', 'security.manage'])->each(function ($p) {
            $p->roles()->detach();
            $p->delete();
        });
        $this->assertNotContains('security', $this->navKeys($headers));

        (require database_path('migrations/2026_11_27_000001_grant_security_permissions.php'))->up();

        $this->assertContains('security', $this->navKeys($headers));
    }

    public function test_grant_migration_is_idempotent_and_additive(): void
    {
        [, $headers] = $this->actingAsRole('dispatcher');
        $migration = require database_path('migrations/2026_11_27_000001_grant_security_permissions.php');
        $migration->up();
        $migration->up();

        $this->assertSame(1, Permission::where('key', 'security.view')->count());
        $this->assertContains('security', $this->navKeys($headers));
    }
}
