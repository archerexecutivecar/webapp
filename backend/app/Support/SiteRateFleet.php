<?php

namespace App\Support;

use App\Models\RateCard;
use App\Models\RateClass;
use App\Models\RateSize;
use App\Models\SiteVehicle;
use Illuminate\Support\Facades\Schema;

/**
 * Class and vehicle names shown on Admin → Site Rates.
 * The customer app reads the same list. Pay figures stay on the admin matrix.
 */
class SiteRateFleet
{
    /** @return list<array{id: string, name: string, is_active: bool}> */
    public static function classes(): array
    {
        if (! Schema::hasTable('rate_classes')) {
            return [
                ['id' => 'exec', 'name' => 'Executive Class', 'is_active' => true],
                ['id' => 'first', 'name' => '1st Class', 'is_active' => true],
            ];
        }
        $rows = RateClass::orderBy('sort_order')->orderBy('key')->get();
        if ($rows->isEmpty()) {
            return [
                ['id' => 'exec', 'name' => 'Executive Class', 'is_active' => true],
                ['id' => 'first', 'name' => '1st Class', 'is_active' => true],
            ];
        }

        return $rows->map(fn (RateClass $row) => [
            'id' => $row->key,
            'name' => $row->name,
            'is_active' => (bool) $row->is_active,
        ])->all();
    }

    /** @return list<array{id: string, name: string, is_active: bool}> */
    public static function sizes(): array
    {
        if (! Schema::hasTable('rate_sizes')) {
            return [
                ['id' => 'sedan', 'name' => 'Sedan / Compact SUV', 'is_active' => true],
                ['id' => 'suv', 'name' => 'SUV', 'is_active' => true],
                ['id' => 'van', 'name' => 'Sprinter', 'is_active' => true],
            ];
        }
        $rows = RateSize::orderBy('sort_order')->orderBy('key')->get();
        if ($rows->isEmpty()) {
            return [
                ['id' => 'sedan', 'name' => 'Sedan / Compact SUV', 'is_active' => true],
                ['id' => 'suv', 'name' => 'SUV', 'is_active' => true],
                ['id' => 'van', 'name' => 'Sprinter', 'is_active' => true],
            ];
        }

        return $rows->map(fn (RateSize $row) => [
            'id' => $row->key,
            'name' => $row->name,
            'is_active' => (bool) $row->is_active,
        ])->all();
    }

    /**
     * @return array<string, array{class_label: string, size_name: string, model: string}>
     */
    public static function vehicles(): array
    {
        $classes = collect(self::classes())->where('is_active', true);
        $sizes = collect(self::sizes())->where('is_active', true);
        $fleet = SiteVehicle::query()->get()->keyBy(fn (SiteVehicle $v) => $v->vehicle_class.'|'.$v->size);

        $rows = [];
        foreach ($classes as $class) {
            foreach ($sizes as $size) {
                $key = $class['id'].'|'.$size['id'];
                $vehicle = $fleet->get($key);
                $rows[$key] = [
                    'class_label' => $class['name'],
                    'size_name' => $size['name'],
                    'model' => $vehicle?->model ?: $size['name'],
                ];
            }
        }

        return $rows;
    }

    /**
     * Customer-safe rows: the Site Rates class, size, and model, plus capacity from Website Fleet when set.
     *
     * @return list<array{vehicle_class: string, size: string, class_label: string, size_name: string, model: string, passengers: int|null, bags: int|null, bookable: bool}>
     */
    public static function publicVehicles(): array
    {
        $bookable = RateCard::where('kind', 'hourly')->where('is_active', true)->get();
        $capacity = SiteVehicle::where('is_active', true)->get()->keyBy(fn (SiteVehicle $v) => $v->vehicle_class.'|'.$v->size);

        $rows = [];
        foreach (self::vehicles() as $key => $info) {
            [$class, $size] = explode('|', $key);
            $card = $capacity->get($key);
            $rows[] = [
                'vehicle_class' => $class,
                'size' => $size,
                'class_label' => $info['class_label'],
                'size_name' => $info['size_name'],
                'model' => $info['model'],
                'passengers' => $card?->passengers,
                'bags' => $card?->bags,
                'bookable' => $bookable->contains(fn (RateCard $r) => $r->vehicle_class === $class && $r->size === $size),
            ];
        }

        return $rows;
    }
}
