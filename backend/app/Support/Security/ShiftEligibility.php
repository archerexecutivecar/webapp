<?php

namespace App\Support\Security;

use App\Models\Driver;
use App\Models\DriverNotification;
use Carbon\CarbonInterface;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/** Server-side rules from docs/SECURITY_OPERATIONS_RULES.md. The frontend never decides eligibility. */
class ShiftEligibility
{
    public const TZ = 'America/New_York';
    public const RENEWAL_WINDOW_DAYS = 30;
    public const RELEASE_HORIZON_DAYS = 14;

    public static function tierNumber(string $tier): int
    {
        return (int) ltrim(strtoupper($tier), 'T');
    }

    /** Local (NJ) wall-clock start + duration → UTC window. */
    public static function window(string $date, string $time, int $hours): array
    {
        $start = Carbon::parse("$date $time", self::TZ);

        return [$start->copy()->utc(), $start->copy()->addHours($hours)->utc()];
    }

    public static function label(CarbonInterface $startsAt, CarbonInterface $endsAt): string
    {
        $s = $startsAt->copy()->setTimezone(self::TZ);
        $e = $endsAt->copy()->setTimezone(self::TZ);

        return $s->format('D, M j, g:i A').' to '.$e->format('g:i A');
    }

    /** suspended (manual) > expired > renewal_due > valid. */
    public static function credentialStatus(string $stored, string $expiresAt, ?CarbonInterface $now = null): string
    {
        $now ??= now();
        if ($stored === 'suspended') {
            return 'suspended';
        }
        $exp = Carbon::parse($expiresAt)->endOfDay();
        if ($exp->lt($now)) {
            return 'expired';
        }
        if ($exp->lte($now->copy()->addDays(self::RENEWAL_WINDOW_DAYS))) {
            return 'renewal_due';
        }

        return 'valid';
    }

    /** @return string[] reasons the driver cannot work the shift; empty = eligible. */
    public static function problems(?Driver $driver, object $shift, ?int $ignoreShiftId = null): array
    {
        if (! $driver) {
            return ['Driver not found.'];
        }
        $problems = [];
        if (! $driver->is_active) {
            $problems[] = $driver->name.' is not active.';
        }
        if ((int) $driver->service_tier < self::tierNumber($shift->tier)) {
            $problems[] = $driver->name.' is below the required tier ('.strtoupper($shift->tier).').';
        }

        $on = $shift->starts_at ? Carbon::parse($shift->starts_at) : null;
        foreach (DB::table('security_credentials')->where('driver_id', $driver->getKey())->get() as $c) {
            if ($c->status === 'suspended') {
                $problems[] = $c->credential_name.' is suspended.';
            } elseif ($on && Carbon::parse($c->expires_at)->endOfDay()->lt($on)) {
                $problems[] = $c->credential_name.' expires before this shift.';
            }
        }

        if ($shift->starts_at && $shift->ends_at) {
            $clash = DB::table('security_shifts')
                ->where('assigned_driver_id', $driver->getKey())
                ->whereIn('status', ['assigned', 'swap_pending'])
                ->when($ignoreShiftId, fn ($q) => $q->where('id', '!=', $ignoreShiftId))
                ->where('starts_at', '<', $shift->ends_at)
                ->where('ends_at', '>', $shift->starts_at)
                ->exists();
            if ($clash) {
                $problems[] = $driver->name.' already has an overlapping shift.';
            }
        }

        return $problems;
    }

    public static function notifyDriver(?string $driverId, string $title, string $message): void
    {
        if (! $driverId || ! Driver::whereKey($driverId)->exists()) {
            return;
        }
        DriverNotification::create([
            'driver_id' => $driverId, 'title' => $title, 'message' => $message, 'type' => 'security', 'is_read' => false,
        ]);
    }
}
