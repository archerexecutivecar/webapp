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

        $this->assertEqualsCanonicalizing(['dashboard', 'rides', 'customers', 'drivers'], $keys);
    }

    public function test_content_roles_see_only_website_items(): void
    {
        $expected = ['services', 'security-addons', 'testimonials', 'site-content'];
        $this->assertEqualsCanonicalizing($expected, $this->keysFor('content_editor'));
        $this->assertEqualsCanonicalizing($expected, $this->keysFor('content_publisher'));
    }

    public function test_driver_and_customer_navigation(): void
    {
        $this->assertSame(['driver-portal'], $this->keysFor('driver'));
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
