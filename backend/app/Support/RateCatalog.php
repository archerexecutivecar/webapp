<?php

namespace App\Support;

use App\Models\RateCard;
use App\Models\RateClass;
use App\Models\RateSize;
use App\Models\SiteTier;
use App\Models\SiteVehicle;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Admin-managed class, size, and tier catalog for Vehicles & rates.
 * New rows start unpublished (rate inactive, fleet vehicle hidden) so no price is invented.
 */
class RateCatalog
{
    /** @return list<string> */
    public static function classKeys(): array
    {
        $keys = RateClass::where('is_active', true)->orderBy('sort_order')->orderBy('key')->pluck('key')->all();

        return $keys !== [] ? $keys : ['exec', 'first'];
    }

    /** @return list<string> */
    public static function sizeKeys(): array
    {
        $keys = RateSize::where('is_active', true)->orderBy('sort_order')->orderBy('key')->pluck('key')->all();

        return $keys !== [] ? $keys : ['sedan', 'suv', 'van'];
    }

    public static function addClass(string $name): RateClass
    {
        return DB::transaction(function () use ($name) {
            $key = self::keyFromName($name, RateClass::class);
            $row = RateClass::create([
                'key' => $key,
                'name' => $name,
                'sort_order' => (int) RateClass::max('sort_order') + 1,
                'is_active' => true,
            ]);
            foreach (RateSize::where('is_active', true)->get() as $size) {
                self::ensureVehicleRates($key, $size->key, $name, $size->name);
            }

            return $row;
        });
    }

    public static function addSize(string $name): RateSize
    {
        return DB::transaction(function () use ($name) {
            $key = self::keyFromName($name, RateSize::class);
            $row = RateSize::create([
                'key' => $key,
                'name' => $name,
                'sort_order' => (int) RateSize::max('sort_order') + 1,
                'is_active' => true,
            ]);
            foreach (RateClass::where('is_active', true)->get() as $class) {
                self::ensureVehicleRates($class->key, $key, $class->name, $name);
            }

            return $row;
        });
    }

    public static function addTier(string $label): SiteTier
    {
        return DB::transaction(function () use ($label) {
            $tier = max((int) SiteTier::max('tier'), (int) RateCard::max('tier')) + 1;
            if ($tier > 255) {
                throw ValidationException::withMessages(['label' => 'No further tiers can be added.']);
            }

            $driver = SiteTier::create([
                'kind' => 'driver',
                'tier' => $tier,
                'label' => $label,
                'title' => $label,
                'call_only' => false,
                'credentials' => [],
                'suited_for' => [],
                'sort_order' => $tier,
                'is_active' => false,
            ]);
            SiteTier::create([
                'kind' => 'security',
                'tier' => $tier,
                'label' => $label,
                'title' => $label,
                'call_only' => false,
                'credentials' => [],
                'suited_for' => [],
                'sort_order' => $tier,
                'is_active' => false,
            ]);

            self::ensureFlatRate('client_car_hourly', $tier);
            self::ensureFlatRate('security_hourly', $tier);
            foreach (RateClass::where('is_active', true)->get() as $class) {
                foreach (RateSize::where('is_active', true)->get() as $size) {
                    self::ensureCard('hourly', $class->key, $size->key, $tier);
                    self::ensureCard('point_to_point', $class->key, $size->key, $tier);
                }
            }

            return $driver;
        });
    }

    public static function retireClass(string $key): void
    {
        DB::transaction(function () use ($key) {
            $row = RateClass::where('key', $key)->first();
            if (! $row && in_array($key, ['exec', 'first'], true)) {
                $name = $key === 'first' ? '1st Class' : 'Executive Class';
                $row = RateClass::create(['key' => $key, 'name' => $name, 'sort_order' => $key === 'exec' ? 1 : 2, 'is_active' => true]);
            }
            if (! $row) {
                throw ValidationException::withMessages(['key' => 'Class not found.']);
            }
            if (RateClass::where('is_active', true)->count() <= 1 && $row->is_active) {
                throw ValidationException::withMessages(['key' => 'At least one class has to stay active.']);
            }
            $row->update(['is_active' => false]);
            RateCard::where('vehicle_class', $key)->update(['is_active' => false]);
            SiteVehicle::where('vehicle_class', $key)->update(['is_active' => false]);
        });
    }

