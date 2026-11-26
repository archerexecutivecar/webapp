<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\CancellationReason;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CancellationReasonController extends Controller
{
    public function index(): JsonResponse
    {
        $reasons = CancellationReason::where('is_active', true)
            ->orderBy('label')
            ->get(['id', 'label', 'is_active']);

        return ApiResponse::data(['reasons' => $reasons]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'label' => 'required|string|max:150',
        ]);

        $label = trim($validated['label']);
        $existing = CancellationReason::whereRaw('LOWER(label) = ?', [strtolower($label)])->first();

        if ($existing) {
            if (! $existing->is_active) {
                $existing->update(['is_active' => true]);
            }

            return ApiResponse::data([
                'reason' => $existing->only(['id', 'label', 'is_active']),
                'created' => false,
            ]);
        }

        $reason = CancellationReason::create([
            'label' => $label,
            'is_active' => true,
            'created_by' => $request->user()?->id,
        ]);

        AuditLog::record(
            'cancellation_reason.created',
            $request->user()?->id,
            ['reason_id' => $reason->id, 'label' => $reason->label],
            $reason
        );

        return ApiResponse::created([
            'reason' => $reason->only(['id', 'label', 'is_active']),
            'created' => true,
        ]);
    }
}
