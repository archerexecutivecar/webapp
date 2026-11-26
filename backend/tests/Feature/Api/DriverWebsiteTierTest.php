<?php

namespace Tests\Feature\Api;

use App\Models\Driver;
use App\Models\SiteTier;
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
            ->assertJsonPath('data.driver.eligible_tiers', [1, 2])
            ->assertJsonPath('data.driver.tier.name', 'TIER 2 · EXECUTIVE');

        $id = $res->json('data.driver.id');
        $this->putJson("/api/v1/admin/drivers/{$id}", ['service_tier' => 3], $ops)->assertOk()
            ->assertJsonPath('data.driver.eligible_tiers', [1, 2, 3])
            ->assertJsonPath('data.driver.tier.name', 'TIER 3 · ELITE');
        $this->assertSame(3, Driver::find($id)->service_tier);

        // Tier 1 driver cannot select Tier 2
        $tier1 = $this->postJson('/api/v1/admin/drivers', ['name' => 'Alex TierOne', 'service_tier' => 1], $ops)->assertCreated();
        $tier1->assertJsonPath('data.driver.eligible_tiers', [1]);
        $t1Id = $tier1->json('data.driver.id');

        $this->putJson("/api/v1/admin/drivers/{$t1Id}", [
            'service_tier' => 1,
            'eligible_tiers' => [1, 2],
        ], $ops)->assertUnprocessable();
    }

    public function test_a_tier_with_drivers_assigned_cannot_be_deleted(): void
    {
        [, $admin] = $this->actingAsRole('super_admin');
        $this->seed(SiteContentSeeder::class);
        $this->postJson('/api/v1/admin/drivers', ['name' => 'Jordan Reyes', 'service_tier' => 2], $admin)->assertCreated();

        $used = SiteTier::where(['kind' => 'driver', 'tier' => 2])->value('id');
        $this->deleteJson("/api/v1/admin/site-tiers/{$used}", [], $admin)->assertStatus(409)->assertJsonPath('error.code', 'TIER_IN_USE');
        $this->assertNotNull(SiteTier::find($used));

        // Security staffing tiers share numbers with chauffeur tiers but are not what drivers are assigned to.
        $security = SiteTier::where(['kind' => 'security', 'tier' => 2])->value('id');
        $this->deleteJson("/api/v1/admin/site-tiers/{$security}", [], $admin)->assertOk();
        $unused = SiteTier::where(['kind' => 'driver', 'tier' => 1])->value('id');
        $this->deleteJson("/api/v1/admin/site-tiers/{$unused}", [], $admin)->assertOk();
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
