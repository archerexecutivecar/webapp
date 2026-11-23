<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\CareerJob;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AdminCareerJobController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $status = $request->query('status');

        $query = CareerJob::query()
            ->withCount([
                'applications',
                'applications as new_applications_count' => function ($q) {
                    $q->where('status', 'new');
                },
            ])
            ->orderBy('sort_order')
            ->orderByDesc('id');

        if ($status && in_array($status, ['draft', 'published', 'paused', 'closed'], true)) {
            $query->where('status', $status);
        }

        return ApiResponse::data($query->get());
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => 'required|string|max:150',
            'department' => 'required|string|max:100',
            'location' => 'required|string|max:120',
            'employment_type' => 'required|string|max:80',
            'salary_range' => 'nullable|string|max:80',
            'tier_recommendation' => 'nullable|string|max:100',
            'summary' => 'nullable|string|max:500',
            'description' => 'required|string',
            'requirements' => 'nullable|array',
            'benefits' => 'nullable|array',
            'status' => 'required|string|in:draft,published,paused,closed',
            'sort_order' => 'nullable|integer',
        ]);

        $validated['created_by'] = $request->user()?->id;

        $job = CareerJob::create($validated);

        AuditLog::record(
            'careers.job_created',
            $request->user()?->id,
            ['job_id' => $job->id, 'title' => $job->title, 'status' => $job->status],
            $job
        );

        return ApiResponse::created($job);
    }

    public function show(int $id): JsonResponse
    {
        $job = CareerJob::withCount('applications')->findOrFail($id);
        return ApiResponse::data($job);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $job = CareerJob::findOrFail($id);

        $validated = $request->validate([
            'title' => 'sometimes|required|string|max:150',
            'slug' => 'sometimes|required|string|max:160|unique:career_jobs,slug,' . $job->id,
            'department' => 'sometimes|required|string|max:100',
            'location' => 'sometimes|required|string|max:120',
            'employment_type' => 'sometimes|required|string|max:80',
            'salary_range' => 'nullable|string|max:80',
            'tier_recommendation' => 'nullable|string|max:100',
            'summary' => 'nullable|string|max:500',
            'description' => 'sometimes|required|string',
            'requirements' => 'nullable|array',
            'benefits' => 'nullable|array',
            'status' => 'sometimes|required|string|in:draft,published,paused,closed',
            'sort_order' => 'nullable|integer',
        ]);

        $job->update($validated);

        AuditLog::record(
            'careers.job_updated',
            $request->user()?->id,
            ['job_id' => $job->id, 'changes' => array_keys($validated)],
            $job
        );

        return ApiResponse::data($job);
    }

    public function updateStatus(Request $request, int $id): JsonResponse
    {
        $job = CareerJob::findOrFail($id);

        $validated = $request->validate([
            'status' => 'required|string|in:draft,published,paused,closed',
        ]);

        $oldStatus = $job->status;
        $job->status = $validated['status'];
        $job->save();

        AuditLog::record(
            'careers.job_status_changed',
            $request->user()?->id,
            ['job_id' => $job->id, 'from' => $oldStatus, 'to' => $job->status],
            $job
        );

        return ApiResponse::data([
            'job' => $job,
            'message' => "Job status updated to {$job->status}.",
        ]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $job = CareerJob::findOrFail($id);
        $title = $job->title;
        $job->delete();

        AuditLog::record(
            'careers.job_deleted',
            $request->user()?->id,
            ['job_id' => $id, 'title' => $title]
        );

        return ApiResponse::data(['message' => 'Job posting deleted successfully.']);
    }
}
