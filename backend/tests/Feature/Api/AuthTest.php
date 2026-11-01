<?php

namespace Tests\Feature\Api;

use App\Models\ApiToken;
use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Tests\Support\CreatesStaff;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use CreatesStaff, RefreshDatabase;

    private const PASSWORD = 'Str0ngPassw0rdHere';

    private function staff(array $attrs = []): User
    {
        return $this->userWithRoles(['dispatcher'], $attrs + ['password' => self::PASSWORD]);
    }

    public function test_login_returns_token_user_roles_and_permissions_and_stores_only_a_hash(): void
    {
        $user = $this->staff();

        $res = $this->postJson('/api/v1/auth/login', ['email' => $user->email, 'password' => self::PASSWORD])
            ->assertOk()
            ->assertJsonPath('data.token_type', 'Bearer')
            ->assertJsonPath('data.user.roles', ['dispatcher'])
            ->assertJsonMissingPath('data.user.password');

        $plain = $res->json('data.token');
        $this->assertDatabaseMissing('api_tokens', ['token_hash' => $plain]);
        $this->assertDatabaseHas('api_tokens', ['token_hash' => ApiToken::hash($plain), 'user_id' => $user->id]);
        $this->assertContains('dashboard.view', $res->json('data.user.permissions'));
        $this->assertDatabaseHas('audit_logs', ['event' => 'auth.login', 'actor_id' => $user->id]);
    }

    public function test_bad_password_and_unknown_user_get_the_same_generic_401_and_are_audited(): void
    {
        $user = $this->staff();

        $a = $this->postJson('/api/v1/auth/login', ['email' => $user->email, 'password' => 'wrong-password'])
            ->assertStatus(401)->assertJsonPath('error.code', 'INVALID_CREDENTIALS');
        $b = $this->postJson('/api/v1/auth/login', ['email' => 'nobody@example.com', 'password' => 'wrong-password'])
            ->assertStatus(401)->assertJsonPath('error.code', 'INVALID_CREDENTIALS');

        $this->assertSame($a->json('error.message'), $b->json('error.message'));
        $this->assertSame(2, AuditLog::where('event', 'auth.login_failed')->count());
    }

    public function test_suspended_user_cannot_log_in(): void
    {
        $user = $this->staff();
        $user->forceFill(['status' => User::STATUS_SUSPENDED])->save();

        $this->postJson('/api/v1/auth/login', ['email' => $user->email, 'password' => self::PASSWORD])
            ->assertStatus(401)->assertJsonPath('error.code', 'INVALID_CREDENTIALS');
    }

    public function test_login_validates_input(): void
    {
        $this->postJson('/api/v1/auth/login', ['email' => 'not-an-email'])
            ->assertStatus(422)
            ->assertJsonPath('error.code', 'VALIDATION_FAILED')
            ->assertJsonStructure(['error' => ['details' => ['email', 'password']]]);
    }

    public function test_login_is_rate_limited(): void
    {
        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/v1/auth/login', ['email' => 'a@example.com', 'password' => 'x'])->assertStatus(401);
        }
        $this->postJson('/api/v1/auth/login', ['email' => 'a@example.com', 'password' => 'x'])
            ->assertStatus(429)->assertJsonPath('error.code', 'TOO_MANY_REQUESTS');
    }

    public function test_me_requires_a_valid_token(): void
    {
        $this->getJson('/api/v1/auth/me')->assertStatus(401)->assertJsonPath('error.code', 'UNAUTHENTICATED');
        $this->getJson('/api/v1/auth/me', ['Authorization' => 'Bearer garbage'])->assertStatus(401);

        [$user, $headers] = $this->actingAsRole('dispatcher');
        $this->getJson('/api/v1/auth/me', $headers)->assertOk()->assertJsonPath('data.email', $user->email);
    }

    public function test_expired_token_is_rejected(): void
    {
        [$user, $headers] = $this->actingAsRole('dispatcher');
        ApiToken::query()->update(['expires_at' => now()->subMinute()]);

        $this->getJson('/api/v1/auth/me', $headers)->assertStatus(401);
    }

    public function test_token_stops_working_when_user_is_suspended(): void
    {
        [$user, $headers] = $this->actingAsRole('super_admin');
        $user->forceFill(['status' => User::STATUS_SUSPENDED])->save();

        $this->getJson('/api/v1/admin/dashboard', $headers)->assertStatus(401);
    }

    public function test_logout_revokes_only_the_presented_token_and_is_audited(): void
    {
        [$user, $headers] = $this->actingAsRole('dispatcher');
        [$other] = ApiToken::issueFor($user);

        $this->postJson('/api/v1/auth/logout', [], $headers)->assertOk();

        $this->getJson('/api/v1/auth/me', $headers)->assertStatus(401);
        $this->getJson('/api/v1/auth/me', ['Authorization' => 'Bearer '.$other])->assertOk();
        $this->assertDatabaseHas('audit_logs', ['event' => 'auth.logout', 'actor_id' => $user->id]);
    }

    public function test_logout_requires_authentication(): void
    {
        $this->postJson('/api/v1/auth/logout')->assertStatus(401);
    }

    public function test_forgot_password_response_does_not_reveal_whether_the_account_exists(): void
    {
        Notification::fake();
        $user = $this->staff();

        $known = $this->postJson('/api/v1/auth/password/forgot', ['email' => $user->email])->assertStatus(202);
        $unknown = $this->postJson('/api/v1/auth/password/forgot', ['email' => 'ghost@example.com'])->assertStatus(202);

        $this->assertSame($known->json(), $unknown->json());
        Notification::assertSentTo($user, ResetPassword::class);
        Notification::assertCount(1);
    }

    public function test_password_can_be_reset_with_a_valid_token_and_revokes_sessions(): void
    {
        $user = $this->staff();
        ApiToken::issueFor($user);
        $token = Password::createToken($user);

        $this->postJson('/api/v1/auth/password/reset', [
            'email' => $user->email, 'token' => $token,
            'password' => 'N3wStrongPassword!', 'password_confirmation' => 'N3wStrongPassword!',
        ])->assertOk();

        $this->assertSame(0, $user->apiTokens()->count());
        $this->postJson('/api/v1/auth/login', ['email' => $user->email, 'password' => 'N3wStrongPassword!'])->assertOk();
        $this->assertDatabaseHas('audit_logs', ['event' => 'auth.password_reset', 'actor_id' => $user->id]);
    }

    public function test_reset_rejects_bad_token_and_weak_password(): void
    {
        $user = $this->staff();

        $this->postJson('/api/v1/auth/password/reset', [
            'email' => $user->email, 'token' => 'bad',
            'password' => 'N3wStrongPassword!', 'password_confirmation' => 'N3wStrongPassword!',
        ])->assertStatus(422)->assertJsonPath('error.code', 'INVALID_RESET_TOKEN');

        $this->postJson('/api/v1/auth/password/reset', [
            'email' => $user->email, 'token' => Password::createToken($user),
            'password' => 'short', 'password_confirmation' => 'short',
        ])->assertStatus(422)->assertJsonPath('error.code', 'VALIDATION_FAILED');
    }
}
