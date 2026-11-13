<?php

namespace Tests\Feature\Api;

use Database\Seeders\DatabaseSeeder;
use Database\Seeders\DemoCustomerSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DemoCustomerSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_demo_customer_can_sign_in_with_password_and_sees_three_rides(): void
    {
        $this->seed(DatabaseSeeder::class);
        putenv('DEMO_CUSTOMER_PASSWORD=Test-only-Pass-2026');
        $_ENV['DEMO_CUSTOMER_PASSWORD'] = 'Test-only-Pass-2026';
        $this->seed(DemoCustomerSeeder::class);
        $this->seed(DemoCustomerSeeder::class); // idempotent

        $login = $this->postJson('/api/v1/auth/login', ['email' => DemoCustomerSeeder::EMAIL, 'password' => 'Test-only-Pass-2026'])->assertOk();
        $token = $login->json('data.token');

        $rides = $this->getJson('/api/v1/customer/rides', ['Authorization' => 'Bearer '.$token])->assertOk();
        $this->assertCount(3, $rides->json('data.rides'));

        putenv('DEMO_CUSTOMER_PASSWORD');
        unset($_ENV['DEMO_CUSTOMER_PASSWORD']);
    }
}
