<?php

namespace Tests\Feature\Api;

use App\Models\IntegrationSetting;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\CreatesStaff;
use Tests\TestCase;

class IntegrationSettingsTest extends TestCase
{
    use CreatesStaff, RefreshDatabase;

    public function test_integrations_show_requires_auth(): void
    {
        $this->getJson('/api/v1/admin/integrations')->assertStatus(401);
    }

    public function test_admin_sees_masked_secrets_not_raw_values(): void
    {
        [, $headers] = $this->actingAsRole('super_admin');

        IntegrationSetting::current()->update([
            'google_maps_browser_key' => 'browser-key-public',
            'google_maps_server_key' => 'super-secret-server-key-1234',
            'google_maps_country_codes' => 'us',
            'stripe_publishable_key' => 'pk_test_abc',
            'stripe_secret_key' => 'sk_test_supersecret5678',
            'stripe_webhook_secret' => 'whsec_testhook9999',
            'payment_provider' => 'stripe',
        ]);

        $response = $this->withHeaders($headers)->getJson('/api/v1/admin/integrations');

        $response->assertOk();
        $settings = $response->json('data.settings');

        $this->assertSame('browser-key-public', $settings['google_maps_browser_key']);
        $this->assertSame('••••1234', $settings['google_maps_server_key']);
        $this->assertTrue($settings['google_maps_server_key_configured']);
        $this->assertSame('us', $settings['google_maps_country_codes']);
        $this->assertStringNotContainsString('super-secret-server-key', json_encode($settings));
        $this->assertSame('••••5678', $settings['stripe_secret_key']);
        $this->assertSame('••••9999', $settings['stripe_webhook_secret']);
    }

    public function test_public_config_never_leaks_secrets(): void
    {
        IntegrationSetting::current()->update([
            'google_maps_browser_key' => 'browser-key-public',
            'google_maps_server_key' => 'server-secret',
            'google_maps_country_codes' => 'us',
            'stripe_publishable_key' => 'pk_live_123',
            'stripe_secret_key' => 'sk_live_secret',
            'stripe_webhook_secret' => 'whsec_x',
            'payment_provider' => 'stripe',
        ]);

        $response = $this->getJson('/api/v1/integrations/public');

        $response->assertOk();
        $response->assertExactJson([
            'data' => [
                'google_maps_browser_key' => 'browser-key-public',
                'google_maps_country_codes' => ['us'],
                'google_maps_service_area' => [
                    'label' => null,
                    'center_lat' => null,
                    'center_lng' => null,
                    'radius_km' => null,
                    'strict_bounds' => false,
                ],
                'stripe_publishable_key' => 'pk_live_123',
                'payment_provider' => 'stripe',
            ],
        ]);
        $body = $response->getContent();
        $this->assertStringNotContainsString('sk_live', $body);
        $this->assertStringNotContainsString('whsec', $body);
        $this->assertStringNotContainsString('server-secret', $body);
    }

    public function test_admin_can_configure_google_maps_restrictions(): void
    {
        [, $headers] = $this->actingAsRole('super_admin');

        $response = $this->withHeaders($headers)->putJson('/api/v1/admin/integrations', [
            'google_maps_browser_key' => 'AIzaSyTest123',
            'google_maps_country_codes' => 'us,ae',
            'google_maps_service_area_label' => 'Greater Los Angeles',
            'google_maps_center_lat' => 34.0522,
            'google_maps_center_lng' => -118.2437,
            'google_maps_radius_km' => 80,
            'google_maps_strict_bounds' => true,
        ]);

        $response->assertOk();
        $fresh = IntegrationSetting::current()->fresh();
        $this->assertSame('us,ae', $fresh->google_maps_country_codes);
        $this->assertSame('Greater Los Angeles', $fresh->google_maps_service_area_label);
        $this->assertEquals(34.0522, $fresh->google_maps_center_lat);
        $this->assertEquals(-118.2437, $fresh->google_maps_center_lng);
        $this->assertSame(80, $fresh->google_maps_radius_km);
        $this->assertTrue($fresh->google_maps_strict_bounds);

        $public = $this->getJson('/api/v1/integrations/public');
        $public->assertOk();
        $this->assertSame(['us', 'ae'], $public->json('data.google_maps_country_codes'));
        $this->assertSame('Greater Los Angeles', $public->json('data.google_maps_service_area.label'));
        $this->assertTrue($public->json('data.google_maps_service_area.strict_bounds'));
    }

    public function test_update_persists_publishable_fields_and_write_only_secrets(): void
    {
        [, $headers] = $this->actingAsRole('super_admin');
        $row = IntegrationSetting::current();
        $row->update(['stripe_secret_key' => 'sk_original_secretkey']);

        $response = $this->withHeaders($headers)->putJson('/api/v1/admin/integrations', [
            'stripe_publishable_key' => 'pk_new',
            'stripe_secret_key' => '••••rtkey',
            'sms_provider' => 'twilio',
        ]);

        $response->assertOk();
        $fresh = IntegrationSetting::current()->fresh();
        $this->assertSame('pk_new', $fresh->stripe_publishable_key);
        $this->assertSame('twilio', $fresh->sms_provider);
        $this->assertSame('sk_original_secretkey', $fresh->stripe_secret_key);

        $this->withHeaders($headers)->putJson('/api/v1/admin/integrations', [
            'stripe_secret_key' => 'sk_replaced_newone12',
        ]);

        $this->assertSame('sk_replaced_newone12', IntegrationSetting::current()->fresh()->stripe_secret_key);
        $this->assertDatabaseHas('audit_logs', ['event' => 'integration_settings.updated']);
    }
}
