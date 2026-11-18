<?php

namespace Tests\Feature\Api;

use App\Models\Driver;
use Database\Seeders\SiteContentSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\CreatesStaff;
use Tests\TestCase;

class AdminDriverOperatingModesTest extends TestCase
{
    use CreatesStaff, RefreshDatabase;

    public function test_driver_store_persists_operating_modes(): void
    {
        [, $h] = $this->actingAsRole('super_admin');
        $this->seed(SiteContentSeeder::class);

        $response = $this->postJson('/api/v1/admin/drivers', [
            'name' => 'Marcus Vance',
            'service_tier' => 2,
            'is_active' => true,
            'is_fleet_operator' => true,
            'is_client_car_operator' => true,
            'is_owner_operator' => false,
        ], $h);

        $response->assertCreated();
        $response->assertJsonPath('data.driver.name', 'Marcus Vance');
        $response->assertJsonPath('data.driver.is_fleet_operator', true);
        $response->assertJsonPath('data.driver.is_client_car_operator', true);
        $response->assertJsonPath('data.driver.is_owner_operator', false);

        $driver = Driver::findOrFail($response->json('data.driver.id'));
        $this->assertTrue($driver->is_fleet_operator);
        $this->assertSame(2, $driver->service_tier);
    }

    public function test_driver_index_returns_operating_modes_and_balance(): void
    {
        [, $h] = $this->actingAsRole('super_admin');

        Driver::create([
            'name' => 'Paul Malesky',
            'email' => 'paul@example.com',
            'phone' => '(732) 555-0141',
            'service_tier' => 3,
            'is_active' => true,
            'is_fleet_operator' => true,
            'is_client_car_operator' => true,
            'is_owner_operator' => true,
        ]);

        $response = $this->getJson('/api/v1/admin/drivers', $h);

        $response->assertOk();
        $response->assertJsonPath('data.drivers.0.name', 'Paul Malesky');
        $response->assertJsonPath('data.drivers.0.is_fleet_operator', true);
        $response->assertJsonPath('data.drivers.0.is_client_car_operator', true);
        $response->assertJsonPath('data.drivers.0.is_owner_operator', true);
        $response->assertJsonPath('data.drivers.0.weekly_balance', 424.50);
    }

    public function test_driver_show_returns_full_profile_and_operating_vehicle(): void
    {
        [, $h] = $this->actingAsRole('super_admin');

        $driver = Driver::create([
            'name' => 'Paul Malesky',
            'email' => 'paul@example.com',
            'phone' => '(732) 555-0141',
            'service_tier' => 3,
            'is_active' => true,
            'is_fleet_operator' => true,
            'is_client_car_operator' => true,
            'is_owner_operator' => true,
            'owner_vehicle_model' => '2022 Chevrolet Suburban',
            'owner_vehicle_plate' => 'NJ PLM-221',
            'owner_vehicle_inspected' => true,
        ]);

        $response = $this->getJson("/api/v1/admin/drivers/{$driver->id}", $h);

        $response->assertOk();
        $response->assertJsonPath('data.driver.name', 'Paul Malesky');
        $response->assertJsonPath('data.driver.owner_vehicle_model', '2022 Chevrolet Suburban');
        $response->assertJsonPath('data.driver.owner_vehicle_plate', 'NJ PLM-221');
        $response->assertJsonPath('data.driver.pay_week.net_balance', 424.50);
        $response->assertJsonPath('data.driver.active_ride.reference', 'AR-1048');
    }

    public function test_driver_update_mutates_operating_switches_and_vehicle(): void
    {
        [, $h] = $this->actingAsRole('super_admin');

        $driver = Driver::create([
            'name' => 'Paul Malesky',
            'email' => 'paul@example.com',
            'service_tier' => 3,
            'is_active' => true,
        ]);

        $response = $this->putJson("/api/v1/admin/drivers/{$driver->id}", [
            'name' => 'Paul Malesky Updated',
            'is_fleet_operator' => true,
            'is_client_car_operator' => false,
            'is_owner_operator' => true,
            'owner_vehicle_model' => '2023 Cadillac Escalade',
            'owner_vehicle_plate' => 'NJ CAD-999',
            'owner_vehicle_inspected' => true,
        ], $h);

        $response->assertOk();
        $driver->refresh();
        $this->assertEquals('Paul Malesky Updated', $driver->name);
        $this->assertTrue($driver->is_fleet_operator);
        $this->assertFalse($driver->is_client_car_operator);
        $this->assertTrue($driver->is_owner_operator);
        $this->assertEquals('2023 Cadillac Escalade', $driver->owner_vehicle_model);
        $this->assertEquals('NJ CAD-999', $driver->owner_vehicle_plate);
        $this->assertTrue($driver->owner_vehicle_inspected);
    }
}
