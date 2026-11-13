<?php

namespace Tests\Feature\Api;

use App\Models\AssistantProfile;
use App\Models\AuditLog;
use App\Models\RideRequest;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublicBookingTest extends TestCase
{
    use RefreshDatabase;

    private const URL = '/api/v1/booking-requests';

    private function contact(array $over = []): array
    {
        return $over + [
            'first_name' => 'Ada', 'last_name' => 'Lovelace', 'email' => 'ada@example.com',
            'phone' => '(732) 555-0100', 'terms_accepted' => true,
        ];
    }

    private function future(): string
    {
        return now()->addDays(3)->format('Y-m-d');
    }

    private function p2p(array $over = []): array
    {
        return $this->contact($over + [
            'request_type' => 'point_to_point', 'way' => 'one',
            'pickup_address' => '1 Main St, Red Bank', 'dropoff_address' => 'JFK Terminal 4',
            'date' => $this->future(), 'time' => '09:30', 'passengers' => 2, 'bags' => 1,
            'tier' => 2, 'vehicle_class' => 'exec', 'vehicle_size' => 'suv',
        ]);
    }

    public function test_point_to_point_request_is_stored_pending_with_reference_audit_and_notification(): void
    {
        $res = $this->postJson(self::URL, $this->p2p(['stops' => ['Hoboken']]))
            ->assertCreated()
            ->assertJsonPath('data.status', 'pending');

        $ref = $res->json('data.reference');
        $this->assertMatchesRegularExpression('/^P2P-[A-Z2-9]{6}$/', $ref);

        $ride = RideRequest::where('reference', $ref)->firstOrFail();
        $this->assertSame('point_to_point', $ride->request_type);
        $this->assertSame('exec|suv', $ride->vehicle);
        $this->assertSame('1 Main St, Red Bank', $ride->pickup_location);
        $this->assertSame(['Hoboken'], $ride->details['stops']);
        $this->assertDatabaseHas('audit_logs', ['event' => 'booking_request.created', 'subject_id' => $ride->id]);
        $this->assertDatabaseHas('admin_notifications', ['ride_request_id' => $ride->id]);
    }

    public function test_client_supplied_prices_and_unknown_fields_are_never_stored(): void
    {
        $this->postJson(self::URL, $this->p2p(['total' => 1, 'price' => 1, 'estimated_total' => '$1', 'status' => 'completed']))->assertCreated();

        $ride = RideRequest::firstOrFail();
        $this->assertSame('pending', $ride->status);
        foreach (['total', 'price', 'estimated_total', 'status'] as $k) {
            $this->assertArrayNotHasKey($k, $ride->details ?? []);
        }
    }

    public function test_unknown_request_type_and_missing_required_fields_are_rejected(): void
    {
        $this->postJson(self::URL, ['request_type' => 'nope'])->assertStatus(422)->assertJsonPath('error.code', 'VALIDATION_FAILED');

        $this->postJson(self::URL, ['request_type' => 'point_to_point'])
            ->assertStatus(422)
            ->assertJsonStructure(['error' => ['details' => ['pickup_address', 'dropoff_address', 'date', 'tier', 'vehicle_class']]]);
        $this->assertSame(0, RideRequest::count());
    }

    public function test_terms_must_be_accepted_and_past_dates_are_rejected(): void
    {
        $this->postJson(self::URL, $this->p2p(['terms_accepted' => false]))->assertStatus(422);
        $this->postJson(self::URL, $this->p2p(['date' => now()->subDay()->format('Y-m-d')]))->assertStatus(422);
        $this->postJson(self::URL, $this->p2p(['tier' => 9]))->assertStatus(422);
        $this->postJson(self::URL, $this->p2p(['vehicle_size' => 'tank']))->assertStatus(422);
        $this->assertSame(0, RideRequest::count());
    }

    public function test_round_trip_requires_a_return_time(): void
    {
        $this->postJson(self::URL, $this->p2p(['way' => 'round']))->assertStatus(422);
        $this->postJson(self::URL, $this->p2p(['way' => 'round', 'return_time' => '18:00']))->assertCreated();
    }

    public function test_idempotency_key_returns_the_original_request_instead_of_a_duplicate(): void
    {
        $h = ['Idempotency-Key' => 'abc-123'];
        $first = $this->postJson(self::URL, $this->p2p(), $h)->assertCreated();
        $second = $this->postJson(self::URL, $this->p2p(), $h)->assertOk();

        $this->assertSame($first->json('data.reference'), $second->json('data.reference'));
        $this->assertSame(1, RideRequest::count());
    }

    public function test_airport_request_maps_direction_to_pickup_and_dropoff(): void
    {
        $this->postJson(self::URL, $this->contact([
            'request_type' => 'airport', 'direction' => 'from', 'airport' => 'EWR', 'airline' => 'United', 'flight_number' => 'UA 1234',
            'date' => $this->future(), 'time' => '14:05', 'address' => '10 Ocean Ave', 'passengers' => 1, 'meet' => 'sign',
            'tier' => 1, 'vehicle_class' => 'first', 'vehicle_size' => 'suv', 'return_trip' => true,
        ]))->assertCreated();

        $ride = RideRequest::firstOrFail();
        $this->assertSame('EWR', $ride->pickup_location);
        $this->assertSame('10 Ocean Ave', $ride->dropoff_location);
        $this->assertSame('airport', $ride->service_type);
    }

    public function test_airport_rejects_unknown_airport_and_missing_flight_number(): void
    {
        $base = $this->contact([
            'request_type' => 'airport', 'direction' => 'to', 'airport' => 'EWR', 'flight_number' => 'DL 1',
            'date' => $this->future(), 'time' => '14:05', 'address' => 'x', 'passengers' => 1, 'meet' => 'curb',
            'tier' => 1, 'vehicle_class' => 'exec', 'vehicle_size' => 'suv',
        ]);
        $this->postJson(self::URL, array_merge($base, ['airport' => 'XXX']))->assertStatus(422);
        $this->postJson(self::URL, array_merge($base, ['flight_number' => '']))->assertStatus(422);
    }

    public function test_client_car_enforces_three_hour_minimum_and_vehicle_confirmation(): void
    {
        $base = $this->contact([
            'request_type' => 'client_car', 'pickup_address' => 'Home', 'destination' => 'Office',
            'date' => $this->future(), 'time' => '08:00', 'hours' => 3,
            'vehicle_make' => 'Mercedes-Benz', 'vehicle_model' => 'S 580', 'vehicle_year' => '2024', 'tier' => 2,
            'vehicle_confirmed' => true,
        ]);
        $this->postJson(self::URL, array_merge($base, ['hours' => 2]))->assertStatus(422);
        $this->postJson(self::URL, array_merge($base, ['vehicle_confirmed' => false]))->assertStatus(422);
        $this->postJson(self::URL, $base)->assertCreated();
        $this->assertSame('Mercedes-Benz S 580 2024', RideRequest::firstOrFail()->vehicle);
    }

    public function test_concierge_needs_itinerary_and_phone_but_not_email_or_terms_of_vehicle(): void
    {
        $base = [
            'request_type' => 'concierge', 'first_name' => 'Sam', 'last_name' => 'Ortiz', 'phone' => '7325550101',
            'terms_accepted' => true, 'occasion' => 'proposal', 'itinerary' => 'Dinner then a walk on the pier.',
        ];
        $this->postJson(self::URL, array_merge($base, ['itinerary' => '']))->assertStatus(422);
        $res = $this->postJson(self::URL, $base)->assertCreated();
        $this->assertStringStartsWith('CON-', $res->json('data.reference'));
        $this->assertNull(RideRequest::firstOrFail()->vehicle);
    }

    public function test_assistant_week_requires_rides_and_validates_each_one(): void
    {
        $base = $this->contact([
            'request_type' => 'assistant_week', 'executive_name' => 'M. Hart', 'vehicle' => 'first|suv', 'passengers' => 1, 'tier' => 3,
            'notify' => 'both', 'billing' => 'invoice',
            'rides' => [
                ['type' => 'airport_in', 'date' => $this->future(), 'time' => '10:00', 'from' => 'UA 1', 'to' => 'Office'],
                ['type' => 'hourly', 'date' => $this->future(), 'time' => '13:00', 'hours' => 6],
            ],
        ]);
        $this->postJson(self::URL, array_merge($base, ['rides' => []]))->assertStatus(422);
        $this->postJson(self::URL, array_merge($base, ['vehicle' => 'tank|suv']))->assertStatus(422);
        $bad = $base;
        $bad['rides'][1]['type'] = 'teleport';
        $this->postJson(self::URL, $bad)->assertStatus(422);

        $this->postJson(self::URL, $base)->assertCreated();
        $ride = RideRequest::firstOrFail();
        $this->assertSame('assistant-week', $ride->service_type);
        $this->assertCount(2, $ride->details['rides']);
    }

    public function test_assistant_profile_is_stored_without_any_card_data(): void
    {
        $res = $this->postJson('/api/v1/assistant-profiles', [
            'first_name' => 'Dana', 'last_name' => 'Whitfield', 'email' => 'dana@example.com', 'mobile' => '7325550148',
            'company' => 'Northbridge', 'terms_accepted' => true,
            'billing' => ['payer' => 'Company account', 'method' => 'Card on file', 'email' => 'ap@example.com', 'card_number' => '4242424242424242'],
            'people' => [['name' => 'Michael Hart', 'relationship' => 'Executive', 'tier' => 'Tier 3']],
            'card_number' => '4242424242424242',
        ])->assertCreated();

        $this->assertMatchesRegularExpression('/^AST-[A-Z2-9]{6}$/', $res->json('data.reference'));
        $profile = AssistantProfile::firstOrFail();
        $this->assertStringNotContainsString('4242', json_encode($profile->data));
        $this->assertSame('Michael Hart', $profile->data['people'][0]['name']);
        $this->assertDatabaseHas('audit_logs', ['event' => 'assistant_profile.created']);
        $this->assertStringNotContainsString('dana@example.com', json_encode(AuditLog::where('event', 'assistant_profile.created')->first()->metadata));
    }

    public function test_assistant_profile_requires_terms_and_contact(): void
    {
        $this->postJson('/api/v1/assistant-profiles', ['first_name' => 'Dana'])->assertStatus(422);
        $this->assertSame(0, AssistantProfile::count());
    }

    public function test_submissions_are_rate_limited_per_ip(): void
    {
        for ($i = 0; $i < 10; $i++) {
            $this->postJson(self::URL, ['request_type' => 'nope'])->assertStatus(422);
        }
        $this->postJson(self::URL, ['request_type' => 'nope'])->assertStatus(429);
    }
}
