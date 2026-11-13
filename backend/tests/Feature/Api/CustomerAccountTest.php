<?php

namespace Tests\Feature\Api;

use App\Models\Driver;
use App\Models\LoginCode;
use App\Models\RideRequest;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\CreatesStaff;
use Tests\TestCase;

class CustomerAccountTest extends TestCase
{
    use CreatesStaff, RefreshDatabase;

    private function book(string $email, array $over = []): string
    {
        return $this->postJson('/api/v1/booking-requests', $over + [
            'request_type' => 'point_to_point', 'way' => 'one', 'first_name' => 'Ada', 'last_name' => 'Lovelace',
            'email' => $email, 'phone' => '7325550100', 'terms_accepted' => true,
            'pickup_address' => 'A', 'dropoff_address' => 'B', 'date' => now()->addDays(2)->format('Y-m-d'), 'time' => '09:00',
            'passengers' => 1, 'tier' => 1, 'vehicle_class' => 'exec', 'vehicle_size' => 'suv',
        ])->assertCreated()->json('data.reference');
    }

    private function lastCode(): string
    {
        $messages = app('mail.manager')->mailer()->getSymfonyTransport()->messages();
        $body = $messages->last()->getOriginalMessage()->getBody()->bodyToString();
        preg_match('/\b(\d{6})\b/', $body, $m);

        return $m[1];
    }

    private function signedIn(string $email): array
    {
        $this->postJson('/api/v1/customer/auth/code', ['email' => $email])->assertStatus(202);
        $res = $this->postJson('/api/v1/customer/auth/code/verify', ['email' => $email, 'code' => $this->lastCode()])->assertOk();

        return ['Authorization' => 'Bearer '.$res->json('data.token')];
    }

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    public function test_booking_creates_a_customer_account_and_links_the_ride(): void
    {
        $ref = $this->book('Ada@Example.com');

        $user = User::where('email', 'ada@example.com')->firstOrFail();
        $this->assertSame(['customer'], $user->roleKeys());
        $this->assertNull($user->password_set_at);
        $this->assertSame($user->id, RideRequest::where('reference', $ref)->firstOrFail()->customer_id);

        $this->book('ada@example.com');
        $this->assertSame(1, User::where('email', 'ada@example.com')->count());
        $this->assertSame(2, RideRequest::where('customer_id', $user->id)->count());
    }

    public function test_a_staff_email_never_receives_customer_rides(): void
    {
        $staff = $this->userWithRoles(['dispatcher'], ['email' => 'dispatch@archer.test']);
        $ref = $this->book('dispatch@archer.test');

        $this->assertNull(RideRequest::where('reference', $ref)->firstOrFail()->customer_id);
        $this->assertSame(['dispatcher'], $staff->fresh()->roleKeys());
    }

    public function test_code_request_returns_404_when_account_does_not_exist(): void
    {
        $this->book('ada@example.com');
        $this->postJson('/api/v1/customer/auth/code', ['email' => 'ada@example.com'])->assertStatus(202);
        $res = $this->postJson('/api/v1/customer/auth/code', ['email' => 'nobody@example.com'])->assertStatus(404);
        $this->assertSame('ACCOUNT_NOT_FOUND', $res->json('error.code'));
        $this->assertSame(1, LoginCode::count());
    }

    public function test_customer_can_register_directly_without_prior_booking(): void
    {
        $res = $this->postJson('/api/v1/customer/auth/register', [
            'name' => 'Paul Miller',
            'email' => 'paul@example.com',
            'phone' => '8485550199',
            'password' => 'SecurePass123',
            'password_confirmation' => 'SecurePass123',
        ])->assertCreated();

        $this->assertNotEmpty($res->json('data.token'));
        $this->assertSame('paul@example.com', $res->json('data.user.email'));
        $this->assertTrue($res->json('data.user.has_password'));

        $user = User::where('email', 'paul@example.com')->firstOrFail();
        $this->assertSame(['customer'], $user->roleKeys());

        // Can sign in immediately with email + password via /auth/login
        $loginRes = $this->postJson('/api/v1/auth/login', [
            'email' => 'paul@example.com',
            'password' => 'SecurePass123',
        ])->assertOk();
        $this->assertNotEmpty($loginRes->json('data.token'));

        // Duplicate registration is rejected
        $dup = $this->postJson('/api/v1/customer/auth/register', [
            'name' => 'Paul Miller Again',
            'email' => 'paul@example.com',
            'password' => 'SecurePass123',
            'password_confirmation' => 'SecurePass123',
        ])->assertStatus(422);
        $this->assertSame('ACCOUNT_EXISTS', $dup->json('error.code'));
    }

