<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\IntegrationSetting;
use App\Support\ApiResponse;
use App\Support\IntegrationSecretMask;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;

class IntegrationSettingsController extends Controller
{
    public function show(): JsonResponse
    {
        if (! Schema::hasTable('integration_settings')) {
            return ApiResponse::data([
                'settings' => $this->emptyMaskedPayload(),
            ]);
        }

        $row = IntegrationSetting::current();

        return ApiResponse::data([
            'settings' => $this->maskedPayload($row),
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        if (! Schema::hasTable('integration_settings')) {
            return ApiResponse::error('SCHEMA_MISSING', 'Integration settings storage is not available.', 503);
        }

        $validated = $request->validate([
            'google_maps_browser_key' => 'nullable|string|max:500',
            'google_maps_server_key' => 'nullable|string|max:2000',
            'stripe_publishable_key' => 'nullable|string|max:500',
            'stripe_secret_key' => 'nullable|string|max:500',
            'stripe_webhook_secret' => 'nullable|string|max:500',
            'sms_provider' => 'nullable|string|max:100',
            'sms_api_key' => 'nullable|string|max:500',
            'docusign_integration_key' => 'nullable|string|max:255',
            'docusign_secret' => 'nullable|string|max:500',
            'docusign_account_id' => 'nullable|string|max:255',
            'payment_provider' => 'nullable|string|in:stripe,square',
        ]);

        $settings = IntegrationSetting::current();
        $persist = [];
        $auditFields = [];

        $publishable = [
            'google_maps_browser_key',
            'stripe_publishable_key',
            'sms_provider',
            'docusign_integration_key',
            'docusign_account_id',
            'payment_provider',
        ];

        foreach ($publishable as $key) {
            if (array_key_exists($key, $validated) && $validated[$key] !== null && $validated[$key] !== '') {
                $persist[$key] = $validated[$key];
                $auditFields[$key] = $validated[$key];
            }
        }

        $secrets = [
            'google_maps_server_key',
            'stripe_secret_key',
            'stripe_webhook_secret',
            'sms_api_key',
            'docusign_secret',
        ];

        foreach ($secrets as $key) {
            if (! array_key_exists($key, $validated)) {
                continue;
            }
            if (IntegrationSecretMask::shouldPersistIncoming($validated[$key])) {
                $persist[$key] = $validated[$key];
                $auditFields[$key] = ['updated' => true];
            }
        }

        if ($persist !== []) {
            $settings->update($persist);
            AuditLog::record(
                'integration_settings.updated',
                $request->user()?->id,
                $auditFields,
                $settings
            );
        }

        return ApiResponse::data([
            'message' => 'Integration settings updated successfully.',
            'settings' => $this->maskedPayload($settings->fresh()),
        ]);
    }

    public function publicConfig(): JsonResponse
    {
        $browserKey = env('GOOGLE_MAPS_BROWSER_KEY');
        $publishable = env('STRIPE_KEY');
        $provider = 'stripe';

        if (Schema::hasTable('integration_settings')) {
            try {
                $row = IntegrationSetting::current();
                $browserKey = $row->google_maps_browser_key ?: $browserKey;
                $publishable = $row->stripe_publishable_key ?: $publishable;
                $provider = $row->payment_provider ?: 'stripe';
            } catch (\Throwable) {
                // env fallbacks above
            }
        }

        return ApiResponse::data([
            'google_maps_browser_key' => $browserKey ?: null,
            'stripe_publishable_key' => $publishable ?: null,
            'payment_provider' => $provider,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function maskedPayload(IntegrationSetting $row): array
    {
        return [
            'google_maps_browser_key' => $row->google_maps_browser_key,
            'google_maps_server_key' => IntegrationSecretMask::mask($row->google_maps_server_key),
            'google_maps_server_key_configured' => IntegrationSecretMask::isConfigured($row->google_maps_server_key),
            'stripe_publishable_key' => $row->stripe_publishable_key,
            'stripe_secret_key' => IntegrationSecretMask::mask($row->stripe_secret_key),
            'stripe_secret_key_configured' => IntegrationSecretMask::isConfigured($row->stripe_secret_key),
            'stripe_webhook_secret' => IntegrationSecretMask::mask($row->stripe_webhook_secret),
            'stripe_webhook_secret_configured' => IntegrationSecretMask::isConfigured($row->stripe_webhook_secret),
            'sms_provider' => $row->sms_provider,
            'sms_api_key' => IntegrationSecretMask::mask($row->sms_api_key),
            'sms_api_key_configured' => IntegrationSecretMask::isConfigured($row->sms_api_key),
            'docusign_integration_key' => $row->docusign_integration_key,
            'docusign_secret' => IntegrationSecretMask::mask($row->docusign_secret),
            'docusign_secret_configured' => IntegrationSecretMask::isConfigured($row->docusign_secret),
            'docusign_account_id' => $row->docusign_account_id,
            'payment_provider' => $row->payment_provider ?: 'stripe',
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function emptyMaskedPayload(): array
    {
        return [
            'google_maps_browser_key' => null,
            'google_maps_server_key' => null,
            'google_maps_server_key_configured' => false,
            'stripe_publishable_key' => null,
            'stripe_secret_key' => null,
            'stripe_secret_key_configured' => false,
            'stripe_webhook_secret' => null,
            'stripe_webhook_secret_configured' => false,
            'sms_provider' => null,
            'sms_api_key' => null,
            'sms_api_key_configured' => false,
            'docusign_integration_key' => null,
            'docusign_secret' => null,
            'docusign_secret_configured' => false,
            'docusign_account_id' => null,
            'payment_provider' => 'stripe',
        ];
    }
}