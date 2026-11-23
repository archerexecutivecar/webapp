<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\PlatformSetting;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;

class AdminCareerToggleController extends Controller
{
    /**
     * Dedicated Single-Touchpoint Feature Switch
     * URL in Admin: /settings/careers
     */
    public function show(): JsonResponse
    {
        $enabled = true;
        $updatedAt = null;

        if (Schema::hasTable('platform_settings')) {
            $settings = PlatformSetting::current();
            $enabled = (bool) ($settings->careers_enabled ?? true);
            $updatedAt = $settings->updated_at?->toIso8601String();
        }

        // Find last audit entry for toggle if any
        $lastAudit = AuditLog::where('event', 'careers.feature_toggled')
            ->latest('id')
            ->first();

        return ApiResponse::data([
            'enabled' => $enabled,
            'updated_at' => $updatedAt,
            'last_toggled_at' => $lastAudit?->created_at?->toIso8601String() ?? $updatedAt,
            'last_toggled_by' => $lastAudit?->actor_id ? "Admin #{$lastAudit->actor_id}" : 'System Admin',
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'enabled' => 'required|boolean',
        ]);

        $settings = PlatformSetting::current();
        $oldState = (bool) ($settings->careers_enabled ?? true);
        $newState = (bool) $validated['enabled'];

        $settings->careers_enabled = $newState;
        $settings->save();

        AuditLog::record(
            'careers.feature_toggled',
            $request->user()?->id,
            [
                'previous_state' => $oldState,
                'new_state' => $newState,
                'ip' => $request->ip(),
            ],
            $settings
        );

        return ApiResponse::data([
            'enabled' => $newState,
            'message' => $newState ? 'Careers feature is now active and public.' : 'Careers feature has been turned OFF.',
            'updated_at' => $settings->updated_at->toIso8601String(),
        ]);
    }
}
