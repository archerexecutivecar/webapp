<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\CareerApplication;
use App\Models\Driver;
use App\Models\DriverTier;
use App\Models\SiteTier;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class AdminCareerApplicationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = CareerApplication::with(['job:id,title,slug,department', 'documents'])
            ->orderByDesc('id');

        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }

        if ($request->filled('job_id')) {
            $query->where('career_job_id', $request->query('job_id'));
        }

        if ($request->filled('search')) {
            $s = trim($request->query('search'));
            $query->where(function ($q) use ($s) {
                $q->where('full_name', 'like', "%{$s}%")
                    ->orWhere('email', 'like', "%{$s}%")
                    ->orWhere('phone', 'like', "%{$s}%")
                    ->orWhere('reference_code', 'like', "%{$s}%");
            });
        }

        $applications = $query->paginate($request->integer('per_page', 25));

        return ApiResponse::data($applications);
    }

    public function show(int $id): JsonResponse
    {
        $application = CareerApplication::with(['job', 'documents'])->findOrFail($id);
        return ApiResponse::data($application);
    }

    public function updateStatus(Request $request, int $id): JsonResponse
    {
        $application = CareerApplication::findOrFail($id);

        $validated = $request->validate([
            'status' => 'required|string|in:' . implode(',', CareerApplication::VALID_STATUSES),
            'internal_notes' => 'nullable|string',
            'rejection_reason' => 'nullable|string|max:255',
        ]);

        $oldStatus = $application->status;
        $application->status = $validated['status'];

        if (isset($validated['internal_notes'])) {
            $application->internal_notes = $validated['internal_notes'];
        }

        if (isset($validated['rejection_reason'])) {
            $application->rejection_reason = $validated['rejection_reason'];
        }

        $application->save();

        AuditLog::record(
            'careers.application_status_changed',
            $request->user()?->id,
            [
                'application_id' => $application->id,
                'candidate' => $application->full_name,
                'from_status' => $oldStatus,
                'to_status' => $application->status,
                'rejection_reason' => $application->rejection_reason,
            ],
            $application
        );

        return ApiResponse::data([
            'application' => $application->load(['job', 'documents']),
            'message' => "Application status changed from {$oldStatus} to {$application->status}.",
        ]);
    }

    public function updateNotes(Request $request, int $id): JsonResponse
    {
        $application = CareerApplication::findOrFail($id);

        $validated = $request->validate([
            'internal_notes' => 'required|string',
        ]);

        $application->internal_notes = $validated['internal_notes'];
        $application->save();

        AuditLog::record(
            'careers.application_notes_updated',
            $request->user()?->id,
            ['application_id' => $application->id],
            $application
        );

        return ApiResponse::data($application);
    }

    /**
     * One-click onboarding: Convert a hired applicant to a Driver profile in the Archer fleet
     */
    public function convertToDriver(Request $request, int $id): JsonResponse
    {
        $application = CareerApplication::findOrFail($id);

        // Check if driver with this email or phone already exists
        $existing = Driver::where('email', $application->email)
            ->orWhere('phone', $application->phone)
            ->first();

        if ($existing) {
            return ApiResponse::error(
                'driver_exists',
                "A driver profile already exists with this email or phone (Driver ID: {$existing->id}).",
                422
            );
        }

        return DB::transaction(function () use ($application, $request) {
            // Find appropriate tier
            $tierId = null;
            if (Schema::hasTable('driver_tiers')) {
                $tier = DriverTier::where('is_active', true)->orderBy('sort_order')->first();
                $tierId = $tier?->id;
            }

            $driver = Driver::create([
                'name' => $application->full_name,
                'email' => $application->email,
                'phone' => $application->phone,
                'tier_id' => $tierId,
                'is_active' => false, // Default inactive until documents & vehicle verified
                'is_online' => false,
            ]);

            // Update application status to hired
            $application->status = CareerApplication::STATUS_HIRED;
            $note = ($application->internal_notes ? $application->internal_notes . "\n" : '') .
                "Converted to Driver profile (Driver ID: {$driver->id}) on " . now()->toFormattedDateString();
            $application->internal_notes = $note;
            $application->save();

            AuditLog::record(
                'careers.applicant_converted_to_driver',
                $request->user()?->id,
                [
                    'application_id' => $application->id,
                    'driver_id' => $driver->id,
                    'name' => $application->full_name,
                ],
                $driver
            );

            return ApiResponse::created([
                'driver' => $driver,
                'application' => $application,
                'message' => "Candidate {$application->full_name} successfully converted to Driver profile (ID: {$driver->id}).",
            ]);
        });
    }
}
