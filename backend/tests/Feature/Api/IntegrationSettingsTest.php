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
        $this->assertStringNotContainsString('super-secret-server-key', json_encode($settings));
        $this->assertSame('••••5678', $settings['stripe_secret_key']);
        $this->assertSame('••••9999', $settings['stripe_webhook_secret']);
    }

    public function test_public_config_never_leaks_secrets(): void
    {
        IntegrationSetting::current()->update([
            'google_maps_browser_key' => 'browser-key-public',
            'google_maps_server_key' => 'server-secret',
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
                'stripe_publishable_key' => 'pk_live_123',
                'payment_provider' => 'stripe',
            ],
        ]);
        $body = $response->getContent();
        $this->assertStringNotContainsString('sk_live', $body);
        $this->assertStringNotContainsString('whsec', $body);
        $this->assertStringNotContainsString('server-secret', $body);
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