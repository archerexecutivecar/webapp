<?php

namespace Tests\Feature\Api;

use App\Models\Driver;
use App\Models\RideRequest;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\CreatesStaff;
use Tests\TestCase;

class AdminCustomerTest extends TestCase
{
    use CreatesStaff, RefreshDatabase;

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
