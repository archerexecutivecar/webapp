<?php

namespace Tests\Feature\Api;

use App\Models\Driver;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use PHPUnit\Framework\Attributes\Group;
use Tests\Support\CreatesStaff;
use Tests\TestCase;

/**
 * Shallow admin smoke: every screen the operations portal opens must answer,
 * and locked routes must stay locked. Business rules live in the feature suite.
 *
 * Run: composer test:smoke
 */
#[Group('smoke')]
class AdminSmokeTest extends TestCase
{
    use CreatesStaff, RefreshDatabase;

    private const PASSWORD = 'Str0ngPassw0rdHere';

    public function test_health_and_public_config_answer_without_secrets(): void
    {
        $this->getJson('/api/v1/health')
            ->assertOk()
            ->assertJsonPath('data.status', 'ok')
            ->assertJsonPath('data.service', 'archer-api');

        $this->getJson('/api/v1/integrations/public')
            ->assertOk()
            ->assertJsonStructure(['data' => ['google_maps_browser_key', 'stripe_publishable_key', 'payment_provider']])
            ->assertJsonMissingPath('data.stripe_secret_key')
            ->assertJsonMissingPath('data.stripe_webhook_secret');
    }

    public function test_unsigned_stripe_webhook_is_rejected(): void
    {
        $this->postJson('/api/v1/webhooks/stripe', ['type' => 'payment_intent.succeeded'])
            ->assertStatus(400)
            ->assertJsonPath('error.code', 'MISSING_SIGNATURE');
    }

    public function test_admin_screens_reject_anonymous_requests(): void
    {
        $failures = [];
        foreach ($this->protectedReads() as $label => $path) {
            $response = $this->getJson($path);
            if ($response->status() !== 401 || $response->json('error.code') !== 'UNAUTHENTICATED') {
                $failures[] = $this->failureLine($label, $path, $response);
            }
        }

        $this->assertSame([], $failures, "Anonymous admin reads were not rejected:\n".implode("\n", $failures));
    }

    public function test_super_admin_can_open_every_admin_screen(): void
    {
        [, $headers] = $this->login('super_admin');

        $nav = $this->getJson('/api/v1/admin/navigation', $headers)->assertOk();
        $hrefs = collect($nav->json('data.groups'))
            ->flatMap(fn ($group) => collect($group['items'])->pluck('href'))
            ->all();

        $this->assertEqualsCanonicalizing(
            array_merge(array_keys($this->screenReads()), ['/my-rides']),
            $hrefs,
            'Navigation drifted from the admin smoke map. Add the new screen to screenReads().'
        );

        $this->assertJsonReadsOk($headers, $this->screenReads() + [
            'session' => '/api/v1/auth/me',
            'navigation' => '/api/v1/admin/navigation',
            'notifications' => '/api/v1/admin/notifications',
            'integrations' => '/api/v1/admin/integrations',
            'brand settings' => '/api/v1/admin/brand-settings',
            'pricing settings' => '/api/v1/admin/pricing-settings',
            'rate cards' => '/api/v1/admin/rates',
        ]);

        $export = $this->withHeaders($headers)->get('/api/v1/admin/payroll/export');
        $export->assertOk();
        $this->assertStringContainsString('text/csv', (string) $export->headers->get('content-type'));
        $this->assertStringContainsString('Driver Name', $export->streamedContent());
    }

    public function test_customer_cannot_open_staff_screens(): void
    {
        [, $headers] = $this->login('customer');

        foreach ([
            '/api/v1/admin/dashboard',
            '/api/v1/admin/rides',
            '/api/v1/admin/payments-earnings',
            '/api/v1/admin/payroll',
            '/api/v1/admin/security/leads',
            '/api/v1/driver/rides',
        ] as $path) {
            $this->getJson($path, $headers)->assertForbidden();
        }

        $keys = collect($this->getJson('/api/v1/admin/navigation', $headers)->assertOk()->json('data.groups'))
            ->flatMap(fn ($group) => collect($group['items'])->pluck('key'));
        $this->assertTrue($keys->isEmpty());
    }

