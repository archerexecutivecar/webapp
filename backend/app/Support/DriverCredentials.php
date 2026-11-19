<?php

namespace App\Support;

use App\Models\Driver;
use Illuminate\Support\Carbon;

/**
 * Credential day bands from the approved security baseline:
 * >30 days active, ≤30 renewal warning, ≤7 pickup suspended, expired fully blocked.
 */
class DriverCredentials
{
    /** @return list<array<string, mixed>> */
    public static function forDriver(Driver $driver): array
    {
        $items = [];
        $stored = is_array($driver->compliance_credentials) ? $driver->compliance_credentials : [];

        foreach ($stored as $key => $value) {
            if (! is_array($value)) {
                continue;
            }
            $items[] = self::row((string) $key, self::name((string) $key, $value), $value['expires_on'] ?? $value['expires_at'] ?? null, $value);
        }

        if ($driver->owner_vehicle_reg_expires) {
            $items[] = self::row('vehicle_registration', 'Vehicle registration', $driver->owner_vehicle_reg_expires, []);
        }
        if ($driver->owner_vehicle_ins_expires) {
            $items[] = self::row('vehicle_insurance', 'Commercial insurance', $driver->owner_vehicle_ins_expires, []);
        }

        return $items;
    }

    /**
     * @param  array<string, mixed>  $value
     * @return array<string, mixed>
     */
    private static function row(string $key, string $name, mixed $expires, array $value): array
    {
        $days = null;
        if ($expires) {
            $days = (int) now()->startOfDay()->diffInDays(Carbon::parse($expires)->startOfDay(), false);
            $status = self::statusFromDays($days);
        } else {
            $days = isset($value['days_remaining']) ? (int) $value['days_remaining'] : null;
            $status = (string) ($value['status'] ?? self::statusFromDays($days));
        }

        return [
            'key' => $key,
            'name' => $name,
            'status' => $status,
            'days_remaining' => $days,
            'label' => self::label($status, $days, $value['label'] ?? null),
            'needs_attention' => in_array($status, ['renewal_due', 'pickup_suspended', 'expired'], true),
        ];
    }

    /** @param  array<string, mixed>  $value */
    private static function name(string $key, array $value): string
    {
        if (is_string($value['name'] ?? null) && $value['name'] !== '') {
            return $value['name'];
        }

        return match ($key) {
            'carry_permit' => 'Carry permit',
            'soar_certification' => 'SOAR certification',
            'driver_license' => 'Driver license',
            default => ucfirst(str_replace('_', ' ', $key)),
        };
    }

    private static function statusFromDays(?int $days): string
    {
        if ($days === null) {
            return 'unknown';
        }
        if ($days < 0) {
            return 'expired';
        }
        if ($days <= 7) {
            return 'pickup_suspended';
        }
        if ($days <= 30) {
            return 'renewal_due';
        }

        return 'active';
    }

    private static function label(string $status, ?int $days, mixed $stored): string
    {
        if ($days === null) {
            return is_string($stored) && $stored !== '' ? $stored : ucfirst(str_replace('_', ' ', $status));
        }
        if ($days < 0) {
            return 'Expired';
        }

        return $days.' '.($days === 1 ? 'day' : 'days').' left';
    }
}
