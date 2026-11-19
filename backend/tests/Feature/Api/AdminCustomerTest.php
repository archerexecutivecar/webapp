<?php

namespace Tests\Feature\Api;

use Database\Seeders\SiteContentSeeder;
use App\Models\Driver;
use App\Models\RideRequest;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\CreatesStaff;
use Tests\Support\SeedsOperationalFleet;
use Tests\TestCase;

class AdminCustomerTest extends TestCase
{
    use CreatesStaff, RefreshDatabase, SeedsOperationalFleet;

    private function book(string $email, string $first = 'Ada'): string
    {
        return $this->postJson('/api/v1/booking-requests', [
            'request_type' => 'point_to_point', 'way' => 'one', 'first_name' => $first, 'last_name' => 'Lovelace',
            'email' => $email, 'phone' => '7325550100', 'terms_accepted' => true,
            'pickup_address' => 'A', 'dropoff_address' => 'B', 'date' => now()->addDays(2)->format('Y-m-d'), 'time' => '09:00',
            'passengers' => 1, 'tier' => 1, 'vehicle_class' => 'exec', 'vehicle_size' => 'suv',
        ])->assertCreated()->json('data.reference');
    }

    public function test_dispatcher_lists_customers_with_ride_counts_and_never_sees_staff(): void
    {
        [, $h] = $this->actingAsRole('dispatcher');
        $this->book('ada@example.com');
        $this->book('ada@example.com');
        $this->book('grace@example.com', 'Grace');

        $res = $this->getJson('/api/v1/admin/customers', $h)->assertOk();
        $rows = collect($res->json('data.customers'));

        $this->assertCount(2, $rows);
        $this->assertSame(2, $rows->firstWhere('email', 'ada@example.com')['rides_count']);
        $this->assertNull($rows->firstWhere('email', 'dispatcher@example.com'));
        $this->assertFalse($rows->contains(fn ($r) => array_key_exists('password', $r)));
    }

    public function test_search_matches_name_email_and_phone_and_treats_wildcards_literally(): void
    {
        [, $h] = $this->actingAsRole('dispatcher');
        $this->book('ada@example.com');
        $this->book('grace@example.com', 'Grace');

        $this->assertCount(1, $this->getJson('/api/v1/admin/customers?search=grace', $h)->json('data.customers'));
        $this->assertCount(1, $this->getJson('/api/v1/admin/customers?search=ada@exa', $h)->json('data.customers'));
        $this->assertCount(2, $this->getJson('/api/v1/admin/customers?search=7325550100', $h)->json('data.customers'));
        $this->assertCount(0, $this->getJson('/api/v1/admin/customers?search=%25', $h)->json('data.customers'));
    }

    public function test_detail_shows_rides_and_assistant_profile_and_is_audited(): void
    {
        [$staff, $h] = $this->actingAsRole('dispatcher');
        $this->book('dana@example.com', 'Dana');
        $this->postJson('/api/v1/assistant-profiles', [
            'first_name' => 'Dana', 'last_name' => 'Whitfield', 'email' => 'dana@example.com', 'mobile' => '7325550148',
            'company' => 'Northbridge', 'terms_accepted' => true, 'people' => [['name' => 'Michael Hart']],
        ])->assertCreated();
        $driver = Driver::create(['name' => 'Jordan Reyes', 'bio' => 'x', 'is_active' => true]);
        RideRequest::query()->update(['assigned_driver_id' => $driver->id, 'status' => 'dispatched']);

        $id = User::where('email', 'dana@example.com')->value('id');
        $res = $this->getJson("/api/v1/admin/customers/{$id}", $h)->assertOk()
            ->assertJsonPath('data.customer.email', 'dana@example.com')
            ->assertJsonPath('data.customer.rides.0.driver', 'Jordan Reyes')
            ->assertJsonPath('data.customer.assistant_profiles.0.company', 'Northbridge')
            ->assertJsonPath('data.customer.assistant_profiles.0.data.people.0.name', 'Michael Hart');

        $this->assertStringNotContainsString('"password"', $res->getContent());
        $this->assertDatabaseHas('audit_logs', ['event' => 'customer.viewed', 'actor_id' => $staff->id, 'subject_id' => (string) $id]);
    }

