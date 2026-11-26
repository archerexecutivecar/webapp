<?php

namespace Tests\Feature\Api;

use App\Models\CustomerNotice;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\Support\CreatesStaff;
use Tests\TestCase;

class CustomerNoticeTest extends TestCase
{
    use CreatesStaff, RefreshDatabase;

    public function test_dispatcher_lists_customer_notices(): void
    {
        [, $h] = $this->actingAsRole('dispatcher');

        CustomerNotice::create([
            'sent_at' => now(),
            'recipient_name' => 'Morgan Hale',
            'recipient_phone' => '+15550001111',
            'recipient_email' => 'morgan@example.com',
            'channel' => 'sms',
            'trigger' => 'allocated',
            'trigger_label' => 'Chauffeur Allocated',
            'ride_reference' => 'AR-1048',
            'message' => 'Your chauffeur has been allocated.',
            'status' => 'sent',
        ]);

        CustomerNotice::create([
            'sent_at' => now()->subMinute(),
            'recipient_name' => 'Grant Whitfield',
            'recipient_phone' => '+15550002222',
            'recipient_email' => 'grant@example.com',
            'channel' => 'sms',
            'trigger' => 'on_my_way',
            'trigger_label' => 'On My Way',
            'ride_reference' => 'AR-1047',
            'message' => 'Your chauffeur is on the way.',
            'status' => 'sent',
        ]);

        $response = $this->getJson('/api/v1/admin/notices', $h);

        $response->assertOk();
        $response->assertJsonStructure([
            'data' => [
                'notices' => [
                    '*' => [
                        'id',
                        'sent_at',
                        'sent_at_formatted',
                        'recipient_name',
                        'recipient_phone',
                        'recipient_email',
                        'channel',
                        'trigger',
                        'trigger_label',
                        'ride_reference',
                        'message',
                        'status',
                    ],
                ],
            ],
        ]);

        $notices = collect($response->json('data.notices'));
        $this->assertTrue($notices->contains('recipient_name', 'Morgan Hale'));
        $this->assertTrue($notices->contains('recipient_name', 'Grant Whitfield'));
        $this->assertTrue($notices->contains('trigger', 'allocated'));
        $this->assertTrue($notices->contains('trigger', 'on_my_way'));
    }

    public function test_filter_and_search_notices(): void
    {
        [, $h] = $this->actingAsRole('dispatcher');

        CustomerNotice::create([
            'sent_at' => now(),
            'recipient_name' => 'Morgan Hale',
            'recipient_phone' => '+15550001111',
            'channel' => 'sms',
            'trigger' => 'on_my_way',
            'trigger_label' => 'On My Way',
            'ride_reference' => 'AR-1048',
            'message' => 'On the way.',
            'status' => 'sent',
        ]);

        CustomerNotice::create([
            'sent_at' => now()->subMinute(),
            'recipient_name' => 'Grant Whitfield',
            'recipient_phone' => '+15550002222',
            'channel' => 'sms',
            'trigger' => 'allocated',
            'trigger_label' => 'Chauffeur Allocated',
            'ride_reference' => 'AR-1047',
            'message' => 'Allocated.',
            'status' => 'sent',
        ]);

        // Filter by trigger: on_my_way
        $filterRes = $this->getJson('/api/v1/admin/notices?trigger=on_my_way', $h)->assertOk();
        $filtered = collect($filterRes->json('data.notices'));
        $this->assertCount(1, $filtered);
        $this->assertTrue($filtered->every(fn ($n) => $n['trigger'] === 'on_my_way'));

        // Search by recipient: Morgan
        $searchRes = $this->getJson('/api/v1/admin/notices?search=Morgan', $h)->assertOk();
        $searched = collect($searchRes->json('data.notices'));
        $this->assertCount(1, $searched);
        $this->assertEquals('Morgan Hale', $searched->first()['recipient_name']);
    }

    public function test_dispatcher_can_log_notice(): void
    {
        [, $h] = $this->actingAsRole('dispatcher');

        $payload = [
            'ride_reference' => 'AR-1055',
            'recipient_name' => 'Lena Ortiz',
            'recipient_phone' => '(848) 555-0177',
            'channel' => 'SMS',
            'trigger' => 'on_my_way',
            'message' => 'Matthew Krywinski is on the way to 220 Ocean Ave.',
        ];

        $response = $this->postJson('/api/v1/admin/notices', $payload, $h);

        $response->assertCreated();
        $response->assertJsonPath('data.notice.recipient_name', 'Lena Ortiz');
        $response->assertJsonPath('data.notice.trigger_label', 'On my way');

        $this->assertDatabaseHas('customer_notices', [
            'ride_reference' => 'AR-1055',
            'recipient_name' => 'Lena Ortiz',
            'trigger' => 'on_my_way',
        ]);

        $this->assertDatabaseHas('audit_logs', [
            'event' => 'customer_notice.logged',
        ]);
    }

    public function test_store_accepts_admin_ui_sms_plus_email_payload_without_email(): void
    {
        [, $h] = $this->actingAsRole('dispatcher');

        // Mirrors apps/admin notices "Simulate notice" default payload (channel SMS + email, no recipient_email).
        $payload = [
            'recipient_name' => 'Morgan Hale',
            'recipient_phone' => '(732) 555-0199',
            'channel' => 'SMS + email',
            'trigger' => 'allocated',
            'ride_reference' => 'AR-1048',
            'message' => 'Your Archer ride AR-1048 is confirmed.',
        ];

        $this->postJson('/api/v1/admin/notices', $payload, $h)
            ->assertCreated()
            ->assertJsonPath('data.notice.channel', 'SMS + email')
            ->assertJsonPath('data.notice.status', 'logged');
    }

    public function test_store_returns_503_when_customer_notices_table_missing(): void
    {
        [, $h] = $this->actingAsRole('dispatcher');

        Schema::dropIfExists('customer_notices');

        $response = $this->postJson('/api/v1/admin/notices', [
            'recipient_name' => 'Lena Ortiz',
            'channel' => 'SMS',
            'trigger' => 'on_my_way',
            'message' => 'Driver is on the way.',
        ], $h);

        $response->assertStatus(503);
        $response->assertJsonPath('error.code', 'SCHEMA_MISSING');
    }

    public function test_index_returns_empty_when_customer_notices_table_missing(): void
    {
        [, $h] = $this->actingAsRole('dispatcher');

        Schema::dropIfExists('customer_notices');

        $this->getJson('/api/v1/admin/notices', $h)
            ->assertOk()
            ->assertJsonPath('data.notices', []);
    }
}
