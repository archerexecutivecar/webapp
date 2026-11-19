<?php

namespace Tests\Feature\Api;

use App\Models\Vehicle;
use App\Models\VehicleBlockout;
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
        $this->assertSame('SUV', $vehicle->category);
    }

    public function test_class_and_size_save_writes_the_booking_key_without_renaming_on_other_edits(): void
    {
        [, $h] = $this->actingAsRole('super_admin');
        $this->getJson('/api/v1/admin/fleet/schedule', $h);
        $vehicle = Vehicle::where('name', 'Chevrolet Suburban')->firstOrFail();
        $this->assertSame('exec|suv', $vehicle->form_value);

        $this->putJson("/api/v1/admin/fleet/vehicles/{$vehicle->id}", ['name' => 'Chevrolet Suburban'], $h)->assertOk();
        $vehicle->refresh();
        $this->assertSame('exec|suv', $vehicle->form_value);
        $this->assertSame('SUV', $vehicle->category);

        $this->putJson("/api/v1/admin/fleet/vehicles/{$vehicle->id}", [
            'class_type' => 'first',
            'size' => 'sedan',
            'passengers' => 3,
            'luggage' => 2,
        ], $h)->assertOk();
        $vehicle->refresh();
        $this->assertSame('first|sedan', $vehicle->form_value);
        $this->assertSame('Sedan / Compact SUV', $vehicle->category);
        $this->assertSame(3, $vehicle->passengers);
        $this->assertSame(2, $vehicle->luggage);
    }

    public function test_public_availability_follows_out_of_service_and_blockouts(): void
    {
        $escalade = Vehicle::create([
            'name' => 'Cadillac Escalade #9', 'slug' => 'escalade-9', 'class_type' => 'first', 'category' => 'SUV',
            'form_value' => 'first|suv', 'is_out_of_service' => true, 'is_active' => true,
        ]);
        $traverse = Vehicle::create([
            'name' => 'Chevrolet Traverse', 'slug' => 'traverse-test', 'class_type' => 'exec', 'category' => 'Compact SUV',
            'form_value' => 'exec|sedan', 'is_out_of_service' => false, 'is_active' => true,
            'available_from' => '00:00', 'available_until' => '23:59',
            'available_days' => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        ]);
        VehicleBlockout::create([
            'vehicle_id' => $traverse->id, 'vehicle_name' => $traverse->name,
            'start_at' => '2026-11-20 09:00:00', 'end_at' => '2026-11-20 13:00:00', 'reason' => 'Detailing',
        ]);

        $open = collect($this->getJson('/api/v1/fleet-availability')->assertOk()->json('data.options'));
        $this->assertFalse($open->firstWhere('vehicle_class', 'first')['available'] ?? true);
        $this->assertSame('Out of service', $open->first(fn ($r) => $r['vehicle_class'] === 'first' && $r['size'] === 'suv')['reason']);
        $this->assertTrue($open->first(fn ($r) => $r['vehicle_class'] === 'exec' && $r['size'] === 'sedan')['available']);

        $blocked = collect($this->getJson('/api/v1/fleet-availability?date=2026-11-20&time=10:00&hours=2')->assertOk()->json('data.options'));
        $row = $blocked->first(fn ($r) => $r['vehicle_class'] === 'exec' && $r['size'] === 'sedan');
        $this->assertFalse($row['available']);
        $this->assertSame('Not available at this time', $row['reason']);

        $this->assertNotNull($escalade->id);
    }
}
