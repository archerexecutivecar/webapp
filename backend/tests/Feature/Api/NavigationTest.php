<?php

namespace Tests\Feature\Api;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\CreatesStaff;
use Tests\TestCase;

class NavigationTest extends TestCase
{
    use CreatesStaff, RefreshDatabase;

    private function keysFor(string ...$roles): array
    {
        [, $headers] = $this->actingAsRole(...$roles);

        return collect($this->getJson('/api/v1/admin/navigation', $headers)->assertOk()->json('data.groups'))
            ->flatMap(fn ($g) => collect($g['items'])->pluck('key'))->all();
    }

    public function test_requires_authentication(): void
    {
        $this->getJson('/api/v1/admin/navigation')->assertStatus(401);
    }

    public function test_super_admin_sees_every_item(): void
    {
        $all = collect(config('navigation.groups'))->flatMap(fn ($g) => collect($g['items'])->pluck('key'))->all();

        $this->assertEqualsCanonicalizing($all, $this->keysFor('super_admin'));
    }

    public function test_dispatcher_sees_only_dispatch_related_items(): void
    {
        $keys = $this->keysFor('dispatcher');

        $this->assertEqualsCanonicalizing(['dashboard', 'rides', 'bookings', 'customers', 'drivers'], $keys);
    }

    public function test_finance_sees_finance_but_not_pricing_or_content(): void
    {
        $keys = $this->keysFor('finance_payroll');

        foreach (['payments', 'closeout', 'payroll', 'audit-logs', 'dashboard'] as $k) {
            $this->assertContains($k, $keys);
        }
        foreach (['settings', 'vehicles', 'cms-pages', 'staff'] as $k) {
            $this->assertNotContains($k, $keys);
        }
    }

    public function test_content_roles_see_only_website_items(): void
    {
        $this->assertEqualsCanonicalizing(['services', 'cms-pages', 'media', 'site-navigation'], $this->keysFor('content_editor'));
        $this->assertEqualsCanonicalizing(['services', 'cms-pages', 'media', 'site-navigation', 'seo'], $this->keysFor('content_publisher'));
    }

    public function test_driver_and_customer_get_an_empty_navigation(): void
    {
        $this->assertSame([], $this->keysFor('driver'));
        $this->assertSame([], $this->keysFor('customer'));
    }

    public function test_response_never_exposes_permission_requirements_and_omits_empty_groups(): void
    {
        [, $headers] = $this->actingAsRole('driver_manager');
        $res = $this->getJson('/api/v1/admin/navigation', $headers)->assertOk();

        $this->assertStringNotContainsString('permissions', $res->getContent());
        $this->assertNotContains('finance', collect($res->json('data.groups'))->pluck('key')->all());
    }
}
