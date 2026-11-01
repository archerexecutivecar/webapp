<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /** Syncs roles/permissions from config/rbac.php. Creates no users or credentials. */
    public function run(): void
    {
        $permissionIds = [];
        foreach (config('rbac.permissions') as $key) {
            $permissionIds[$key] = Permission::firstOrCreate(['key' => $key])->id;
        }

        foreach (config('rbac.roles') as $key => $def) {
            $role = Role::updateOrCreate(['key' => $key], ['name' => $def['name']]);
            $role->permissions()->sync(array_map(fn ($p) => $permissionIds[$p], $def['permissions']));
        }
    }
}
