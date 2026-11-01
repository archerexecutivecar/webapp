<?php

namespace Tests\Support;

use App\Models\ApiToken;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;

trait CreatesStaff
{
    protected function seedRbac(): void
    {
        $this->seed(DatabaseSeeder::class);
    }

    protected function userWithRoles(array $roleKeys, array $attrs = []): User
    {
        $this->seedRbac();
        $user = User::factory()->create($attrs);
        $user->roles()->attach(Role::whereIn('key', $roleKeys)->pluck('id'));

        return $user;
    }

    /** @return array{0: User, 1: array<string,string>} */
    protected function actingAsRole(string ...$roleKeys): array
    {
        $user = $this->userWithRoles($roleKeys);
        [$plain] = ApiToken::issueFor($user);

        return [$user, ['Authorization' => 'Bearer '.$plain]];
    }
}
