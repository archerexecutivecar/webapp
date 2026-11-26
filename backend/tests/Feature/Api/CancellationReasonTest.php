<?php

namespace Tests\Feature\Api;

use App\Models\PlatformSetting;
use App\Models\RideRequest;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\Support\CreatesStaff;
use Tests\TestCase;

class CancellationReasonTest extends TestCase
{
    use CreatesStaff, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    public function test_dispatcher_can_list_create_and_cancel_ride_with_reason(): void
    {
        [$dispatcher, $headers] = $this->actingAsRole('dispatcher');

        $list = $this->getJson('/api/v1/admin/cancellation-reasons', $headers)->assertOk();
        $this->assertNotEmpty($list->json('data.reasons'));

        // Instantly create a new reason
        $created = $this->postJson('/api/v1/admin/cancellation-reasons', [
            'label' => 'VIP itinerary rescheduled',
        ], $headers)->assertCreated();
        $created->assertJsonPath('data.reason.label', 'VIP itinerary rescheduled');

        // Duplicate (case-insensitive) returns existing without error
        $dup = $this->postJson('/api/v1/admin/cancellation-reasons', [
            'label' => 'vip itinerary rescheduled',
        ], $headers)->assertOk();
        $dup->assertJsonPath('data.created', false);

        $ride = RideRequest::create([
            'reference' => 'ARC-CR1',
            'request_type' => 'point_to_point',
            'service_type' => 'point_to_point',
            'first_name' => 'Lucas',
            'phone' => '8485550199',
            'status' => 'pending',
        ]);

        $res = $this->putJson("/api/v1/admin/rides/{$ride->id}", [
            'status' => 'cancelled',
            'cancellation_reason' => 'VIP itinerary rescheduled',
        ], $headers)->assertOk();

        $res->assertJsonPath('data.ride.status', 'cancelled')
            ->assertJsonPath('data.ride.cancellation_reason', 'VIP itinerary rescheduled');

        $this->assertDatabaseHas('ride_status_histories', [
            'ride_request_id' => $ride->id,
            'to_status' => 'cancelled',
            'notes' => 'VIP itinerary rescheduled',
        ]);
    }

    public function test_cancellation_reason_is_shown_to_customer_and_included_in_email_when_enabled(): void
    {
        PlatformSetting::current()->update(['email_notifications_enabled' => true]);

        $customer = User::create([
            'name' => 'Clara Vance',
            'email' => 'clara@example.com',
            'password' => Hash::make('SecretPass123'),
            'status' => 'active',
        ]);
        $role = Role::firstOrCreate(['key' => 'customer'], ['name' => 'Customer']);
        $customer->roles()->syncWithoutDetaching([$role->id]);

        $ride = RideRequest::create([
            'reference' => 'ARC-CR2',
            'request_type' => 'point_to_point',
            'service_type' => 'point_to_point',
            'customer_id' => $customer->id,
            'first_name' => 'Clara',
            'last_name' => 'Vance',
            'email' => 'clara@example.com',
            'phone' => '8485550188',
            'status' => 'pending',
        ]);

        [, $headers] = $this->actingAsRole('dispatcher');
        $this->putJson("/api/v1/admin/rides/{$ride->id}", [
            'status' => 'cancelled',
            'cancellation_reason' => 'Flight cancelled or delayed',
        ], $headers)->assertOk();

        // Email triggered with cancellation reason
        $messages = app('mail.manager')->mailer()->getSymfonyTransport()->messages();
        $this->assertCount(1, $messages);
        $textBody = (string) $messages[0]->getOriginalMessage()->getTextBody();
        $this->assertStringContainsString('Reservation Cancelled', $textBody);
        $this->assertStringContainsString('Cancellation Reason: Flight cancelled or delayed', $textBody);

        // Customer portal shows cancellation_reason
        $token = $this->postJson('/api/v1/auth/login', [
            'email' => 'clara@example.com',
            'password' => 'SecretPass123',
        ])->assertOk()->json('data.token');

        $this->getJson("/api/v1/customer/rides/{$ride->id}", ['Authorization' => "Bearer {$token}"])
            ->assertOk()
            ->assertJsonPath('data.ride.status', 'cancelled')
            ->assertJsonPath('data.ride.cancellation_reason', 'Flight cancelled or delayed');
    }
}
