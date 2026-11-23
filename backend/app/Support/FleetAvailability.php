<?php

namespace App\Support;

use App\Models\Vehicle;
use Illuminate\Support\Carbon;

/**
 * Customer-safe fleet availability from the operational vehicles on Site Vehicles.
 * A class and size stays bookable while one active car of that class and size is free.
 * Cars with no operational record are left to dispatch.
 */
class FleetAvailability
{
    /**
     * @return list<array{vehicle_class: string, size: string, available: bool, reason: string|null}>
     */
    public static function options(?string $date, ?string $time, ?int $hours): array
    {
        [$start, $end] = self::window($date, $time, $hours);

        $grouped = [];
        foreach (Vehicle::with('blockouts')->where('is_active', true)->get() as $vehicle) {
            $size = self::sizeOf($vehicle);
            if ($size === null || $vehicle->class_type === '' || $vehicle->class_type === null) {
                continue;
            }
            $grouped[$vehicle->class_type.'|'.$size][] = $vehicle;
        }

        $rows = [];
        foreach ($grouped as $key => $list) {
            [$class, $size] = explode('|', $key);
            $free = array_values(array_filter($list, fn (Vehicle $v) => self::isFree($v, $start, $end)));
            $available = $free !== [];
            $rows[] = [
                'vehicle_class' => $class,
                'size' => $size,
                'available' => $available,
                'reason' => $available ? null : self::reason($list),
            ];
        }

        return $rows;
    }

    public static function unavailableMessage(?string $class, ?string $size, ?string $date, ?string $time, ?int $hours): ?string
    {
        if (! $class || ! $size) {
            return null;
        }
        foreach (self::options($date, $time, $hours) as $row) {
            if ($row['vehicle_class'] === $class && $row['size'] === $size && ! $row['available']) {
                return $row['reason'] ?? 'Not available at this time';
            }
        }

        return null;
    }

    /** @param list<Vehicle> $list */
    private static function reason(array $list): string
    {
        $allOut = $list !== [] && array_reduce($list, fn (bool $carry, Vehicle $v) => $carry && $v->is_out_of_service, true);

        return $allOut ? 'Out of service' : 'Not available at this time';
    }

    private static function isFree(Vehicle $vehicle, ?Carbon $start, ?Carbon $end): bool
    {
        if ($vehicle->is_out_of_service) {
            return false;
        }
        if ($start === null || $end === null) {
            return true;
        }

        $days = $vehicle->available_days;
        if (is_array($days) && $days !== [] && ! in_array($start->format('D'), $days, true)) {
            return false;
        }

        $fromStr = $vehicle->available_from ?: '00:00';
        $untilStr = $vehicle->available_until ?: '23:59';
        $isAllDay = ($fromStr === '00:00' || $fromStr === '0:00') && ($untilStr === '23:59' || $untilStr === '24:00');

        if (! $isAllDay) {
            $from = $start->copy()->setTimeFromTimeString($fromStr);
            $until = $start->copy()->setTimeFromTimeString($untilStr);
            if ($start->lt($from) || $end->gt($until)) {
                return false;
            }
        }

        return ! $vehicle->blockouts->contains(
            fn ($block) => $start->lt($block->end_at) && $end->gt($block->start_at)
        );
    }

    /** @return array{0: ?Carbon, 1: ?Carbon} */
    private static function window(?string $date, ?string $time, ?int $hours): array
    {
        if (! $date || ! $time) {
            return [null, null];
        }
        $start = Carbon::parse($date.' '.$time);
        $end = $start->copy()->addHours(max(1, $hours ?? 1));

        return [$start, $end];
    }

    public static function sizeOf(Vehicle $vehicle): ?string
    {
        $form = (string) $vehicle->form_value;
        $class = (string) $vehicle->class_type;
        if (preg_match('/^([^|]+)\|([^|]+)$/', $form, $match) && $match[1] === $class && in_array($match[2], RateCatalog::sizeKeys(), true)) {
            return $match[2];
        }

        $category = strtolower((string) $vehicle->category);
        if (str_contains($category, 'sprinter') || str_contains($category, 'van')) {
            return 'van';
        }
        if (str_contains($category, 'compact') || str_contains($category, 'sedan') || str_contains($category, 'mid')) {
            return 'sedan';
        }
        if (str_contains($category, 'suv')) {
            return 'suv';
        }

        return null;
    }
}