    public function test_newly_created_customer_has_empty_profile_without_prototype_defaults(): void
    {
        [, $h] = $this->actingAsRole('dispatcher');

        $created = $this->postJson('/api/v1/admin/customers', [
            'name' => 'Paul',
            'email' => 'paul.empty@example.com',
            'phone' => '3434345435',
        ], $h)->assertCreated()->json('data.customer');

        $this->assertSame('Paul', $created['name']);
        $this->assertSame(0, $created['rides_count']);
        $this->assertSame(0, $created['lifetime_spend']);
        $this->assertNull($created['home_address']);
        $this->assertNull($created['notes']);
        $this->assertNull($created['preferred_driver']);
        $this->assertFalse($created['cash_venmo_approved']);
        $this->assertFalse($created['agreement_signed']);
        $this->assertSame([], $created['client_vehicles']);

        $detail = $this->getJson('/api/v1/admin/customers/'.$created['id'], $h)->assertOk()->json('data.customer');

        $this->assertSame([], $detail['rides']);
        $this->assertSame([], $detail['client_vehicles']);
        $this->assertNull($detail['home_address']);
        $this->assertNull($detail['notes']);
        $this->assertSame(0, $detail['lifetime_spend']);
        $this->assertStringNotContainsString('14 Riverside', json_encode($detail));
        $this->assertStringNotContainsString('Prefers Escalade', json_encode($detail));
        $this->assertStringNotContainsString('M41-HLE', json_encode($detail));
        $this->assertStringNotContainsString('283.91', json_encode($detail));
    }

    public function test_customer_detail_keeps_real_linked_rides_and_does_not_invent_fares(): void
    {
        [, $h] = $this->actingAsRole('dispatcher');
        $ref = $this->book('real.rides@example.com', 'Riley');
        $customer = User::where('email', 'real.rides@example.com')->firstOrFail();

        $ride = RideRequest::where('reference', $ref)->firstOrFail();
        $ride->forceFill([
            'customer_id' => $customer->id,
            'status' => 'completed',
            'details' => array_merge($ride->details ?? [], ['booked_price' => 150.25]),
        ])->save();

        $orphan = RideRequest::create([
            'reference' => 'P2P-ORPHAN',
            'request_type' => 'point_to_point',
            'service_type' => 'point_to_point',
            'status' => 'completed',
            'email' => 'someone.else@example.com',
            'first_name' => 'Other',
            'last_name' => 'Client',
            'phone' => '7325550999',
            'ride_date' => now()->subDay()->toDateString(),
            'ride_time' => '10:00',
            'pickup_location' => 'A',
            'dropoff_location' => 'B',
            'driver_tier' => 1,
            'details' => ['booked_price' => 283.91],
        ]);

        $detail = $this->getJson("/api/v1/admin/customers/{$customer->id}", $h)->assertOk()->json('data.customer');

        $this->assertCount(1, $detail['rides']);
        $this->assertSame($ref, $detail['rides'][0]['reference']);
        $this->assertSame(150.25, $detail['rides'][0]['fare_amount']);
        $this->assertNotSame($orphan->reference, $detail['rides'][0]['reference'] ?? null);
    }

    public function test_a_staff_member_is_not_a_customer_record(): void
    {
        [$staff, $h] = $this->actingAsRole('dispatcher');
        $this->getJson("/api/v1/admin/customers/{$staff->id}", $h)->assertStatus(404);
    }

    public function test_access_requires_the_rides_permission(): void
    {
        $this->getJson('/api/v1/admin/customers')->assertStatus(401);

        $this->book('ada@example.com');
        $this->postJson('/api/v1/customer/auth/code', ['email' => 'ada@example.com'])->assertStatus(202);
        [, $driverH] = $this->actingAsRole('driver');
        $this->getJson('/api/v1/admin/customers', $driverH)->assertStatus(403);
    }

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
        $this->seed(SiteContentSeeder::class);
        $this->seedOperationalFleet();
    }

    public function test_dispatcher_can_reset_customer_credentials_and_it_signs_them_out(): void
    {
        \Illuminate\Support\Facades\Mail::fake();
        [, $h] = $this->actingAsRole('dispatcher');
        $this->book('ada@example.com');
        $customer = User::where('email', 'ada@example.com')->firstOrFail();
        $customer->forceFill(['password' => 'Sup3rSecretPass', 'password_set_at' => now()])->save();
        [$plain] = \App\Models\ApiToken::issueFor($customer);
        $this->getJson('/api/v1/customer/me', ['Authorization' => 'Bearer '.$plain])->assertOk();

        $this->postJson("/api/v1/admin/customers/{$customer->id}/reset-credentials", [], $h)->assertOk()->assertJsonPath('data.has_password', false);

        $this->assertNull($customer->fresh()->password_set_at);
        $this->assertFalse(\Illuminate\Support\Facades\Hash::check('Sup3rSecretPass', $customer->fresh()->password));
        $this->app['auth']->forgetGuards();
        $this->getJson('/api/v1/customer/me', ['Authorization' => 'Bearer '.$plain])->assertUnauthorized();
        $this->assertDatabaseHas('audit_logs', ['event' => 'customer.credentials_reset']);
    }

    public function test_reset_is_forbidden_without_permission_and_never_targets_staff(): void
    {
        [$staff, $h] = $this->actingAsRole('dispatcher');
        $this->postJson("/api/v1/admin/customers/{$staff->id}/reset-credentials", [], $h)->assertNotFound();

        [, $viewer] = $this->actingAsRole('customer');
        $this->postJson("/api/v1/admin/customers/{$staff->id}/reset-credentials", [], $viewer)->assertForbidden();
    }
}
