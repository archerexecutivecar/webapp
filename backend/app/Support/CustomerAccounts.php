<?php

namespace App\Support;

use App\Models\Role;
use App\Models\User;
use Illuminate\Support\Str;

class CustomerAccounts
{
    /**
     * Finds or creates the customer account for a booking email.
     * Returns null when the email belongs to a staff account: staff never receive customer rides.
     * A new account has no usable password; the customer signs in with an emailed code and may set one later.
     */
    public static function forBooking(?string $email, string $name, ?string $phone): ?User
    {
        $email = $email ? Str::lower(trim($email)) : null;
        if (! $email) {
            return null;
        }

        $user = User::where('email', $email)->first();
        if ($user) {
            $roles = $user->roleKeys();

            return array_diff($roles, ['customer']) === [] ? $user : null;
        }

        $user = User::create([
            'name' => $name !== '' ? $name : $email,
            'email' => $email,
            'password' => Str::random(64), // hashed by the model cast; never shown or used
        ]);
        $user->forceFill(['phone' => $phone])->save();

        $role = Role::where('key', 'customer')->first();
        if ($role) {
            $user->roles()->attach($role->id);
        }

        return $user;
    }
}
