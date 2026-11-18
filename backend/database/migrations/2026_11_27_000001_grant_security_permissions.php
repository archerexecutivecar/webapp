<?php

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Migrations\Migration;

/*
 * Security module permissions were added to config/rbac.php but the deploy pipeline only runs
 * `migrate`, never the seeder, so live databases never received them and the SECURITY nav group
 * stayed hidden. This additively creates security.* and grants them to the roles that config/rbac.php
 * lists them for. It never revokes anything, so runtime role edits are preserved.
 */
return new class extends Migration
{
    private const KEYS = ['security.view', 'security.manage'];

    public function up(): void
    {
        $ids = [];
        foreach (self::KEYS as $key) {
            $ids[$key] = Permission::firstOrCreate(['key' => $key])->id;
        }

        foreach (config('rbac.roles') as $roleKey => $def) {
            $grant = array_values(array_intersect(self::KEYS, $def['permissions']));
            if ($grant === []) {
                continue;
            }
            $role = Role::updateOrCreate(['key' => $roleKey], ['name' => $def['name']]);
            $role->permissions()->syncWithoutDetaching(array_map(fn ($k) => $ids[$k], $grant));
        }
    }

    public function down(): void
    {
        // Intentionally non-destructive: permission grants are not revoked on rollback.
    }
};
