<?php

namespace Tests\Feature\Api;

use App\Models\Driver;
use App\Models\RideRequest;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Collection;
use Tests\Support\CreatesStaff;
use Tests\TestCase;

class CustomerNotificationEmailsTest extends TestCase
{
    use CreatesStaff, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    private function sentMessages(): Collection
    {
        return app('mail.manager')->mailer()->getSymfonyTransport()->messages();
    }

    public function test_booking_sends_welcome_and_confirmation_emails(): void
    {
        $res = $this->postJson('/api/v1/booking-requests', [
            'request_type' => 'point_to_point',
            'way' => 'one',
            'first_name' => 'John',
            'last_name' => 'Wick',
            'email' => 'john.wick@example.com',
            'phone' => '8485550199',
            'terms_accepted' => true,
            'pickup_address' => '100 Continental Way, NYC',
            'dropoff_address' => 'JFK Terminal 4',
            'date' => now()->addDays(2)->format('Y-m-d'),
            'time' => '14:30',
            'passengers' => 1,
            'tier' => 1,
            'vehicle_class' => 'exec',
            'vehicle_size' => 'suv',
        ])->assertCreated();

        $ref = $res->json('data.reference');

        // Sent welcome email + booking confirmation email
        $messages = $this->sentMessages();
        $this->assertCount(2, $messages);

        $subjects = $messages->map(fn ($m) => $m->getOriginalMessage()->getSubject())->all();
        $this->assertContains('Welcome to Archer Executive Transportation', $subjects);
        $this->assertTrue(collect($subjects)->contains(fn ($s) => str_contains($s, 'Booking Confirmed: ' . $ref)));

        $this->assertDatabaseHas('users', ['email' => 'john.wick@example.com']);
        $this->assertDatabaseHas('ride_requests', ['reference' => $ref]);
    }

    public function test_direct_registration_sends_welcome_email(): void
    {
        $this->postJson('/api/v1/customer/auth/register', [
            'name' => 'Jane Smith',
            'email' => 'jane.smith@example.com',
            'phone' => '8485550122',
            'password' => 'SecretPass123',
            'password_confirmation' => 'SecretPass123',
        ])->assertCreated();

        $messages = $this->sentMessages();
        $this->assertCount(1, $messages);
        $this->assertSame('Welcome to Archer Executive Transportation', $messages[0]->getOriginalMessage()->getSubject());
    }

    public function test_status_change_sends_update_email(): void
    {
        $driver = Driver::create(['name' => 'Marcus Vance', 'bio' => 'Top tier chauffeur', 'is_active' => true]);
        $ride = RideRequest::create([
            'reference' => 'ARC-TEST99',
            'request_type' => 'point_to_point',
            'service_type' => 'point_to_point',
            'first_name' => 'Alice',
            'email' => 'alice@example.com',
            'phone' => '8485550100',
            'status' => 'pending',
            'pickup_location' => 'Midtown',
            'dropoff_location' => 'Newark Airport',
            'ride_date' => '2026-11-20',
            'ride_time' => '10:00',
        ]);

        [$dispatcher, $headers] = $this->actingAsRole('dispatcher');

        $this->putJson("/api/v1/admin/rides/{$ride->id}", [
            'status' => 'dispatched',
            'assigned_driver_id' => $driver->id,
        ], $headers)->assertOk();

        $this->assertSame('dispatched', $ride->fresh()->status);
        $messages = $this->sentMessages();
        $this->assertCount(1, $messages);
        $this->assertStringContainsString('Ride Update (ARC-TEST99): Chauffeur Dispatched', $messages[0]->getOriginalMessage()->getSubject());
    }
}