    public static function activateClass(string $key): void
    {
        DB::transaction(function () use ($key) {
            $row = RateClass::where('key', $key)->first();
            if (! $row && in_array($key, ['exec', 'first'], true)) {
                $name = $key === 'first' ? '1st Class' : 'Executive Class';
                $row = RateClass::create(['key' => $key, 'name' => $name, 'sort_order' => $key === 'exec' ? 1 : 2, 'is_active' => false]);
            }
            if (! $row) {
                throw ValidationException::withMessages(['key' => 'Class not found.']);
            }
            $row->update(['is_active' => true]);
            RateCard::where('vehicle_class', $key)->update(['is_active' => true]);
            SiteVehicle::where('vehicle_class', $key)->update(['is_active' => true]);
        });
    }

    public static function deleteClass(string $key): void
    {
        DB::transaction(function () use ($key) {
            $row = RateClass::where('key', $key)->firstOrFail();
            if (RateClass::count() <= 1) {
                throw ValidationException::withMessages(['key' => 'At least one class must remain in the catalog.']);
            }
            if (\App\Models\RideRequest::where('vehicle_class', $key)->exists()) {
                throw ValidationException::withMessages(['key' => 'Cannot delete class with existing booking history. Disable it instead.']);
            }
            $row->delete();
            RateCard::where('vehicle_class', $key)->delete();
            SiteVehicle::where('vehicle_class', $key)->delete();
        });
    }

    public static function retireSize(string $key): void
    {
        DB::transaction(function () use ($key) {
            $row = RateSize::where('key', $key)->first();
            if (! $row && in_array($key, ['sedan', 'suv', 'van'], true)) {
                $names = ['sedan' => 'Sedan / Compact SUV', 'suv' => 'SUV', 'van' => 'Sprinter'];
                $row = RateSize::create(['key' => $key, 'name' => $names[$key] ?? ucfirst($key), 'sort_order' => 1, 'is_active' => true]);
            }
            if (! $row) {
                throw ValidationException::withMessages(['key' => 'Size not found.']);
            }
            if (RateSize::where('is_active', true)->count() <= 1 && $row->is_active) {
                throw ValidationException::withMessages(['key' => 'At least one size has to stay active.']);
            }
            $row->update(['is_active' => false]);
            RateCard::where('size', $key)->update(['is_active' => false]);
            SiteVehicle::where('size', $key)->update(['is_active' => false]);
        });
    }

    public static function activateSize(string $key): void
    {
        DB::transaction(function () use ($key) {
            $row = RateSize::where('key', $key)->first();
            if (! $row && in_array($key, ['sedan', 'suv', 'van'], true)) {
                $names = ['sedan' => 'Sedan / Compact SUV', 'suv' => 'SUV', 'van' => 'Sprinter'];
                $row = RateSize::create(['key' => $key, 'name' => $names[$key] ?? ucfirst($key), 'sort_order' => 1, 'is_active' => false]);
            }
            if (! $row) {
                throw ValidationException::withMessages(['key' => 'Size not found.']);
            }
            $row->update(['is_active' => true]);
            RateCard::where('size', $key)->update(['is_active' => true]);
            SiteVehicle::where('size', $key)->update(['is_active' => true]);
        });
    }

