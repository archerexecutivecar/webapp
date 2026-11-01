<?php

namespace App\Console\Commands;

use App\Models\AuditLog;
use App\Models\Role;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;

class CreateSuperAdmin extends Command
{
    protected $signature = 'archer:create-super-admin {email} {--name=Super Admin}';

    protected $description = 'Create the first Super Admin. The password is prompted, never passed as an argument.';

    public function handle(): int
    {
        $role = Role::where('key', 'super_admin')->first();
        if (! $role) {
            $this->error('Roles are not seeded. Run: php artisan db:seed');

            return self::FAILURE;
        }

        $password = $this->secret('Password (min 12 chars, mixed case, numbers)');
        $validator = Validator::make(
            ['email' => $this->argument('email'), 'password' => $password],
            ['email' => ['required', 'email', 'unique:users,email'], 'password' => ['required', Password::min(12)->mixedCase()->numbers()]],
        );
        if ($validator->fails()) {
            $this->error($validator->errors()->first());

            return self::FAILURE;
        }

        $user = User::create(['name' => $this->option('name'), 'email' => $this->argument('email'), 'password' => $password]);
        $user->roles()->attach($role);
        AuditLog::record('user.created', null, ['via' => 'cli', 'role' => 'super_admin'], $user);

        $this->info("Super Admin {$user->email} created.");

        return self::SUCCESS;
    }
}
