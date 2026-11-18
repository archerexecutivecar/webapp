<?php

namespace Tests\Feature\Api;

use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\CreatesStaff;
use Tests\TestCase;

class DriverPortalPreviewTest extends TestCase
{
    use CreatesStaff, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    public function test_driver_role_without_driver_row_gets_404_when_preview_disabled(): void
    {
        config(['archer.allow_driver_preview' => false]);

        // Driver role has driver.portal but no linked drivers table row.
        [, $headers] = $this->actingAsRole('driver');

        $this->withHeaders($headers)
            ->getJson('/api/v1/driver/profile')
            ->assertStatus(404)
            ->assertJsonPath('error.code', 'DRIVER_NOT_FOUND');
    }

    public function test_dispatcher_without_driver_portal_permission_gets_403(): void
    {
        config(['archer.allow_driver_preview' => false]);
        [, $headers] = $this->actingAsRole('dispatcher');

        $this->withHeaders($headers)
            ->getJson('/api/v1/driver/profile')
            ->assertStatus(403);
    }
}