    public function test_emailed_code_signs_in_once_and_is_stored_only_as_a_hash(): void
    {
        $this->book('ada@example.com');
        $this->postJson('/api/v1/customer/auth/code', ['email' => 'ada@example.com']);
        $code = $this->lastCode();

        $this->assertStringNotContainsString($code, (string) LoginCode::firstOrFail()->code_hash);

        $res = $this->postJson('/api/v1/customer/auth/code/verify', ['email' => 'ada@example.com', 'code' => $code])
            ->assertOk()
            ->assertJsonPath('data.user.has_password', false)
            ->assertJsonMissingPath('data.user.password');
        $this->withHeaders(['Authorization' => 'Bearer '.$res->json('data.token')])->getJson('/api/v1/customer/me')
            ->assertOk()->assertJsonPath('data.email', 'ada@example.com');
        $this->assertNotNull(User::where('email', 'ada@example.com')->first()->email_verified_at);

        // single use
        $this->postJson('/api/v1/customer/auth/code/verify', ['email' => 'ada@example.com', 'code' => $code])->assertStatus(422);
    }

    public function test_code_can_also_set_a_password_in_one_step_and_a_weak_password_does_not_burn_the_code(): void
    {
        $this->book('ada@example.com');
        $this->postJson('/api/v1/customer/auth/code', ['email' => 'ada@example.com']);
        $code = $this->lastCode();

        // weak/mismatched password is rejected before the code is consumed
        $this->postJson('/api/v1/customer/auth/code/verify', ['email' => 'ada@example.com', 'code' => $code, 'password' => 'short', 'password_confirmation' => 'short'])->assertStatus(422);

        $this->postJson('/api/v1/customer/auth/code/verify', [
            'email' => 'ada@example.com', 'code' => $code, 'password' => 'Longer-pass-2026', 'password_confirmation' => 'Longer-pass-2026',
        ])->assertOk()->assertJsonPath('data.user.has_password', true);

        $this->postJson('/api/v1/auth/login', ['email' => 'ada@example.com', 'password' => 'Longer-pass-2026'])->assertOk();
        $this->assertDatabaseHas('audit_logs', ['event' => 'customer.password_set']);
    }

