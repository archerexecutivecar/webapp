<?php

namespace Tests\Feature\Api;

use App\Models\ServiceType;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\CreatesStaff;
use Tests\TestCase;

class ServiceTypeApiTest extends TestCase
{
    use CreatesStaff, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedRbac();
        $this->artisan('db:seed', ['--class' => 'CmsAndServicesSeeder']);
    }

    public function test_public_services_endpoint_returns_only_active_services(): void
    {
        $response = $this->getJson('/api/v1/services');

        $response->assertOk()
            ->assertJsonStructure([
                'data' => [
                    'services' => [
                        '*' => ['id', 'slug', 'name', 'tagline', 'features', 'min_hours', 'is_active', 'sort_order']
                    ]
                ]
            ]);

        $this->assertNotEmpty($response->json('data.services'));
    }

    public function test_admin_can_create_update_and_delete_service(): void
    {
        [, $headers] = $this->actingAsRole('super_admin');

        // 1. Create Service
        $createRes = $this->withHeaders($headers)
            ->postJson('/api/v1/admin/services', [
                'name' => 'Armored Security Detail',
                'tagline' => 'Discreet armored vehicle convoy.',
                'features' => ['Level B6 armoring', 'Tactical security-trained driver'],
                'min_hours' => 6,
            ]);

        $createRes->assertCreated();
        $id = $createRes->json('data.service.id');
        $this->assertDatabaseHas('service_types', ['id' => $id, 'slug' => 'armored-security-detail']);

        // 2. Update Service
        $updateRes = $this->withHeaders($headers)
            ->putJson("/api/v1/admin/services/{$id}", [
                'name' => 'Armored VIP Detail',
                'min_hours' => 8,
            ]);

        $updateRes->assertOk();
        $this->assertDatabaseHas('service_types', ['id' => $id, 'name' => 'Armored VIP Detail', 'min_hours' => 8]);

        // 3. Delete Service
        $deleteRes = $this->withHeaders($headers)
            ->deleteJson("/api/v1/admin/services/{$id}");

        $deleteRes->assertOk();
        $this->assertSoftDeleted('service_types', ['id' => $id]);
    }
}
