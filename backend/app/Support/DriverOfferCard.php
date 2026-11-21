<?php

namespace App\Support;

use App\Models\RideRequest;
use App\Support\ChauffeurPay;
use App\Support\OperationalFleet;

/** Shapes a broadcast ride for the driver PWA. Pay fields are passed through only when already stored. */
class DriverOfferCard
{
    /** @return array<string, mixed> */
    public static function present(RideRequest $ride): array
    {
        $details = is_array($ride->details) ? $ride->details : [];

        $notes = [];
        foreach (['route_note', 'keys_note', 'parking_note', 'vehicle_note', 'service_description'] as $key) {
            if (is_string($details[$key] ?? null) && trim($details[$key]) !== '') {
                $notes[] = trim($details[$key]);
            }
        }

        return [
            'id' => (string) $ride->id,
            'reference' => $ride->reference,
            'client_name' => trim(($ride->first_name ?? '').' '.($ride->last_name ?? '')) ?: 'Client',
            'service_type' => $ride->service_type,
            'driver_tier' => $ride->driver_tier,
            'ride_date' => $ride->ride_date,
            'ride_time' => $ride->ride_time,
            'pickup_location' => $ride->pickup_location,
            'pickup_lat' => $ride->pickup_lat !== null ? (float) $ride->pickup_lat : null,
            'pickup_lng' => $ride->pickup_lng !== null ? (float) $ride->pickup_lng : null,
            'dropoff_location' => $ride->dropoff_location,
            'dropoff_lat' => $ride->dropoff_lat !== null ? (float) $ride->dropoff_lat : null,
            'dropoff_lng' => $ride->dropoff_lng !== null ? (float) $ride->dropoff_lng : null,
            'vehicle' => OperationalFleet::displayName($ride->vehicle) ?? $ride->vehicle,
            'security_addon' => $ride->security_addon,
            'dispatch_notes' => $ride->dispatch_notes,
            'passengers' => $details['passengers'] ?? null,
            'hours' => $details['hours'] ?? null,
            'driver_pay' => self::money($details, 'driver_pay') ?? self::money($details, 'fleet_pay'),
            'hourly_rate' => self::money($details, 'hourly_rate') ?? self::money($details, 'tier_rate') ?? ChauffeurPay::dollarsForTier($ride->driver_tier),
            'tip' => self::money($details, 'tip') ?? self::money($details, 'gratuity'),
            'notes' => $notes,
        ];
    }

    /** @param  array<string, mixed>  $details */
    private static function money(array $details, string $key): ?float
    {
        if (! array_key_exists($key, $details) || $details[$key] === null || $details[$key] === '') {
            return null;
        }

        return round((float) $details[$key], 2);
    }
}
