<?php

namespace Tests\Feature\Api;

use App\Models\Vehicle;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\CreatesStaff;
use Tests\TestCase;

class FleetScheduleTest extends TestCase
{
    use CreatesStaff, RefreshDatabase;

    public function test_fleet_manager_gets_schedule_and_counters(): void
    {
        [, $h] = $this->actingAsRole('super_admin');

        $response = $this->getJson('/api/v1/admin/fleet/schedule?date=2026-11-18', $h);

        $response->assertOk();
        $response->assertJsonStructure([
            'data' => [
                'counters' => [
                    'cadillac_escalade',
                    'chevrolet_suburban',
                    'chevrolet_traverse',
                    'lincoln_aviator',
                ],
                'vehicles',
                'timeline' => [
                    'date',
                    'tracks',
                ],
            ],
        ]);

        $this->assertEquals(2, $response->json('data.counters.cadillac_escalade.free'));
        $this->assertEquals(0, $response->json('data.counters.chevrolet_traverse.free'));
        $this->assertCount(5, $response->json('data.vehicles'));
    }

    public function test_fleet_manager_can_create_blockout(): void
    {
        [, $h] = $this->actingAsRole('super_admin');

        $this->getJson('/api/v1/admin/fleet/schedule', $h);
        $vehicle = Vehicle::first();

        $response = $this->postJson('/api/v1/admin/fleet/blockout', [
            'vehicle_id' => (string) $vehicle->id,
            'start_at' => '2026-11-20 08:00:00',
            'end_at' => '2026-11-20 12:00:00',
            'reason' => 'Scheduled 50k mile service & detailing',
        ], $h);

        $response->assertCreated();
        $this->assertDatabaseHas('vehicle_blockouts', [
            'vehicle_id' => (string) $vehicle->id,
            'reason' => 'Scheduled 50k mile service & detailing',
        ]);
        $this->assertDatabaseHas('audit_logs', [
            'event' => 'vehicle.blockout.created',
        ]);
    }

    public function test_fleet_manager_can_toggle_out_of_service(): void
    {
        [, $h] = $this->actingAsRole('super_admin');

        $this->getJson('/api/v1/admin/fleet/schedule', $h);
        $vehicle = Vehicle::first();

        $response = $this->putJson("/api/v1/admin/fleet/vehicles/{$vehicle->id}", [
            'is_out_of_service' => true,
        ], $h);

        $response->assertOk();
        $vehicle->refresh();
        $this->assertTrue($vehicle->is_out_of_service);
    }
}
