<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\PlatformSetting;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;

class PlatformSettingsController extends Controller
{
    private function defaultSettings(): array
    {
        return [
            'min_booking_notice_hours' => 48,
            'unaccepted_alert_hours' => 24,
            'cancellation_window_hours' => 24,
            'customer_notice_channel' => 'SMS + email',
            'email_notifications_enabled' => false,
            'phone_notifications_enabled' => true,
            'driver_btn_step1' => 'On my way',
            'driver_btn_step2' => 'At your doorstep',
            'driver_btn_step3' => 'Ride started',
            'driver_btn_step4' => 'Ride ends',
        ];
    }

    public function show(): JsonResponse
    {
        if (!Schema::hasTable('platform_settings')) {
            return ApiResponse::data([
                'settings' => $this->defaultSettings(),
            ]);
        }

        try {
            $settings = PlatformSetting::current();
        } catch (\Throwable $e) {
            return ApiResponse::data([
                'settings' => $this->defaultSettings(),
            ]);
        }

        return ApiResponse::data([
            'settings' => $settings,
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'min_booking_notice_hours' => 'required|integer|min:1',
            'unaccepted_alert_hours' => 'required|integer|min:1',
            'cancellation_window_hours' => 'required|integer|min:0',
            'customer_notice_channel' => 'required|string',
            'email_notifications_enabled' => 'sometimes|boolean',
            'phone_notifications_enabled' => 'sometimes|boolean',
            'driver_btn_step1' => 'required|string|max:50',
            'driver_btn_step2' => 'required|string|max:50',
            'driver_btn_step3' => 'required|string|max:50',
            'driver_btn_step4' => 'required|string|max:50',
        ]);

        $settings = PlatformSetting::current();
        $settings->update($validated);

        AuditLog::record(
            'platform_settings.updated',
            $request->user()?->id,
            $validated,
            $settings
        );

        return ApiResponse::data([
            'message' => 'Platform settings updated successfully.',
            'settings' => $settings,
        ]);
    }

    public function reset(Request $request): JsonResponse
    {
        $settings = PlatformSetting::current();
        $defaults = [
            'min_booking_notice_hours' => 48,
            'unaccepted_alert_hours' => 24,
            'cancellation_window_hours' => 24,
            'customer_notice_channel' => 'SMS + email',
            'email_notifications_enabled' => false,
            'phone_notifications_enabled' => true,
            'driver_btn_step1' => 'On my way',
            'driver_btn_step2' => 'At your doorstep',
            'driver_btn_step3' => 'Ride started',
            'driver_btn_step4' => 'Ride ends',
        ];

        $settings->update($defaults);

        AuditLog::record(
            'platform_settings.reset',
            $request->user()?->id,
            ['action' => 'reset_sample_defaults'],
            $settings
        );

        return ApiResponse::data([
            'message' => 'Settings reset to sample defaults.',
            'settings' => $settings,
        ]);
    }
}