    public static function deleteSize(string $key): void
    {
        DB::transaction(function () use ($key) {
            $row = RateSize::where('key', $key)->firstOrFail();
            if (RateSize::count() <= 1) {
                throw ValidationException::withMessages(['key' => 'At least one size must remain in the catalog.']);
            }
            if (\App\Models\RideRequest::where('size', $key)->exists()) {
                throw ValidationException::withMessages(['key' => 'Cannot delete size with existing booking history. Disable it instead.']);
            }
            $row->delete();
            RateCard::where('size', $key)->delete();
            SiteVehicle::where('size', $key)->delete();
        });
    }

    public static function retireTier(int $tier): void
    {
        DB::transaction(function () use ($tier) {
            $activeCount = SiteTier::where('kind', 'driver')->where('is_active', true)->count();
            if ($activeCount <= 1) {
                throw ValidationException::withMessages(['tier' => 'At least one tier has to stay active.']);
            }
            SiteTier::where('tier', $tier)->update(['is_active' => false]);
            RateCard::where('tier', $tier)->update(['is_active' => false]);
        });
    }

    public static function activateTier(int $tier): void
    {
        DB::transaction(function () use ($tier) {
            SiteTier::where('tier', $tier)->update(['is_active' => true]);
            RateCard::where('tier', $tier)->update(['is_active' => true]);
        });
    }

    public static function deleteTier(int $tier): void
    {
        DB::transaction(function () use ($tier) {
            if ($tier <= 4) {
                throw ValidationException::withMessages(['tier' => 'Baseline tiers (Tier 1-4) cannot be deleted. You can disable them instead.']);
            }
            if (\App\Models\RideRequest::where('driver_tier', $tier)->exists()) {
                throw ValidationException::withMessages(['tier' => 'Cannot delete tier with existing booking history. Disable it instead.']);
            }
            SiteTier::where('tier', $tier)->delete();
            RateCard::where('tier', $tier)->delete();
        });
    }

    public static function offerTier(string $kind, int $tier): void
    {
        SiteTier::where('kind', $kind)->where('tier', $tier)->where('is_active', false)->update(['is_active' => true]);
    }

    private static function ensureVehicleRates(string $class, string $size, string $className, string $sizeName): void
    {
        $tiers = self::tierNumbers();
        foreach ($tiers as $tier) {
            self::ensureCard('hourly', $class, $size, $tier);
            self::ensureCard('point_to_point', $class, $size, $tier);
        }

        SiteVehicle::firstOrCreate(
            ['vehicle_class' => $class, 'size' => $size],
            [
                'class_label' => $className,
                'size_label' => $sizeName,
                'model' => $className.' '.$sizeName,
                'blurb' => '',
                'sort_order' => 100,
                'is_active' => false,
            ]
        );
    }

    /** @return list<int> */
    private static function tierNumbers(): array
    {
        $tiers = RateCard::query()->distinct()->orderBy('tier')->pluck('tier')->map(fn ($t) => (int) $t)->all();

        return $tiers !== [] ? $tiers : [1, 2, 3, 4];
    }

    private static function ensureCard(string $kind, string $class, string $size, int $tier): void
    {
        RateCard::firstOrCreate(
            ['kind' => $kind, 'vehicle_class' => $class, 'size' => $size, 'tier' => $tier],
            ['amount_cents' => 0, 'is_active' => false]
        );
    }

    private static function ensureFlatRate(string $kind, int $tier): void
    {
        RateCard::firstOrCreate(
            ['kind' => $kind, 'vehicle_class' => null, 'size' => null, 'tier' => $tier],
            ['amount_cents' => 0, 'is_active' => false]
        );
    }

    private static function keyFromName(string $name, string $model): string
    {
        $key = Str::of($name)->lower()->replaceMatches('/[^a-z0-9]+/', '_')->trim('_')->substr(0, 20)->value();
        if ($key === '' || ! preg_match('/^[a-z][a-z0-9_]{0,19}$/', $key)) {
            throw ValidationException::withMessages(['name' => 'Use a name that starts with a letter.']);
        }
        if ($model::where('key', $key)->exists()) {
            throw ValidationException::withMessages(['name' => 'That name is already in the catalog.']);
        }

        return $key;
    }
}
