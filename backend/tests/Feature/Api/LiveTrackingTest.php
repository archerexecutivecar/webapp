<?php

namespace Tests\Feature\Api;

use App\Models\Driver;
use App\Models\RideRequest;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\CreatesStaff;
use Tests\TestCase;

class LiveTrackingTest extends TestCase
{
    use CreatesStaff, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    public function test_driver_can_update_live_location(): void
    {
        [$user, $headers] = $this->actingAsRole('driver');
        $driver = Driver::create([
            'user_id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'service_tier' => 2,
            'is_active' => true,
        ]);

        $response = $this->withHeaders($headers)->postJson('/api/v1/driver/location', [
            'lat' => 34.0522,
            'lng' => -118.2437,
            'heading' => 180.5,
            'speed' => 35.0,
        ]);

        $response->assertOk();
        $response->assertJsonPath('data.location.lat', 34.0522);
        $response->assertJsonPath('data.location.lng', -118.2437);
        $response->assertJsonPath('data.location.heading', 180.5);

        $driver->refresh();
        $this->assertEquals(34.0522, $driver->current_lat);
        $this->assertEquals(-118.2437, $driver->current_lng);
        $this->assertEquals(180.5, $driver->heading);
        $this->assertNotNull($driver->last_location_at);
    }

    public function test_customer_can_track_active_ride_with_driver_telemetry(): void
    {
        // 1. Create Driver with current location
        $driverUser = User::factory()->create();
        $driver = Driver::create([
            'user_id' => $driverUser->id,
            'name' => 'Alexander Hayes',
            'email' => $driverUser->email,
            'service_tier' => 2,
            'is_active' => true,
            'current_lat' => 34.0522,
            'current_lng' => -118.2437,
            'heading' => 90.0,
            'speed' => 25.0,
            'last_location_at' => now(),
        ]);

        // 2. Create Customer
        [$customerUser, $headers] = $this->actingAsRole('customer');

        // 3. Create active ride for this customer assigned to driver
        $ride = RideRequest::create([
            'reference' => 'AR-LIVE-1',
            'first_name' => 'John',
            'last_name' => 'Doe',
            'phone' => '3105550199',
            'email' => $customerUser->email,
            'customer_id' => $customerUser->id,
            'assigned_driver_id' => $driver->id,
            'status' => 'on_my_way',
            'service_type' => 'p2p',
            'vehicle' => 'sedan|first',
            'ride_date' => now()->toDateString(),
            'ride_time' => '14:00',
            'pickup_location' => '100 Beverly Hills Blvd, Beverly Hills, CA',
            'pickup_lat' => 34.0736,
            'pickup_lng' => -118.4004,
            'dropoff_location' => 'LAX Airport, Los Angeles, CA',
            'dropoff_lat' => 33.9416,
            'dropoff_lng' => -118.4085,
        ]);

        // 4. Request tracking
        $response = $this->withHeaders($headers)->getJson("/api/v1/customer/rides/{$ride->id}/tracking");

        $response->assertOk();
        $response->assertJsonPath('data.status', 'on_my_way');
        $response->assertJsonPath('data.is_live', true);
        $response->assertJsonPath('data.driver.name', 'Alexander Hayes');
        $response->assertJsonPath('data.driver.lat', 34.0522);
        $response->assertJsonPath('data.driver.lng', -118.2437);
        $response->assertJsonPath('data.pickup.lat', 34.0736);
        $response->assertJsonPath('data.pickup.lng', -118.4004);
        $this->assertNotNull($response->json('data.eta_minutes'));
    }

    public function test_driver_location_is_hidden_when_ride_is_not_active(): void
    {
        $driverUser = User::factory()->create();
        $driver = Driver::create([
            'user_id' => $driverUser->id,
            'name' => 'Alexander Hayes',
            'email' => $driverUser->email,
            'service_tier' => 2,
            'is_active' => true,
            'current_lat' => 34.0522,
            'current_lng' => -118.2437,
        ]);

        [$customerUser, $headers] = $this->actingAsRole('customer');

        // Completed ride
        $ride = RideRequest::create([
            'reference' => 'AR-PAST-1',
            'first_name' => 'John',
            'phone' => '3105550199',
            'customer_id' => $customerUser->id,
            'assigned_driver_id' => $driver->id,
            'status' => 'completed',
            'service_type' => 'p2p',
            'vehicle' => 'sedan|first',
            'ride_date' => now()->subDay()->toDateString(),
            'ride_time' => '14:00',
            'pickup_location' => '100 Main St',
        ]);

        $response = $this->withHeaders($headers)->getJson("/api/v1/customer/rides/{$ride->id}/tracking");

        $response->assertOk();
        $response->assertJsonPath('data.is_live', false);
        $this->assertNull($response->json('data.driver'));
    }

    public function test_another_customer_cannot_track_ride(): void
    {
        $owner = User::factory()->create();
        $ride = RideRequest::create([
            'reference' => 'AR-SECRET-1',
            'first_name' => 'Owner',
            'phone' => '3105550199',
            'customer_id' => $owner->id,
            'status' => 'on_my_way',
            'service_type' => 'p2p',
            'vehicle' => 'sedan|first',
            'ride_date' => now()->toDateString(),
            'ride_time' => '14:00',
            'pickup_location' => '100 Main St',
        ]);

        [, $otherCustomerHeaders] = $this->actingAsRole('customer');

        $response = $this->withHeaders($otherCustomerHeaders)->getJson("/api/v1/customer/rides/{$ride->id}/tracking");
        $response->assertNotFound();
    }
}
