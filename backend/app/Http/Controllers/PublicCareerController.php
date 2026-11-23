<?php

namespace App\Http\Controllers;

use App\Models\CareerApplication;
use App\Models\CareerApplicationDocument;
use App\Models\CareerJob;
use App\Models\PlatformSetting;
use App\Models\SiteTier;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class PublicCareerController extends Controller
{
    private function isCareersEnabled(): bool
    {
        if (!Schema::hasTable('platform_settings') || !Schema::hasColumn('platform_settings', 'careers_enabled')) {
            return true;
        }

        try {
            $settings = PlatformSetting::current();
            return (bool) ($settings->careers_enabled ?? true);
        } catch (\Throwable) {
            return true;
        }
    }

    public function status(): JsonResponse
    {
        return ApiResponse::data([
            'enabled' => $this->isCareersEnabled(),
        ]);
    }

    public function tiers(): JsonResponse
    {
        if (Schema::hasTable('site_tiers')) {
            $tiers = SiteTier::where('is_active', true)
                ->orderBy('sort_order')
                ->get(['id', 'kind', 'tier', 'label', 'title'])
                ->map(fn ($t) => [
                    'id' => $t->id,
                    'label' => $t->label,
                    'title' => $t->title,
                    'kind' => $t->kind,
                    'tier' => $t->tier,
                ]);

            if ($tiers->isNotEmpty()) {
                return ApiResponse::data($tiers);
            }
        }

        // Standard fallback tiers
        return ApiResponse::data([
            ['id' => 'tier-1', 'label' => 'TIER 1 · PROFESSIONAL', 'title' => 'Professional Chauffeur', 'kind' => 'driver'],
            ['id' => 'tier-2', 'label' => 'TIER 2 · EXECUTIVE', 'title' => 'Executive Chauffeur', 'kind' => 'driver'],
            ['id' => 'tier-3', 'label' => 'TIER 3 · SHADOW / ARMORED', 'title' => 'Tactical & Armored Mobility', 'kind' => 'driver'],
            ['id' => 'tier-4', 'label' => 'TIER 4 · CLOSE PROTECTION', 'title' => 'Armed Protection Specialist', 'kind' => 'security'],
            ['id' => 'corporate', 'label' => 'CORPORATE / OPERATIONS', 'title' => 'Dispatch & Fleet Support', 'kind' => 'staff'],
        ]);
    }

    public function index(): JsonResponse
    {
        if (!$this->isCareersEnabled()) {
            return ApiResponse::error('careers_disabled', 'Careers portal is currently closed.', 403);
        }

        $jobs = CareerJob::published()
            ->orderBy('sort_order')
            ->orderByDesc('created_at')
            ->get([
                'id',
                'title',
                'slug',
                'department',
                'location',
                'employment_type',
                'salary_range',
                'tier_recommendation',
                'summary',
                'created_at',
            ]);

        return ApiResponse::data($jobs);
    }

    public function show(string $slug): JsonResponse
    {
        if (!$this->isCareersEnabled()) {
            return ApiResponse::error('careers_disabled', 'Careers portal is currently closed.', 403);
        }

        $job = CareerJob::published()->where('slug', $slug)->first();

        if (!$job) {
            return ApiResponse::error('job_not_found', 'Career opportunity not found or no longer active.', 404);
        }

        return ApiResponse::data($job);
    }

    public function apply(Request $request, int|string $id): JsonResponse
    {
        if (!$this->isCareersEnabled()) {
            return ApiResponse::error('careers_disabled', 'Applications are currently closed.', 403);
        }

        $job = CareerJob::where('id', $id)->orWhere('slug', $id)->first();
        if (!$job || $job->status !== 'published') {
            return ApiResponse::error('job_not_found', 'Job opening not found or applications are closed.', 404);
        }

        $validated = $request->validate([
            'full_name' => 'required|string|max:120',
            'email' => 'required|email|max:150',
            'phone' => 'required|string|max:30',
            'city' => 'nullable|string|max:100',
            'selected_tier' => 'nullable|string|max:100',
            'license_number' => 'nullable|string|max:60',
            'years_experience' => 'nullable|integer|min:0|max:50',
            'cover_note' => 'nullable|string|max:4000',
            'resume' => 'nullable|file|mimes:pdf,doc,docx,jpg,jpeg,png|max:15360',
            'drivers_license' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:15360',
            'tlc_license' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:15360',
            'security_license' => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:15360',
            'additional_doc' => 'nullable|file|mimes:pdf,doc,docx,jpg,jpeg,png|max:15360',
        ]);

        return DB::transaction(function () use ($validated, $job, $request) {
            $application = CareerApplication::create([
                'career_job_id' => $job->id,
                'full_name' => $validated['full_name'],
                'email' => strtolower(trim($validated['email'])),
                'phone' => $validated['phone'],
                'city' => $validated['city'] ?? null,
                'selected_tier' => $validated['selected_tier'] ?? null,
                'license_number' => $validated['license_number'] ?? null,
                'years_experience' => isset($validated['years_experience']) ? (int) $validated['years_experience'] : null,
                'cover_note' => $validated['cover_note'] ?? null,
                'status' => CareerApplication::STATUS_NEW,
            ]);

            $docTypes = [
                'resume' => 'Resume / Curriculum Vitae',
                'drivers_license' => "Driver's License",
                'tlc_license' => 'TLC / Chauffeur License',
                'security_license' => 'Security / Armed Guard License',
                'additional_doc' => 'Additional Supporting Credential',
            ];

            foreach ($docTypes as $field => $label) {
                if ($request->hasFile($field)) {
                    $file = $request->file($field);
                    $path = $file->store("career_documents/{$application->id}", 'public');

                    CareerApplicationDocument::create([
                        'career_application_id' => $application->id,
                        'document_type' => $field,
                        'title' => $label,
                        'file_name' => $file->getClientOriginalName(),
                        'file_path' => $path,
                        'file_size' => $file->getSize(),
                        'mime_type' => $file->getMimeType(),
                    ]);
                }
            }

            return ApiResponse::created([
                'reference_code' => $application->reference_code,
                'full_name' => $application->full_name,
                'job_title' => $job->title,
                'message' => 'Your application has been received successfully by Archer Executive Services.',
            ]);
        });
    }
}
