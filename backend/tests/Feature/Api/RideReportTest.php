<?php

namespace Tests\Feature\Api;

use App\Models\Driver;
use App\Models\RideRequest;
use App\Models\RideStatusHistory;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\CreatesStaff;
use Tests\TestCase;

class RideReportTest extends TestCase
{
    use CreatesStaff, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    public function test_ride_lifecycle_timestamps_and_status_history_are_recorded(): void
    {
        $driver = Driver::create(['name' => 'Marcus Vance', 'is_active' => true]);

        $ride = RideRequest::create([
            'reference' => 'ARC-RPT1',
            'request_type' => 'point_to_point',
            'service_type' => 'point_to_point',
            'first_name' => 'Elena',
            'last_name' => 'rostova',
            'email' => 'elena@example.com',
            'phone' => '8485550101',
            'pickup_location' => 'Manhattan',
            'dropoff_location' => 'JFK',
            'ride_date' => '2026-12-10',
            'ride_time' => '15:00',
            'status' => 'pending',
        ]);

        $this->assertNotNull($ride->scheduled_at);
        $this->assertNull($ride->accepted_at);
        $this->assertDatabaseHas('ride_status_histories', [
            'ride_request_id' => $ride->id,
            'from_status' => null,
            'to_status' => 'pending',
        ]);

        $ride->update(['status' => 'dispatched', 'assigned_driver_id' => $driver->id]);
        $ride->refresh();
        $this->assertNotNull($ride->accepted_at);
        $this->assertNull($ride->completed_at);

        $ride->update(['status' => 'completed']);
        $ride->refresh();
        $this->assertNotNull($ride->completed_at);

        $history = RideStatusHistory::where('ride_request_id', $ride->id)->orderBy('id')->get();
        $this->assertCount(3, $history);
        $this->assertSame(['pending', 'dispatched', 'completed'], $history->pluck('to_status')->all());
    }

    public function test_admin_can_filter_ride_reports_and_export_csv(): void
    {
        $driver = Driver::create(['name' => 'Julian Cole', 'is_active' => true]);

        $completedRide = RideRequest::create([
            'reference' => 'ARC-COMP1',
            'request_type' => 'hourly',
            'service_type' => 'hourly',
            'first_name' => 'Liam',
            'phone' => '8485550102',
            'ride_date' => '2026-12-05',
            'ride_time' => '10:00',
            'status' => 'pending',
        ]);
        $completedRide->update(['status' => 'dispatched', 'assigned_driver_id' => $driver->id]);
        $completedRide->update(['status' => 'completed']);

        $cancelledRide = RideRequest::create([
            'reference' => 'ARC-CANC1',
            'request_type' => 'airport',
            'service_type' => 'airport',
            'first_name' => 'Noah',
            'phone' => '8485550103',
            'ride_date' => '2026-12-06',
            'ride_time' => '12:00',
            'status' => 'pending',
        ]);
        $cancelledRide->update(['status' => 'cancelled']);

        $acceptedRide = RideRequest::create([
            'reference' => 'ARC-ACC1',
            'request_type' => 'point_to_point',
            'service_type' => 'point_to_point',
            'first_name' => 'Olivia',
            'phone' => '8485550104',
            'ride_date' => '2026-12-07',
            'ride_time' => '18:00',
            'status' => 'dispatched',
            'assigned_driver_id' => $driver->id,
        ]);

        [, $ops] = $this->actingAsRole('operations_manager');

        $all = $this->getJson('/api/v1/admin/reports/rides', $ops)->assertOk();
        $all->assertJsonPath('data.summary.total', 3)
            ->assertJsonPath('data.summary.accepted', 1)
            ->assertJsonPath('data.summary.completed', 1)
            ->assertJsonPath('data.summary.cancelled', 1);

        $onlyCancelled = $this->getJson('/api/v1/admin/reports/rides?status=cancelled', $ops)->assertOk();
        $this->assertCount(1, $onlyCancelled->json('data.rides.data'));
        $this->assertSame('ARC-CANC1', $onlyCancelled->json('data.rides.data.0.reference'));

        $search = $this->getJson('/api/v1/admin/reports/rides?search=ARC-COMP1', $ops)->assertOk();
        $this->assertCount(1, $search->json('data.rides.data'));
        $this->assertCount(3, $search->json('data.rides.data.0.status_histories'));

        $export = $this->get('/api/v1/admin/reports/rides/export?status=completed', $ops);
        $export->assertOk();
        $this->assertStringContainsString('text/csv', (string) $export->headers->get('Content-Type'));
        $csv = $export->streamedContent();
        $this->assertStringContainsString('ARC-COMP1', $csv);
        $this->assertStringNotContainsString('ARC-CANC1', $csv);
    }
}
