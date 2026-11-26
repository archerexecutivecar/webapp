<?php

namespace Tests\Feature\Api;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\Support\CreatesStaff;
use Tests\TestCase;

class InfluencerApplicationsTest extends TestCase
{
    use CreatesStaff, RefreshDatabase;

    public function test_public_can_submit_influencer_application_with_resume_separately_from_driver_careers(): void
    {
        Storage::fake('local');

        $res = $this->post('/api/v1/influencer-applications', [
            'full_name' => 'Maya Lin',
            'email' => 'maya.lin@example.com',
            'phone' => '8485550177',
            'city' => 'New York, NY',
            'instagram_handle' => '@mayalin',
            'follower_count' => '120K',
            'portfolio_url' => 'https://example.com/media-kit',
            'cover_note' => 'Luxury lifestyle creator in NYC.',
            'resume' => UploadedFile::fake()->create('maya-mediakit.pdf', 120, 'application/pdf'),
        ], ['Accept' => 'application/json'])->assertCreated();

        $code = $res->json('data.reference_code');
        $this->assertStringStartsWith('INF-', $code);

        $this->assertDatabaseHas('influencer_applications', [
            'reference_code' => $code,
            'email' => 'maya.lin@example.com',
            'instagram_handle' => '@mayalin',
        ]);
        $this->assertDatabaseCount('career_applications', 0);

        [, $admin] = $this->actingAsRole('super_admin');
        $list = $this->getJson('/api/v1/admin/influencer-applications', $admin)->assertOk();
        $this->assertCount(1, $list->json('data.data'));

        $appId = $list->json('data.data.0.id');
        $this->patchJson("/api/v1/admin/influencer-applications/{$appId}/status", [
            'status' => 'screening',
            'internal_notes' => 'Strong NYC luxury reach.',
        ], $admin)->assertOk()->assertJsonPath('data.application.status', 'screening');
    }
}