    public function test_wrong_codes_lock_the_code_after_five_attempts(): void
    {
        $this->book('ada@example.com');
        $this->postJson('/api/v1/customer/auth/code', ['email' => 'ada@example.com']);
        $good = $this->lastCode();
        $bad = $good === '000000' ? '111111' : '000000';

        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/v1/customer/auth/code/verify', ['email' => 'ada@example.com', 'code' => $bad])
                ->assertStatus(422)->assertJsonPath('error.code', 'INVALID_CODE');
        }
        $this->postJson('/api/v1/customer/auth/code/verify', ['email' => 'ada@example.com', 'code' => $good])->assertStatus(422);
    }

    public function test_expired_code_is_rejected(): void
    {
        $this->book('ada@example.com');
        $this->postJson('/api/v1/customer/auth/code', ['email' => 'ada@example.com']);
        $code = $this->lastCode();
        LoginCode::query()->update(['expires_at' => now()->subMinute()]);

        $this->postJson('/api/v1/customer/auth/code/verify', ['email' => 'ada@example.com', 'code' => $code])->assertStatus(422);
    }

    public function test_a_customer_can_add_a_password_and_then_use_either_way_in(): void
    {
        $this->book('ada@example.com');
        $h = $this->signedIn('ada@example.com');

        $this->putJson('/api/v1/customer/password', ['password' => 'weak', 'password_confirmation' => 'weak'], $h)->assertStatus(422);
        $this->putJson('/api/v1/customer/password', ['password' => 'Str0ngPassw0rdHere', 'password_confirmation' => 'Str0ngPassw0rdHere'], $h)
            ->assertOk()->assertJsonPath('data.has_password', true);

        $this->postJson('/api/v1/auth/login', ['email' => 'ada@example.com', 'password' => 'Str0ngPassw0rdHere'])->assertOk();
        $this->postJson('/api/v1/auth/login', ['email' => 'ada@example.com', 'password' => 'wrong-password-1'])->assertStatus(401);

        // changing it now needs the current password
        $this->putJson('/api/v1/customer/password', ['password' => 'An0therStr0ngOne', 'password_confirmation' => 'An0therStr0ngOne'], $h)->assertStatus(422);
        $this->putJson('/api/v1/customer/password', ['current_password' => 'nope', 'password' => 'An0therStr0ngOne', 'password_confirmation' => 'An0therStr0ngOne'], $h)->assertStatus(422);
        $this->putJson('/api/v1/customer/password', ['current_password' => 'Str0ngPassw0rdHere', 'password' => 'An0therStr0ngOne', 'password_confirmation' => 'An0therStr0ngOne'], $h)->assertOk();

        // and the code still works for a customer who has a password
        $this->signedIn('ada@example.com');
    }

    public function test_a_customer_only_ever_sees_their_own_rides(): void
    {
        $this->book('ada@example.com');
        $other = $this->book('grace@example.com');
        $h = $this->signedIn('ada@example.com');

        $list = $this->getJson('/api/v1/customer/rides', $h)->assertOk();
        $this->assertCount(1, $list->json('data.rides'));

        $otherId = RideRequest::where('reference', $other)->firstOrFail()->id;
        $this->getJson("/api/v1/customer/rides/{$otherId}", $h)->assertStatus(404);

        $mine = $list->json('data.rides.0.id');
        $this->getJson("/api/v1/customer/rides/{$mine}", $h)->assertOk()->assertJsonCount(4, 'data.ride.timeline');
    }

    public function test_ride_output_never_includes_dispatch_notes_and_shows_the_assigned_chauffeur(): void
    {
        $this->book('ada@example.com');
        $driver = Driver::create(['name' => 'Jordan Reyes', 'bio' => 'x', 'is_active' => true]);
        RideRequest::query()->update(['status' => 'dispatched', 'assigned_driver_id' => $driver->id, 'dispatch_notes' => 'SECRET INTERNAL NOTE']);
        $h = $this->signedIn('ada@example.com');

        $id = $this->getJson('/api/v1/customer/rides?scope=upcoming', $h)->json('data.rides.0.id');
        $res = $this->getJson("/api/v1/customer/rides/{$id}", $h)->assertOk()
            ->assertJsonPath('data.ride.status_label', 'Chauffeur assigned')
            ->assertJsonPath('data.ride.chauffeur.name', 'Jordan Reyes');
        $this->assertStringNotContainsString('SECRET', $res->getContent());

        RideRequest::query()->update(['status' => 'completed']);
        $this->assertCount(0, $this->getJson('/api/v1/customer/rides?scope=upcoming', $h)->json('data.rides'));
        $this->assertCount(1, $this->getJson('/api/v1/customer/rides?scope=past', $h)->json('data.rides'));
    }

    public function test_portal_requires_authentication_and_customers_cannot_reach_staff_apis(): void
    {
        $this->getJson('/api/v1/customer/rides')->assertStatus(401);

        $this->book('ada@example.com');
        $h = $this->signedIn('ada@example.com');
        $this->getJson('/api/v1/admin/rides', $h)->assertStatus(403);
        $this->getJson('/api/v1/admin/dashboard', $h)->assertStatus(403);
    }

    public function test_a_staff_user_cannot_use_the_customer_portal(): void
    {
        [, $h] = $this->actingAsRole('dispatcher');
        $this->getJson('/api/v1/customer/rides', $h)->assertStatus(403);
    }
}
