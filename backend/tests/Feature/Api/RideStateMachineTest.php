<?php

namespace Tests\Feature\Api;

use App\Models\RideRequest;
use App\Support\RideStateMachine;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\Support\CreatesStaff;
use Tests\TestCase;

class RideStateMachineTest extends TestCase
{
    use CreatesStaff, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    private function createRide(string $status = 'pending'): RideRequest
    {
        return RideRequest::create([
            'reference' => 'ARC-' . strtoupper(uniqid()),
            'request_type' => 'point_to_point',
            'service_type' => 'point_to_point',
            'first_name' => 'John',
            'last_name' => 'Doe',
            'email' => 'rider@example.com',
            'phone' => '7325550100',
            'status' => $status,
            'pickup_location' => '100 Main St, Newark, NJ',
            'dropoff_location' => 'JFK Airport, NY',
            'ride_date' => '2026-11-20',
            'ride_time' => '10:00',
        ]);
    }

    public function test_unit_rejects_completed_to_new(): void
    {
        $this->assertFalse(RideStateMachine::canTransition('completed', 'new'));
        $this->expectException(\InvalidArgumentException::class);
        RideStateMachine::assertTransition('completed', 'accepted');
    }

    public function test_dispatch_rejects_illegal_transition(): void
    {
        Mail::fake();
        [, $headers] = $this->actingAsRole('super_admin');
        $ride = $this->createRide('completed');

        $this->withHeaders($headers)
            ->putJson('/api/v1/admin/rides/' . $ride->id, ['status' => 'pending'])
            ->assertStatus(422)
            ->assertJsonPath('error.code', 'ILLEGAL_STATUS_TRANSITION');
    }

    public function test_dispatch_allows_pending_to_broadcast(): void
    {
        Mail::fake();
        [, $headers] = $this->actingAsRole('super_admin');
        $ride = $this->createRide('pending');

        $this->withHeaders($headers)
            ->putJson('/api/v1/admin/rides/' . $ride->id, ['status' => 'broadcast'])
            ->assertOk();

        $this->assertSame('broadcast', $ride->fresh()->status);
    }
}
