<?php

namespace Tests\Feature\Api;

use App\Models\RideRequest;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Tests\Support\CreatesStaff;
use Tests\TestCase;

class AdminRideDispatchStatusTest extends TestCase
{
    use CreatesStaff, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    private function createRide(string $email = 'rider@example.com', ?int $customerId = null): RideRequest
    {
        return RideRequest::create([
            'reference' => 'ARC-' . strtoupper(uniqid()),
            'request_type' => 'point_to_point',
            'service_type' => 'point_to_point',
            'first_name' => 'John',
            'last_name' => 'Doe',
            'email' => $email,
            'phone' => '7325550100',
            'customer_id' => $customerId,
            'status' => 'pending',
            'pickup_location' => '100 Main St, Newark, NJ',
            'dropoff_location' => 'JFK Airport, NY',
            'ride_date' => '2026-11-20',
            'ride_time' => '10:00',
        ]);
    }

    public function test_dispatcher_can_update_ride_status_with_standard_json(): void
    {
        Mail::fake();
        [, $headers] = $this->actingAsRole('dispatcher');
        $ride = $this->createRide('test1@example.com');

        $this->assertSame('pending', $ride->status);

        $res = $this->putJson("/api/v1/admin/rides/{$ride->id}", [
            'status' => 'in_progress',
            'assigned_driver_id' => null,
            'dispatch_notes' => null,
        ], $headers);

        $res->assertOk();
        $this->assertSame('in_progress', $res->json('data.ride.status'));
        $this->assertSame('in_progress', $ride->fresh()->status);
    }

    public function test_dispatcher_can_update_ride_status_with_double_stringified_json(): void
    {
        Mail::fake();
        [, $headers] = $this->actingAsRole('dispatcher');
        $ride = $this->createRide('test2@example.com');

        $this->assertSame('pending', $ride->status);

        // Simulate client sending double-stringified payload
        $doubleJson = json_encode(json_encode([
            'status' => 'in_progress',
            'assigned_driver_id' => null,
            'dispatch_notes' => 'Testing note',
        ]));

        $headers['Content-Type'] = 'application/json';

        $res = $this->call('PUT', "/api/v1/admin/rides/{$ride->id}", [], [], [], $this->transformHeadersToServerVars($headers), $doubleJson);

        $res->assertStatus(200);
        $this->assertSame('in_progress', $ride->fresh()->status);
        $this->assertSame('Testing note', $ride->fresh()->dispatch_notes);
    }

    public function test_customer_portal_sees_updated_ride_status(): void
    {
        Mail::fake();
        [, $adminHeaders] = $this->actingAsRole('dispatcher');
        $email = 'customer@example.com';

        // Register customer
        $regRes = $this->postJson('/api/v1/customer/auth/register', [
            'name' => 'John Doe',
            'email' => $email,
            'phone' => '7325550100',
            'password' => 'Pass12345!',
            'password_confirmation' => 'Pass12345!',
        ])->assertCreated();

        $customerId = $regRes->json('data.user.id');
        $ride = $this->createRide($email, $customerId);

        $customerToken = $regRes->json('data.token');
        $customerHeaders = ['Authorization' => "Bearer {$customerToken}"];

        // Check customer rides initial status
        $custRides = $this->getJson('/api/v1/customer/rides', $customerHeaders)->assertOk();
        $this->assertSame('pending', $custRides->json('data.rides.0.status'));

        // Admin updates status to in_progress
        $this->putJson("/api/v1/admin/rides/{$ride->id}", [
            'status' => 'in_progress',
        ], $adminHeaders)->assertOk();

        // Customer sees in_progress
        $custRidesAfter = $this->getJson('/api/v1/customer/rides', $customerHeaders)->assertOk();
        $this->assertSame('in_progress', $custRidesAfter->json('data.rides.0.status'));
    }
}
