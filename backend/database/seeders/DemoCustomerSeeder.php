<?php

namespace Database\Seeders;

use App\Models\RideRequest;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

/**
 * Demo customer for trying the customer portal on local/staging. Never runs in production.
 *
 *   php artisan db:seed --class=DemoCustomerSeeder
 *
 * The password comes from DEMO_CUSTOMER_PASSWORD (env). If unset, a random one is generated and printed
 * once to the console, so no credential is ever stored in the repository.
 * Idempotent: re-running resets the demo account's password and restores its three sample rides.
 */
class DemoCustomerSeeder extends Seeder
{
    public const EMAIL = 'demo.customer@example.com';

    public function run(): void
    {
        if (app()->isProduction()) {
            $this->command?->error('DemoCustomerSeeder refuses to run in production.');

            return;
        }

        $role = Role::where('key', 'customer')->first();
        if (! $role) {
            $this->command?->error('Run DatabaseSeeder first (roles are missing).');

            return;
        }

        $password = env('DEMO_CUSTOMER_PASSWORD') ?: Str::password(16, symbols: false);

        $user = User::firstOrNew(['email' => self::EMAIL]);
        $user->forceFill([
            'name' => 'Demo Customer', 'phone' => '7325550142', 'password' => $password,
            'password_set_at' => now(), 'email_verified_at' => now(), 'status' => 'active',
        ])->save();
        $user->roles()->syncWithoutDetaching([$role->id]);

        $rides = [
            ['DEMO-1001', 'completed', 'airport', 'Newark Liberty (EWR)', 'Oceanport, NJ', -14, '08:30', 'Cadillac Escalade'],
            ['DEMO-1002', 'dispatched', 'point_to_point', 'Oceanport, NJ', 'Manhattan, NY', 2, '09:00', 'Chevrolet Suburban'],
            ['DEMO-1003', 'pending', 'hourly', 'Red Bank, NJ', 'Red Bank, NJ', 6, '18:00', 'Lincoln Aviator'],
        ];
        foreach ($rides as [$ref, $status, $type, $from, $to, $days, $time, $vehicle]) {
            RideRequest::updateOrCreate(['reference' => $ref], [
                'request_type' => $type, 'service_type' => $type, 'first_name' => 'Demo', 'last_name' => 'Customer',
                'email' => self::EMAIL, 'phone' => '7325550142', 'pickup_location' => $from, 'dropoff_location' => $to,
                'driver_tier' => '1', 'ride_date' => now()->addDays($days)->format('Y-m-d'), 'ride_time' => $time,
                'vehicle' => $vehicle, 'status' => $status, 'customer_id' => $user->getKey(),
            ]);
        }

        $this->command?->info('Demo customer ready.');
        $this->command?->line('  Email:    '.self::EMAIL);
        $this->command?->line(env('DEMO_CUSTOMER_PASSWORD') ? '  Password: (value of DEMO_CUSTOMER_PASSWORD)' : '  Password: '.$password.'   (shown once; re-run to generate a new one)');
    }
}
