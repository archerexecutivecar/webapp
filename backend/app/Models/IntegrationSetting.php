<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class IntegrationSetting extends Model
{
    protected $fillable = [
        'google_maps_browser_key',
        'google_maps_server_key',
        'google_maps_country_codes',
        'google_maps_service_area_label',
        'google_maps_center_lat',
        'google_maps_center_lng',
        'google_maps_radius_km',
        'google_maps_strict_bounds',
        'stripe_publishable_key',
        'stripe_secret_key',
        'stripe_webhook_secret',
        'sms_provider',
        'sms_api_key',
        'docusign_integration_key',
        'docusign_secret',
        'docusign_account_id',
        'payment_provider',
    ];

    protected function casts(): array
    {
        return [
            'google_maps_server_key' => 'encrypted',
            'google_maps_center_lat' => 'float',
            'google_maps_center_lng' => 'float',
            'google_maps_radius_km' => 'integer',
            'google_maps_strict_bounds' => 'boolean',
            'stripe_secret_key' => 'encrypted',
            'stripe_webhook_secret' => 'encrypted',
            'sms_api_key' => 'encrypted',
            'docusign_secret' => 'encrypted',
        ];
    }

    public static function current(): self
    {
        return self::first() ?? self::create([
            'payment_provider' => 'stripe',
        ]);
    }

    public function resolvedStripeWebhookSecret(): ?string
    {
        $fromDb = $this->stripe_webhook_secret;

        return $fromDb ?: (config('services.stripe.webhook_secret') ?: null);
    }
}
