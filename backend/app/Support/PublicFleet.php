<?php

namespace App\Support;

use App\Models\RateClass;
use App\Models\RateSize;
use App\Models\Vehicle;
use Illuminate\Support\Facades\Schema;

/** Public website fleet cards. Source is the operational fleet on Fleet & availability, never plates or schedules. */
class PublicFleet
{
    /**
     * @return list<array{vehicle_class: string, class_label: string, size: string, size_label: string, model: string, blurb: string, passengers: int|null, bags: int|null, image_url: string|null, image_alt: string}>
     */
    public static function vehicles(): array
    {
        if (! Schema::hasTable('vehicles')) {
            return [];
        }

        $activeClasses = RateClass::query()->where('is_active', true)->pluck('name', 'key');
        $activeSizes = RateSize::query()->where('is_active', true)->pluck('key')->all();

        return Vehicle::query()
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get()
            ->map(function (Vehicle $vehicle) use ($activeClasses, $activeSizes) {
                $size = FleetAvailability::sizeOf($vehicle);
                if ($size === null || $vehicle->class_type === '' || ! isset($activeClasses[$vehicle->class_type]) || (! empty($activeSizes) && ! in_array($size, $activeSizes, true))) {
                    return null;
                }

                return [
                    'vehicle_class' => $vehicle->class_type,
                    'class_label' => (string) ($activeClasses[$vehicle->class_type] ?? $vehicle->class_type),
                    'size' => $size,
                    'size_label' => $vehicle->category !== '' ? $vehicle->category : $size,
                    'model' => $vehicle->name,
                    'blurb' => (string) ($vehicle->availability_label ?? ''),
                    'passengers' => $vehicle->passengers,
                    'bags' => $vehicle->luggage,
                    'image_url' => $vehicle->image_url,
                    'image_alt' => $vehicle->name,
                ];
            })
            ->filter()
            ->values()
            ->all();
    }
}
