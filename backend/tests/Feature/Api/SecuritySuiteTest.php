<?php

namespace Tests\Feature\Api;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\Support\CreatesStaff;
use Tests\TestCase;

class SecuritySuiteTest extends TestCase
{
    use RefreshDatabase, CreatesStaff;

    public function test_staff_can_view_security_leads_and_update_status(): void
    {
        [$user, $headers] = $this->actingAsRole('super_admin');

        $response = $this->withHeaders($headers)->getJson('/api/v1/admin/security/leads');

        $response->assertOk();
        $response->assertJsonStructure([
            'data' => [
                'leads',
                'new_count',
            ],
        ]);

        $lead = DB::table('security_leads')->first();
        $updateResponse = $this->withHeaders($headers)->putJson("/api/v1/admin/security/leads/{$lead->id}/status", [
            'status' => 'contacted',
        ]);

        $updateResponse->assertOk();
        $this->assertEquals('contacted', DB::table('security_leads')->where('id', $lead->id)->value('status'));
    }

    public function test_staff_can_view_shifts_and_create_contracts(): void
    {
        [$user, $headers] = $this->actingAsRole('super_admin');

        $response = $this->withHeaders($headers)->getJson('/api/v1/admin/security/contracts');

        $response->assertOk();
        $response->assertJsonStructure([
            'data' => [
                'shifts',
                'drivers',
                'unclaimed_urgent_count',
            ],
        ]);

        $payload = [
            'client_name' => 'Highland Manor Gala',
            'contact_name' => 'David Stern',
            'site_address' => '100 Manor Lane, Rumson, NJ',
            'tier' => 'T3',
            'headcount' => 2,
            'start_date' => '2026-11-25',
            'length_days' => 3,
            'start_time' => '18:00',
            'hours_per_shift' => 6,
            'days_of_week' => ['Wed', 'Thu', 'Fri'],
            'is_event_critical' => true,
        ];

        $createResponse = $this->withHeaders($headers)->postJson('/api/v1/admin/security/contracts', $payload);

        $createResponse->assertCreated();
        $this->assertDatabaseHas('security_contracts', [
            'client_name' => 'Highland Manor Gala',
            'tier' => 'T3',
        ]);
    }

    public function test_staff_can_manage_swaps_and_announcements(): void
    {
        [$user, $headers] = $this->actingAsRole('super_admin');

        // Swaps
        $swapResponse = $this->withHeaders($headers)->getJson('/api/v1/admin/security/swaps');
        $swapResponse->assertOk();

        $swap = DB::table('security_swaps')->first();
        if ($swap) {
            $decisionResponse = $this->withHeaders($headers)->postJson("/api/v1/admin/security/swaps/{$swap->id}/decision", [
                'decision' => 'approve',
            ]);
            $decisionResponse->assertOk();
            $this->assertEquals('approved', DB::table('security_swaps')->where('id', $swap->id)->value('status'));
        }

        // Announcements
        $announcementResponse = $this->withHeaders($headers)->postJson('/api/v1/admin/security/announcements', [
            'message' => 'Winter storm protocol: Ensure tire chains are mounted.',
        ]);
        $announcementResponse->assertCreated();
        $this->assertDatabaseHas('security_announcements', [
            'message' => 'Winter storm protocol: Ensure tire chains are mounted.',
        ]);
    }
}
