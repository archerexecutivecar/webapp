<?php

namespace Tests\Feature\Api;

use App\Models\Driver;
use App\Models\RideRequest;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\Support\CreatesStaff;
use Tests\TestCase;

class AdminRideDispatchActionsTest extends TestCase
{
    use CreatesStaff, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    public function test_dispatcher_can_create_phone_booking(): void
    {
        Mail::fake();
        [, $headers] = $this->actingAsRole('dispatcher');

        $res = $this->postJson('/api/v1/admin/rides', [
            'first_name' => 'Grant',
            'last_name' => 'Whitfield',
            'phone' => '7325550108',
            'email' => 'grant@example.com',
            'service_type' => 'hourly',
            'driver_tier' => '1',
            'ride_date' => '2026-11-23',
            'ride_time' => '11:17',
            'vehicle' => 'Chevrolet Traverse',
            'pickup_location' => '5 Bellevue Ave, Rumson, NJ 07760',
            'dropoff_location' => 'Molly Pitcher Inn, Red Bank, NJ',
            'dispatch_notes' => 'Dinner, wait on site',
        ], $headers);

        $res->assertCreated();
        $this->assertNotNull($res->json('data.ride.id'));
        $this->assertStringStartsWith('AR-', $res->json('data.ride.reference'));
        $this->assertSame('phone', $res->json('data.ride.request_type'));
    }

    public function test_client_car_dispatch_blocks_if_agreement_not_signed(): void
    {
        Mail::fake();
        [, $headers] = $this->actingAsRole('dispatcher');

        $driver = Driver::create([
            'name' => 'Paul Malesky',
            'email' => 'paul.m@example.com',
            'phone' => '7325550141',
            'service_tier' => 1,
            'is_active' => true,
        ]);

        $ride = RideRequest::create([
            'reference' => 'AR-1054',
            'first_name' => 'Morgan',
            'last_name' => 'Hale',
            'phone' => '7325550199',
            'service_type' => 'client-car',
            'driver_tier' => '1',
            'ride_date' => '2026-11-23',
            'ride_time' => '11:15',
            'vehicle' => 'Client Car Service',
            'pickup_location' => '14 Riverside Dr, Rumson, NJ',
            'status' => 'pending',
            'details' => [
                'is_client_car_signed' => false,
            ],
        ]);

        // Attempt to assign driver while agreement is unsigned
        $res = $this->putJson("/api/v1/admin/rides/{$ride->id}", [
            'assigned_driver_id' => $driver->id,
            'status' => 'driver_assigned',
        ], $headers);

        $res->assertStatus(422);
        $this->assertSame('CLIENT_CAR_AGREEMENT_REQUIRED', $res->json('error.code'));

        // Now record agreement
        $recordRes = $this->postJson("/api/v1/admin/rides/{$ride->id}/record-agreement", [], $headers);
        $recordRes->assertOk();
        $this->assertTrue($recordRes->json('data.ride.details.is_client_car_signed'));

        // Now driver allocation succeeds
        $assignRes = $this->putJson("/api/v1/admin/rides/{$ride->id}", [
            'assigned_driver_id' => $driver->id,
            'status' => 'driver_assigned',
        ], $headers);

        $assignRes->assertOk();
        $this->assertSame($driver->id, $assignRes->json('data.ride.assigned_driver_id'));
    }

    public function test_dispatcher_can_broadcast_offer(): void
    {
        Mail::fake();
        [, $headers] = $this->actingAsRole('dispatcher');

        $ride = RideRequest::create([
            'reference' => 'AR-1052',
            'first_name' => 'Morgan',
            'last_name' => 'Hale',
            'phone' => '7325550199',
            'service_type' => 'point_to_point',
            'driver_tier' => '1',
            'ride_date' => '2026-11-22',
            'ride_time' => '11:51',
            'vehicle' => '1st Class SUV',
            'pickup_location' => '14 Riverside Dr, Rumson, NJ',
            'status' => 'pending',
        ]);

        $res = $this->postJson("/api/v1/admin/rides/{$ride->id}/broadcast", [], $headers);
        $res->assertOk();
        $this->assertSame('broadcast', $res->json('data.ride.status'));
    }
}
