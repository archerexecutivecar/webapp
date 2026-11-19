<?php

namespace App\Support;

use App\Models\RateCard;
use App\Models\RateClass;
use App\Models\RateSize;
use App\Models\Vehicle;
use Illuminate\Support\Collection;

/**
 * Customer and driver fleet comes from Fleet & availability (operational vehicles).
 * A class and size is offered while at least one active car maps to it.
 * Plates and blockouts stay off public payloads.
 */
class OperationalFleet
{
    /** @return Collection<int, Vehicle> */
    public static function active(?string $class = null, ?string $size = null): Collection
    {
        return Vehicle::query()
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get()
            ->filter(function (Vehicle $vehicle) use ($class, $size) {
                $mapped = FleetAvailability::sizeOf($vehicle);
                if ($mapped === null || $vehicle->class_type === '') {
                    return false;
                }
                if ($class !== null && $vehicle->class_type !== $class) {
                    return false;
                }
                if ($size !== null && $mapped !== $size) {
                    return false;
                }

                return true;
            })
            ->values();
    }

    public static function offered(?string $class, ?string $size): bool
    {
        return is_string($class) && $class !== '' && is_string($size) && $size !== ''
            && self::active($class, $size)->isNotEmpty();
    }

    /** @return Collection<int, Vehicle> */
    public static function fitting(string $class, string $size, int $passengers, int $bags): Collection
    {
        return self::active($class, $size)
            ->filter(fn (Vehicle $vehicle) => self::fits($vehicle, $passengers, $bags))
            ->values();
    }

    public static function fits(Vehicle $vehicle, int $passengers, int $bags): bool
    {
        if ($vehicle->passengers !== null && $passengers > (int) $vehicle->passengers) {
            return false;
        }
        if ($vehicle->luggage !== null && $bags > (int) $vehicle->luggage) {
            return false;
        }

        return true;
    }

    /** Names of the active cars for a stored "class|size" value. Free text is left unchanged by the caller. */
    public static function displayName(?string $stored): ?string
    {
        if (! is_string($stored) || ! preg_match('/^([^|]+)\|([^|]+)$/', $stored, $match)) {
            return null;
        }
        $cars = self::active($match[1], $match[2]);
        if ($cars->isEmpty()) {
            return null;
        }

        return $cars->pluck('name')->unique()->implode(' · ');
    }

    /**
     * One customer-facing row per class and size that has an active car.
     *
     * @return list<array{vehicle_class: string, size: string, class_label: string, size_name: string, model: string, passengers: int|null, bags: int|null, bookable: bool}>
     */
    public static function publicRows(): array
    {
        $classLabels = RateClass::query()->pluck('name', 'key');
        $sizeLabels = RateSize::query()->pluck('name', 'key');
        $hourly = RateCard::query()->where('kind', 'hourly')->where('is_active', true)->get();

        $grouped = [];
        foreach (self::active() as $vehicle) {
            $size = FleetAvailability::sizeOf($vehicle);
            $grouped[$vehicle->class_type.'|'.$size][] = $vehicle;
        }

        $rows = [];
        foreach ($grouped as $key => $list) {
            [$class, $size] = explode('|', $key, 2);
            /** @var list<Vehicle> $list */
            $rows[] = [
                'vehicle_class' => $class,
                'size' => $size,
                'class_label' => (string) ($classLabels[$class] ?? $class),
                'size_name' => (string) ($list[0]->category !== '' ? $list[0]->category : ($sizeLabels[$size] ?? $size)),
                'model' => collect($list)->pluck('name')->unique()->implode(' · '),
                'passengers' => self::maxCapacity($list, 'passengers'),
                'bags' => self::maxCapacity($list, 'luggage'),
                'bookable' => $hourly->contains(fn (RateCard $card) => $card->vehicle_class === $class && $card->size === $size),
            ];
        }

        return $rows;
    }

    /** @param  list<Vehicle>  $list */
    private static function maxCapacity(array $list, string $field): ?int
    {
        $max = null;
        foreach ($list as $vehicle) {
            if ($vehicle->{$field} === null) {
                return null;
            }
            $max = max($max ?? 0, (int) $vehicle->{$field});
        }

        return $max;
    }
}