    public function test_linked_driver_can_open_the_portal_and_not_payroll(): void
    {
        [$user, $headers] = $this->login('driver');

        Driver::create([
            'user_id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'phone' => '(732) 555-0100',
            'is_active' => true,
        ]);

        $this->assertJsonReadsOk($headers, [
            'driver profile' => '/api/v1/driver/profile',
            'assigned rides' => '/api/v1/driver/rides',
            'security shifts' => '/api/v1/driver/security-shifts',
            'driver notifications' => '/api/v1/driver/notifications',
        ]);

        $this->getJson('/api/v1/admin/payroll', $headers)->assertForbidden();
        $this->getJson('/api/v1/admin/payments-earnings', $headers)->assertForbidden();
    }

    public function test_logout_ends_the_admin_session(): void
    {
        [, $headers] = $this->login('super_admin');

        $this->postJson('/api/v1/auth/logout', [], $headers)->assertOk();
        $this->getJson('/api/v1/auth/me', $headers)->assertStatus(401)->assertJsonPath('error.code', 'UNAUTHENTICATED');
        $this->getJson('/api/v1/admin/dashboard', $headers)->assertStatus(401);
    }

    /** @param  array<string, string>  $headers */
    private function login(string ...$roles): array
    {
        $user = $this->userWithRoles($roles, ['password' => self::PASSWORD]);

        $token = $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => self::PASSWORD,
        ])->assertOk()->json('data.token');

        return [$user, ['Authorization' => 'Bearer '.$token]];
    }

    /**
     * Nav href => the GET the screen issues on open.
     *
     * @return array<string, string>
     */
    private function screenReads(): array
    {
        return [
            '/dashboard' => '/api/v1/admin/dashboard',
            '/rides' => '/api/v1/admin/rides',
            '/customers' => '/api/v1/admin/customers',
            '/drivers' => '/api/v1/admin/drivers',
            '/notices' => '/api/v1/admin/notices',
            '/pricing' => '/api/v1/admin/payments-earnings?period=this_week',
            '/payroll' => '/api/v1/admin/payroll',
            '/site-vehicles' => '/api/v1/admin/fleet/schedule?date='.now()->toDateString(),
            '/site-rates' => '/api/v1/admin/site-rates/matrix',
            '/settings' => '/api/v1/admin/platform-settings',
            '/site-content' => '/api/v1/admin/site-content',
            '/site-tiers' => '/api/v1/admin/site-tiers',
            '/testimonials' => '/api/v1/admin/testimonials',
            '/cms-pages' => '/api/v1/admin/cms-pages',
            '/security/leads' => '/api/v1/admin/security/leads',
            '/security/contracts' => '/api/v1/admin/security/contracts',
            '/security/swaps' => '/api/v1/admin/security/swaps',
            '/security/credentials' => '/api/v1/admin/security/credentials',
            '/security/announcements' => '/api/v1/admin/security/announcements',
        ];
    }

    /**
     * @return array<string, string>
     */
    private function protectedReads(): array
    {
        return $this->screenReads() + [
            'session' => '/api/v1/auth/me',
            'navigation' => '/api/v1/admin/navigation',
            'driver rides' => '/api/v1/driver/rides',
        ];
    }

    /**
     * @param  array<string, string>  $headers
     * @param  array<string, string>  $paths
     */
    private function assertJsonReadsOk(array $headers, array $paths): void
    {
        $failures = [];
        foreach ($paths as $label => $path) {
            $response = $this->withHeaders($headers)->getJson($path);
            $json = $response->json();
            if ($response->status() !== 200 || ! is_array($json) || ! array_key_exists('data', $json)) {
                $failures[] = $this->failureLine($label, $path, $response);
            }
        }

        $this->assertSame([], $failures, "Smoke reads failed:\n".implode("\n", $failures));
    }

    private function failureLine(string $label, string $path, TestResponse $response): string
    {
        return $label.' '.$path.' -> '.$response->status().' '.substr($response->getContent(), 0, 400);
    }
}
