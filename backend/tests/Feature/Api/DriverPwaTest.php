<?php

namespace Tests\Feature\Api;

use App\Models\Driver;
use App\Models\RideRequest;
use App\Models\User;
use App\Models\Vehicle;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\Support\CreatesStaff;
use Tests\TestCase;

class DriverPwaTest extends TestCase
{
    use CreatesStaff, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
        Mail::fake();
    }

    /** @return array{0: User, 1: Driver, 2: array<string, string>} */
    private function driverAccount(int $tier = 2, bool $fleet = true): array
    {
        [$user, $headers] = $this->actingAsRole('driver');
        $driver = Driver::create([
            'user_id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'service_tier' => $tier,
            'is_active' => true,
            'is_fleet_operator' => $fleet,
            'is_client_car_operator' => false,
            'is_owner_operator' => true,
            'compliance_credentials' => [
                'carry_permit' => ['expires_on' => now()->addDays(10)->toDateString()],
                'driver_license' => ['expires_on' => now()->addDays(90)->toDateString()],
            ],
        ]);

        return [$user, $driver, $headers];
    }

    private function broadcastRide(array $overrides = []): RideRequest
    {
        return RideRequest::create(array_merge([
            'reference' => 'AR-'.strtoupper(uniqid()),
            'service_type' => 'hourly',
            'driver_tier' => '2',
            'first_name' => 'Priya',
            'last_name' => 'Nair',
            'phone' => '7325550101',
            'pickup_location' => '220 Ocean Ave, Long Branch, NJ 07740',
            'dropoff_location' => 'As directed',
            'ride_date' => '2026-11-19',
            'ride_time' => '17:17',
            'vehicle' => 'Executive Class SUV',
            'status' => 'broadcast',
            'details' => [
                'hours' => 5,
                'passengers' => 2,
                'driver_pay' => 150,
                'hourly_rate' => 30,
            ],
        ], $overrides));
    }

    public function test_offers_are_limited_to_eligible_broadcasts_and_pass_through_stored_pay(): void
    {
        [, , $headers] = $this->driverAccount(2);
        $mine = $this->broadcastRide();
        $this->broadcastRide(['driver_tier' => '1', 'reference' => 'AR-LOW']);
        $this->broadcastRide(['service_type' => 'client-car', 'driver_tier' => '2', 'reference' => 'AR-CAR']);
        $this->broadcastRide(['status' => 'pending', 'reference' => 'AR-NEW']);

        $res = $this->withHeaders($headers)->getJson('/api/v1/driver/offers');
        $res->assertOk();
        $refs = collect($res->json('data.offers'))->pluck('reference');
        $this->assertTrue($refs->contains($mine->reference));
        $this->assertFalse($refs->contains('AR-LOW'));
        $this->assertFalse($refs->contains('AR-CAR'));
        $this->assertFalse($refs->contains('AR-NEW'));
        $this->assertEquals(150, $res->json('data.offers.0.driver_pay'));
        $this->assertEquals(30, $res->json('data.offers.0.hourly_rate'));
    }

    public function test_offer_names_the_fleet_car_and_shows_the_published_hourly_pay(): void
    {
        [, , $headers] = $this->driverAccount(2);
        Vehicle::create([
            'name' => 'Chevrolet Suburban', 'slug' => 'suburban-offer', 'class_type' => 'exec', 'category' => 'FULL-SIZE SUV',
            'form_value' => 'exec|suv', 'passengers' => 6, 'luggage' => 6, 'is_active' => true,
        ]);
        $this->broadcastRide([
            'vehicle' => 'exec|suv',
            'details' => ['hours' => 4, 'passengers' => 2],
        ]);

        $offer = $this->withHeaders($headers)->getJson('/api/v1/driver/offers')->assertOk()->json('data.offers.0');
        $this->assertSame('Chevrolet Suburban', $offer['vehicle']);
        $this->assertEquals(30, $offer['hourly_rate']);
        $this->assertNull($offer['driver_pay']);
    }

    public function test_accept_assigns_the_ride_and_a_second_driver_is_rejected(): void
    {
        [, $first, $headers] = $this->driverAccount(2);
        [, , $otherHeaders] = $this->driverAccount(2);
        $ride = $this->broadcastRide();

        $this->withHeaders($headers)
            ->postJson('/api/v1/driver/offers/'.$ride->id.'/accept')
            ->assertOk()
            ->assertJsonPath('data.ride.status', 'dispatched')
            ->assertJsonPath('data.ride.assigned_driver_id', $first->id);

        $this->withHeaders($otherHeaders)
            ->postJson('/api/v1/driver/offers/'.$ride->id.'/accept')
            ->assertStatus(409)
            ->assertJsonPath('error.code', 'OFFER_UNAVAILABLE');
    }

    public function test_higher_tier_cannot_accept_a_lower_tier_offer(): void
    {
        [, , $headers] = $this->driverAccount(3);
        $ride = $this->broadcastRide(['driver_tier' => '1']);

        $this->withHeaders($headers)
            ->postJson('/api/v1/driver/offers/'.$ride->id.'/accept')
            ->assertStatus(403)
            ->assertJsonPath('error.code', 'NOT_ELIGIBLE');

        $this->assertNull($ride->fresh()->assigned_driver_id);
    }

    public function test_presence_and_credential_bands_come_from_the_server(): void
    {
        [, , $headers] = $this->driverAccount();

        $this->withHeaders($headers)
            ->putJson('/api/v1/driver/presence', ['is_online' => true, 'push_alerts_enabled' => true])
            ->assertOk()
            ->assertJsonPath('data.portal.is_online', true);

        $profile = $this->withHeaders($headers)->getJson('/api/v1/driver/profile')->assertOk();
        $creds = collect($profile->json('data.portal.credentials'))->keyBy('key');
        $this->assertSame('renewal_due', $creds['carry_permit']['status']);
        $this->assertSame(10, $creds['carry_permit']['days_remaining']);
        $this->assertSame('active', $creds['driver_license']['status']);
        $this->assertContains('Owner-operator', $profile->json('data.portal.modes'));
    }

    public function test_earnings_use_stored_closeout_amounts(): void
    {
        [, $driver, $headers] = $this->driverAccount();
        RideRequest::create([
            'reference' => 'AR-DONE',
            'service_type' => 'hourly',
            'driver_tier' => '2',
            'first_name' => 'Grant',
            'last_name' => 'Whitfield',
            'phone' => '7325550108',
            'status' => 'completed',
            'assigned_driver_id' => $driver->id,
            'ride_date' => now()->toDateString(),
            'ride_time' => '09:00',
            'details' => ['fare' => 200, 'driver_pay' => 80, 'tip' => 20, 'payment_method' => 'Card'],
        ]);

        $this->withHeaders($headers)
            ->getJson('/api/v1/driver/earnings')
            ->assertOk()
            ->assertJsonPath('data.pay_week.earned_pay_tips', 100)
            ->assertJsonPath('data.history.0.earned', 100);
    }

    public function test_customer_cannot_open_the_driver_portal(): void
    {
        [, $headers] = $this->actingAsRole('customer');

        $this->withHeaders($headers)->getJson('/api/v1/driver/offers')->assertStatus(403);
    }
}
