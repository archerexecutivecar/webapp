<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\InfluencerApplication;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AdminInfluencerApplicationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = InfluencerApplication::query()->orderByDesc('id');

        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }

        if ($request->filled('search')) {
            $s = trim((string) $request->query('search'));
            $query->where(function ($q) use ($s) {
                $q->where('full_name', 'like', "%{$s}%")
                    ->orWhere('email', 'like', "%{$s}%")
                    ->orWhere('phone', 'like', "%{$s}%")
                    ->orWhere('reference_code', 'like', "%{$s}%")
                    ->orWhere('instagram_handle', 'like', "%{$s}%");
            });
        }

        return ApiResponse::data($query->paginate($request->integer('per_page', 25)));
    }

    public function show(int $id): JsonResponse
    {
        return ApiResponse::data(InfluencerApplication::findOrFail($id));
    }

    public function updateStatus(Request $request, int $id): JsonResponse
    {
        $application = InfluencerApplication::findOrFail($id);

        $validated = $request->validate([
            'status' => 'required|string|in:' . implode(',', InfluencerApplication::VALID_STATUSES),
            'internal_notes' => 'nullable|string',
        ]);

        $oldStatus = $application->status;
        $application->status = $validated['status'];
        if (array_key_exists('internal_notes', $validated)) {
            $application->internal_notes = $validated['internal_notes'];
        }
        $application->save();

        AuditLog::record(
            'influencer.application_status_changed',
            $request->user()?->id,
            [
                'application_id' => $application->id,
                'reference_code' => $application->reference_code,
                'old_status' => $oldStatus,
                'new_status' => $application->status,
            ],
            $application
        );

        return ApiResponse::data([
            'message' => 'Influencer application status updated.',
            'application' => $application,
        ]);
    }

    public function downloadResume(int $id): StreamedResponse|JsonResponse
    {
        $application = InfluencerApplication::findOrFail($id);
        if (! $application->resume_path || ! Storage::disk('local')->exists($application->resume_path)) {
            return ApiResponse::error('resume_not_found', 'No resume uploaded for this application.', 404);
        }

        return Storage::disk('local')->download(
            $application->resume_path,
            $application->resume_name ?: 'resume.pdf'
        );
    }
}
