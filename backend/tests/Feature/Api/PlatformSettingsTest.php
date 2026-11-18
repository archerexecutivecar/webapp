<?php

namespace Tests\Feature\Api;

use App\Models\PlatformSetting;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\CreatesStaff;
use Tests\TestCase;

class PlatformSettingsTest extends TestCase
{
    use RefreshDatabase, CreatesStaff;

    public function test_admin_can_view_platform_settings(): void
    {
        [$user, $headers] = $this->actingAsRole('super_admin');

        $response = $this->withHeaders($headers)->getJson('/api/v1/admin/platform-settings');

        $response->assertOk();
        $response->assertJsonStructure([
            'data' => [
                'settings' => [
                    'min_booking_notice_hours',
                    'unaccepted_alert_hours',
                    'cancellation_window_hours',
                    'customer_notice_channel',
                    'driver_btn_step1',
                    'driver_btn_step2',
                    'driver_btn_step3',
                    'driver_btn_step4',
                ],
            ],
        ]);

        $this->assertEquals(48, $response->json('data.settings.min_booking_notice_hours'));
        $this->assertEquals('On my way', $response->json('data.settings.driver_btn_step1'));
    }

    public function test_admin_can_update_platform_settings(): void
    {
        [$user, $headers] = $this->actingAsRole('super_admin');

        $payload = [
            'min_booking_notice_hours' => 72,
            'unaccepted_alert_hours' => 12,
            'cancellation_window_hours' => 48,
            'customer_notice_channel' => 'SMS only',
            'driver_btn_step1' => 'En Route',
            'driver_btn_step2' => 'Arrived Outside',
            'driver_btn_step3' => 'Passenger Onboard',
            'driver_btn_step4' => 'Drop-off Complete',
        ];

        $response = $this->withHeaders($headers)->putJson('/api/v1/admin/platform-settings', $payload);

        $response->assertOk();
        $this->assertDatabaseHas('platform_settings', [
            'min_booking_notice_hours' => 72,
            'driver_btn_step1' => 'En Route',
        ]);
        $this->assertDatabaseHas('audit_logs', [
            'event' => 'platform_settings.updated',
        ]);
    }
}
