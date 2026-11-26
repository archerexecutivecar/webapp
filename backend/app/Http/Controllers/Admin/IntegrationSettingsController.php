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

        try {
            $row = IntegrationSetting::current();

            return ApiResponse::data([
                'settings' => $this->maskedPayload($row),
            ]);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('IntegrationSettingsController@show error: ' . $e->getMessage(), [
                'exception' => $e,
            ]);

            return ApiResponse::data([
                'settings' => $this->emptyMaskedPayload(),
            ]);
        }
    }

    public function update(Request $request): JsonResponse
    {
        if (! Schema::hasTable('integration_settings')) {
            return ApiResponse::error('SCHEMA_MISSING', 'Integration settings storage is not available.', 503);
        }

        $validated = $request->validate([
            'google_maps_browser_key' => 'nullable|string|max:500',
            'google_maps_server_key' => 'nullable|string|max:2000',
            'google_maps_country_codes' => 'nullable|string|max:50',
            'google_maps_service_area_label' => 'nullable|string|max:150',
            'google_maps_center_lat' => 'nullable|numeric|between:-90,90',
            'google_maps_center_lng' => 'nullable|numeric|between:-180,180',
            'google_maps_radius_km' => 'nullable|integer|min:1|max:10000',
            'google_maps_strict_bounds' => 'nullable|boolean',
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

        try {
            $settings = IntegrationSetting::current();
            $persist = [];
            $auditFields = [];

            $publishable = [
                'google_maps_browser_key',
                'google_maps_country_codes',
                'google_maps_service_area_label',
                'google_maps_center_lat',
                'google_maps_center_lng',
                'google_maps_radius_km',
                'google_maps_strict_bounds',
                'stripe_publishable_key',
                'sms_provider',
                'docusign_integration_key',
                'docusign_account_id',
                'payment_provider',
            ];

            foreach ($publishable as $key) {
                if (array_key_exists($key, $validated)) {
                    $val = $validated[$key];
                    if ($key === 'google_maps_strict_bounds') {
                        $val = (bool) $val;
                    } elseif (is_string($val)) {
                        $val = trim($val);
                        $val = $val !== '' ? $val : null;
                    }
                    $persist[$key] = $val;
                    $auditFields[$key] = $val;
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
                $existingColumns = Schema::getColumnListing('integration_settings');
                $safePersist = array_intersect_key($persist, array_flip($existingColumns));

                if ($safePersist !== []) {
                    $settings->update($safePersist);
                }

                try {
                    AuditLog::record(
                        'integration_settings.updated',
                        $request->user()?->id,
                        $auditFields,
                        $settings
                    );
                } catch (\Throwable $e) {
                    \Illuminate\Support\Facades\Log::warning('AuditLog recording failed for integration_settings: ' . $e->getMessage());
                }
            }

            return ApiResponse::data([
                'message' => 'Integration settings updated successfully.',
                'settings' => $this->maskedPayload($settings->fresh()),
            ]);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('IntegrationSettingsController@update error: ' . $e->getMessage(), [
                'exception' => $e,
            ]);

            return ApiResponse::error('UPDATE_FAILED', 'Failed to update integration settings.', 500);
        }
    }

    public function publicConfig(): JsonResponse
    {
        $browserKey = config('services.google_maps.browser_key');
        $publishable = config('services.stripe.key');
        $provider = 'stripe';
        $countryCodes = ['us'];
        $serviceArea = null;

        if (Schema::hasTable('integration_settings')) {
            try {
                $row = IntegrationSetting::current();
                $browserKey = $row->google_maps_browser_key ?: $browserKey;
                $publishable = $row->stripe_publishable_key ?: $publishable;
                $provider = $row->payment_provider ?: 'stripe';

                if ($row->google_maps_country_codes) {
                    $codes = array_map('strtolower', array_map('trim', explode(',', $row->google_maps_country_codes)));
                    $codes = array_values(array_filter($codes));
                    if (! empty($codes)) {
                        $countryCodes = $codes;
                    }
                }

                $serviceArea = [
                    'label' => $row->google_maps_service_area_label,
                    'center_lat' => $row->google_maps_center_lat,
                    'center_lng' => $row->google_maps_center_lng,
                    'radius_km' => $row->google_maps_radius_km,
                    'strict_bounds' => (bool) $row->google_maps_strict_bounds,
                ];
            } catch (\Throwable) {
                // env fallbacks
            }
        }

        return ApiResponse::data([
            'google_maps_browser_key' => $browserKey ?: null,
            'google_maps_country_codes' => $countryCodes,
            'google_maps_service_area' => $serviceArea,
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
            'google_maps_server_key' => IntegrationSecretMask::mask($this->safeSecret($row, 'google_maps_server_key')),
            'google_maps_server_key_configured' => IntegrationSecretMask::isConfigured($this->safeSecret($row, 'google_maps_server_key')),
            'google_maps_country_codes' => $row->google_maps_country_codes ?? 'us',
            'google_maps_service_area_label' => $row->google_maps_service_area_label,
            'google_maps_center_lat' => $row->google_maps_center_lat,
            'google_maps_center_lng' => $row->google_maps_center_lng,
            'google_maps_radius_km' => $row->google_maps_radius_km,
            'google_maps_strict_bounds' => (bool) $row->google_maps_strict_bounds,
            'stripe_publishable_key' => $row->stripe_publishable_key,
            'stripe_secret_key' => IntegrationSecretMask::mask($this->safeSecret($row, 'stripe_secret_key')),
            'stripe_secret_key_configured' => IntegrationSecretMask::isConfigured($this->safeSecret($row, 'stripe_secret_key')),
            'stripe_webhook_secret' => IntegrationSecretMask::mask($this->safeSecret($row, 'stripe_webhook_secret')),
            'stripe_webhook_secret_configured' => IntegrationSecretMask::isConfigured($this->safeSecret($row, 'stripe_webhook_secret')),
            'sms_provider' => $row->sms_provider,
            'sms_api_key' => IntegrationSecretMask::mask($this->safeSecret($row, 'sms_api_key')),
            'sms_api_key_configured' => IntegrationSecretMask::isConfigured($this->safeSecret($row, 'sms_api_key')),
            'docusign_integration_key' => $row->docusign_integration_key,
            'docusign_secret' => IntegrationSecretMask::mask($this->safeSecret($row, 'docusign_secret')),
            'docusign_secret_configured' => IntegrationSecretMask::isConfigured($this->safeSecret($row, 'docusign_secret')),
            'docusign_account_id' => $row->docusign_account_id,
            'payment_provider' => $row->payment_provider ?: 'stripe',
        ];
    }

    private function safeSecret(IntegrationSetting $row, string $key): ?string
    {
        try {
            return $row->{$key};
        } catch (\Throwable) {
            return null;
        }
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
            'google_maps_country_codes' => 'us',
            'google_maps_service_area_label' => null,
            'google_maps_center_lat' => null,
            'google_maps_center_lng' => null,
            'google_maps_radius_km' => null,
            'google_maps_strict_bounds' => false,
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
