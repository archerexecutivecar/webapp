<?php

namespace Tests\Feature\Api;

use App\Models\Driver;
use Database\Seeders\SiteContentSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\CreatesStaff;
use Tests\TestCase;

/** Drivers use Website Tiers (kind = driver) as their tier; the old Driver Tiers list is retired. */
class DriverWebsiteTierTest extends TestCase
{
    use CreatesStaff, RefreshDatabase;

    public function test_driver_tier_must_be_a_website_driver_tier_and_shows_its_name(): void
    {
        [, $ops] = $this->actingAsRole('operations_manager');
        $this->seed(SiteContentSeeder::class);

        $this->postJson('/api/v1/admin/drivers', ['name' => 'Jordan Reyes', 'service_tier' => 9], $ops)->assertUnprocessable();

        $res = $this->postJson('/api/v1/admin/drivers', ['name' => 'Jordan Reyes', 'service_tier' => 2], $ops)->assertCreated();
        $res->assertJsonPath('data.driver.service_tier', 2)
            ->assertJsonPath('data.driver.tier.name', 'TIER 2 · EXECUTIVE');

        $id = $res->json('data.driver.id');
        $this->putJson("/api/v1/admin/drivers/{$id}", ['service_tier' => 3], $ops)->assertOk()
            ->assertJsonPath('data.driver.tier.name', 'TIER 3 · ELITE');
        $this->assertSame(3, Driver::find($id)->service_tier);
    }

    public function test_retired_catalog_apis_are_gone(): void
    {
        [, $ops] = $this->actingAsRole('super_admin');

        foreach (['/api/v1/admin/tiers', '/api/v1/admin/services', '/api/v1/admin/security-addons', '/api/v1/admin/vehicles'] as $url) {
            $this->getJson($url, $ops)->assertNotFound();
        }
    }

    public function test_booking_options_come_from_the_website_catalog(): void
    {
        $this->seed(SiteContentSeeder::class);
        $this->seed(\Database\Seeders\DatabaseSeeder::class);

        $res = $this->getJson('/api/v1/booking-options')->assertOk();
        $this->assertContains('hourly', array_column($res->json('data.services'), 'slug'));
        $this->assertCount(4, $res->json('data.tiers'));
        $this->assertCount(4, $res->json('data.security_addons'));
    }
}
