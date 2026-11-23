<?php

namespace Tests\Feature\Api;

use App\Models\AuditLog;
use App\Models\CareerApplication;
use App\Models\CareerJob;
use App\Models\Driver;
use App\Models\PlatformSetting;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\Support\CreatesStaff;
use Tests\TestCase;

class CareersFeatureTest extends TestCase
{
    use RefreshDatabase, CreatesStaff;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
    }

    public function test_careers_toggle_endpoint_and_audit(): void
    {
        [$user, $headers] = $this->actingAsRole('super_admin');

        // Check initial state
        $res = $this->withHeaders($headers)->getJson('/api/v1/admin/careers/toggle');
        $res->assertOk();
        $this->assertTrue($res->json('data.enabled'));

        // Toggle OFF
        $updateRes = $this->withHeaders($headers)->putJson('/api/v1/admin/careers/toggle', [
            'enabled' => false,
        ]);
        $updateRes->assertOk();
        $this->assertFalse($updateRes->json('data.enabled'));

        // Public status should now report false
        $statusRes = $this->getJson('/api/v1/careers/status');
        $statusRes->assertOk();
        $this->assertFalse($statusRes->json('data.enabled'));

        // Public jobs endpoint returns 403 when disabled
        $jobsRes = $this->getJson('/api/v1/careers/jobs');
        $jobsRes->assertStatus(403);
        $this->assertEquals('careers_disabled', $jobsRes->json('error.code'));

        // Verify audit log
        $this->assertDatabaseHas('audit_logs', [
            'event' => 'careers.feature_toggled',
            'actor_id' => $user->id,
        ]);

        // Toggle back ON
        $toggleOn = $this->withHeaders($headers)->putJson('/api/v1/admin/careers/toggle', [
            'enabled' => true,
        ]);
        $toggleOn->assertOk();
        $this->assertTrue($toggleOn->json('data.enabled'));

        $publicJobs = $this->getJson('/api/v1/careers/jobs');
        $publicJobs->assertOk();
    }

    public function test_public_can_view_tiers_and_jobs_when_enabled(): void
    {
        $tiersRes = $this->getJson('/api/v1/careers/tiers');
        $tiersRes->assertOk();
        $this->assertNotEmpty($tiersRes->json('data'));

        $job = CareerJob::create([
            'title' => 'VIP Chauffeur Specialist',
            'slug' => 'vip-chauffeur-specialist',
            'department' => 'Chauffeur Operations',
            'location' => 'New York, NY',
            'employment_type' => 'Full-Time',
            'salary_range' => '$40 - $55 / hr',
            'tier_recommendation' => 'Tier 2 · Executive',
            'description' => 'Elite executive chauffeur duties.',
            'status' => 'published',
        ]);

        $res = $this->getJson('/api/v1/careers/jobs');
        $res->assertOk();
        $this->assertTrue(collect($res->json('data'))->contains('slug', 'vip-chauffeur-specialist'));

        $singleRes = $this->getJson('/api/v1/careers/jobs/vip-chauffeur-specialist');
        $singleRes->assertOk();
        $this->assertEquals('VIP Chauffeur Specialist', $singleRes->json('data.title'));
    }

    public function test_candidate_can_submit_application_with_tier_and_documents(): void
    {
        $job = CareerJob::create([
            'title' => 'Close Protection Chauffeur',
            'slug' => 'close-protection-chauffeur',
            'department' => 'Security Detail',
            'location' => 'Tri-State',
            'employment_type' => 'Full-Time',
            'description' => 'Security escort transit.',
            'status' => 'published',
        ]);

        $resumeFile = UploadedFile::fake()->create('john_doe_resume.pdf', 200, 'application/pdf');
        $licenseFile = UploadedFile::fake()->image('tlc_license.jpg');

        $payload = [
            'full_name' => 'Johnathan Archer Doe',
            'email' => 'john.doe@example.com',
            'phone' => '+1 (555) 234-5678',
            'city' => 'Manhattan, NY',
            'selected_tier' => 'TIER 3 · SHADOW / ARMORED',
            'license_number' => 'TLC-884910',
            'years_experience' => 5,
            'cover_note' => '5 years executive driving experience with clean record.',
            'resume' => $resumeFile,
            'tlc_license' => $licenseFile,
        ];

        $res = $this->postJson("/api/v1/careers/jobs/{$job->id}/apply", $payload);
        $res->assertCreated();
        $this->assertNotNull($res->json('data.reference_code'));

        $this->assertDatabaseHas('career_applications', [
            'career_job_id' => $job->id,
            'full_name' => 'Johnathan Archer Doe',
            'email' => 'john.doe@example.com',
            'selected_tier' => 'TIER 3 · SHADOW / ARMORED',
            'license_number' => 'TLC-884910',
            'status' => 'new',
        ]);

        $app = CareerApplication::where('email', 'john.doe@example.com')->first();
        $this->assertCount(2, $app->documents);
        $this->assertDatabaseHas('career_application_documents', [
            'career_application_id' => $app->id,
            'document_type' => 'resume',
            'file_name' => 'john_doe_resume.pdf',
        ]);

        // Candidate can track their application
        $trackRes = $this->postJson('/api/v1/careers/track', [
            'reference_code' => $app->reference_code,
            'email' => 'john.doe@example.com',
        ]);
        $trackRes->assertOk();
        $this->assertEquals('new', $trackRes->json('data.status'));
        $this->assertEquals('Application Received', $trackRes->json('data.status_title'));
        $this->assertEquals(1, $trackRes->json('data.stage'));
    }

    public function test_admin_can_advance_applicant_pipeline_and_convert_to_driver(): void
    {
        [$user, $headers] = $this->actingAsRole('super_admin');

        $job = CareerJob::create([
            'title' => 'Chauffeur Specialist',
            'slug' => 'chauffeur-specialist',
            'department' => 'Chauffeur Operations',
            'location' => 'New York, NY',
            'employment_type' => 'Full-Time',
            'description' => 'Chauffeur duties.',
            'status' => 'published',
        ]);

        $app = CareerApplication::create([
            'career_job_id' => $job->id,
            'full_name' => 'Marcus Vance',
            'email' => 'marcus.vance@example.com',
            'phone' => '+1 (555) 999-1234',
            'selected_tier' => 'TIER 2 · EXECUTIVE',
            'license_number' => 'TLC-990011',
            'status' => 'new',
        ]);

        // Advance to screening
        $res1 = $this->withHeaders($headers)->patchJson("/api/v1/admin/careers/applications/{$app->id}/status", [
            'status' => 'screening',
            'internal_notes' => 'Checked TLC license validity, verified clean status.',
        ]);
        $res1->assertOk();
        $this->assertEquals('screening', $res1->json('data.application.status'));

        // Advance to interview
        $res2 = $this->withHeaders($headers)->patchJson("/api/v1/admin/careers/applications/{$app->id}/status", [
            'status' => 'interview',
        ]);
        $res2->assertOk();
        $this->assertEquals('interview', $res2->json('data.application.status'));

        // Convert to Driver profile
        $convertRes = $this->withHeaders($headers)->postJson("/api/v1/admin/careers/applications/{$app->id}/convert-to-driver");
        $convertRes->assertCreated();

        $this->assertDatabaseHas('drivers', [
            'email' => 'marcus.vance@example.com',
            'phone' => '+1 (555) 999-1234',
            'name' => 'Marcus Vance',
        ]);

        $this->assertDatabaseHas('career_applications', [
            'id' => $app->id,
            'status' => 'hired',
        ]);
    }
}
