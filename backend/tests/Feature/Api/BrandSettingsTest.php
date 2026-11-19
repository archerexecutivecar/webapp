<?php

namespace Tests\Feature\Api;

use App\Models\SiteContent;
use Database\Seeders\SiteContentSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\CreatesStaff;
use Tests\TestCase;

class BrandSettingsTest extends TestCase
{
    use CreatesStaff, RefreshDatabase;

    public function test_public_brand_uses_defaults_when_nothing_is_saved(): void
    {
        $this->getJson('/api/v1/brand')
            ->assertOk()
            ->assertJsonPath('data.brand_name', 'ARCHER EXECUTIVE')
            ->assertJsonPath('data.email', 'info@archerexecutivecar.com')
            ->assertJsonPath('data.logo_url', null)
            ->assertJsonMissingPath('data.social');
    }

    public function test_settings_manager_saves_brand_without_wiping_other_site_settings(): void
    {
        $this->seed(SiteContentSeeder::class);
        [, $headers] = $this->actingAsRole('operations_manager');

        $payload = [
            'brand_name' => 'Archer Executive Car',
            'legal_name' => 'Archer Enterprises LLC',
            'tagline' => 'Private transportation',
            'logo_url' => 'https://cdn.example.com/archer-logo.png',
            'phone' => '(848) 555-0100',
            'phone_tel' => '+18485550100',
            'phone_secondary' => '',
            'email' => 'desk@archerexecutivecar.com',
            'address' => ['100 Main Street', 'Oceanport, NJ 07757'],
        ];

        $this->putJson('/api/v1/admin/brand-settings', $payload, $headers)
            ->assertOk()
            ->assertJsonPath('data.brand.brand_name', 'Archer Executive Car')
            ->assertJsonPath('data.brand.phone_secondary', null);

        $public = $this->getJson('/api/v1/brand')->assertOk()->json('data');
        $this->assertSame('Archer Executive Car', $public['brand_name']);
        $this->assertSame('https://cdn.example.com/archer-logo.png', $public['logo_url']);
        $this->assertSame('desk@archerexecutivecar.com', $public['email']);
        $this->assertSame(['100 Main Street', 'Oceanport, NJ 07757'], $public['address']);

        $stored = SiteContent::find('settings')->data;
        $this->assertSame('Archer Executive Car', $stored['brand_name']);
        $this->assertNotEmpty($stored['social']['instagram']);
        $this->assertTrue($stored['apps_coming_soon']);
        $this->assertSame('(848) 555-0100', $this->getJson('/api/v1/site')->json('data.settings.phone'));
        $this->assertDatabaseHas('audit_logs', ['event' => 'brand.settings.updated']);
    }

    public function test_brand_edits_require_settings_permission_and_valid_contact_fields(): void
    {
        $this->seed(SiteContentSeeder::class);

        $this->putJson('/api/v1/admin/brand-settings', [])->assertUnauthorized();

        [, $editor] = $this->actingAsRole('content_editor');
        $this->putJson('/api/v1/admin/brand-settings', $this->validPayload(), $editor)->assertForbidden();

        [, $ops] = $this->actingAsRole('operations_manager');
        $this->putJson('/api/v1/admin/brand-settings', ['brand_name' => 'X'], $ops)->assertUnprocessable();
        $bad = $this->validPayload();
        $bad['email'] = 'not-an-email';
        $bad['logo_url'] = 'not-a-url';
        $this->putJson('/api/v1/admin/brand-settings', $bad, $ops)
            ->assertUnprocessable()
            ->assertJsonPath('error.code', 'VALIDATION_FAILED')
            ->assertJsonStructure(['error' => ['details' => ['email', 'logo_url']]]);
    }

    public function test_settings_manager_can_read_the_saved_brand(): void
    {
        $this->seed(SiteContentSeeder::class);
        [, $headers] = $this->actingAsRole('super_admin');

        $this->getJson('/api/v1/admin/brand-settings', $headers)
            ->assertOk()
            ->assertJsonPath('data.brand.brand_name', 'ARCHER EXECUTIVE')
            ->assertJsonPath('data.brand.phone', '(848) 231-9997');
    }

    private function validPayload(): array
    {
        return [
            'brand_name' => 'ARCHER EXECUTIVE',
            'legal_name' => 'Archer Enterprises LLC',
            'tagline' => 'TRANSPORTATION & SECURITY SPECIALISTS',
            'logo_url' => null,
            'phone' => '(848) 231-9997',
            'phone_tel' => '+18482319997',
            'phone_secondary' => '(732) 757-3232',
            'email' => 'info@archerexecutivecar.com',
            'address' => ['1000 Sanger Avenue'],
        ];
    }
}
