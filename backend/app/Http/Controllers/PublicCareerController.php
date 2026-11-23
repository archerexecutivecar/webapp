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

        $response = DB::transaction(function () use ($validated, $job, $request) {
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

        // Send email confirmation
        try {
            $latestApp = CareerApplication::where('career_job_id', $job->id)
                ->where('email', strtolower(trim($validated['email'])))
                ->latest('id')
                ->first();
            if ($latestApp) {
                \App\Support\CareerMailer::sendApplicationConfirmation($latestApp, $job);
            }
        } catch (\Throwable) {
            // Logged inside CareerMailer
        }

        return $response;
    }

    public function track(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'reference_code' => 'required|string|max:40',
            'email' => 'nullable|email|max:150',
        ]);

        $code = strtoupper(trim($validated['reference_code']));
        $query = CareerApplication::with('job')->where('reference_code', $code);

        if (!empty($validated['email'])) {
            $email = strtolower(trim($validated['email']));
            $query->where('email', $email);
        }

        $app = $query->first();

        if (!$app) {
            return ApiResponse::error(
                'application_not_found',
                'No application found matching this reference code and email. Please check your reference code and try again.',
                404
            );
        }

        $statusInfo = match ($app->status) {
            'new' => [
                'stage' => 1,
                'total_stages' => 5,
                'title' => 'Application Received',
                'description' => 'Your application and credentials have been received and are queued for initial review by our recruiting department.',
            ],
            'screening' => [
                'stage' => 2,
                'total_stages' => 5,
                'title' => 'Credentials Under Review',
                'description' => 'Our recruitment specialists are verifying your driving record, TLC/security credentials, and qualifications.',
            ],
            'interview' => [
                'stage' => 3,
                'total_stages' => 5,
                'title' => 'Interview & Driving Assessment',
                'description' => 'You have progressed to the interview and practical road evaluation stage. Please check your email for scheduling details.',
            ],
            'offer' => [
                'stage' => 4,
                'total_stages' => 5,
                'title' => 'Offer Extended',
                'description' => 'Congratulations! An employment offer has been extended. Our talent team will contact you directly to finalize paperwork.',
            ],
            'hired' => [
                'stage' => 5,
                'total_stages' => 5,
                'title' => 'Hired & Onboarding Initiated',
                'description' => 'Welcome to Archer Executive Services! Your driver profile has been created and onboarding sequence is underway.',
            ],
            'rejected' => [
                'stage' => 0,
                'total_stages' => 5,
                'title' => 'Application Concluded',
                'description' => 'Thank you for your interest. While this role has been filled or closed, we will keep your credentials on file for future opportunities.',
            ],
            'withdrawn' => [
                'stage' => 0,
                'total_stages' => 5,
                'title' => 'Application Withdrawn',
                'description' => 'This application has been marked as withdrawn.',
            ],
            default => [
                'stage' => 1,
                'total_stages' => 5,
                'title' => ucfirst($app->status),
                'description' => 'Your application is currently being processed.',
            ],
        };

        return ApiResponse::data([
            'reference_code' => $app->reference_code,
            'full_name' => $app->full_name,
            'job_title' => $app->job?->title ?? 'General Application',
            'department' => $app->job?->department ?? 'Operations',
            'location' => $app->job?->location ?? 'New York, NY',
            'selected_tier' => $app->selected_tier,
            'status' => $app->status,
            'status_title' => $statusInfo['title'],
            'status_description' => $statusInfo['description'],
            'stage' => $statusInfo['stage'],
            'total_stages' => $statusInfo['total_stages'],
            'applied_at' => $app->created_at->toIso8601String(),
            'updated_at' => $app->updated_at->toIso8601String(),
        ]);
    }
}
