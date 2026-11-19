<?php

namespace App\Support;

use App\Models\Driver;
use App\Models\RideRequest;
use Illuminate\Support\Collection;

/**
 * Same eligibility dispatch uses when broadcasting a ride.
 * A driver qualifies when they are active, their service tier is at or below the ride tier,
 * and the operating switch matches the service (client car vs fleet).
 */
class DriverOfferEligibility
{
    public static function isClientCar(RideRequest $ride): bool
    {
        return str_contains(strtolower((string) $ride->service_type), 'client');
    }

    public static function requiredTier(RideRequest $ride): int
    {
        return (int) ($ride->driver_tier ?? 1);
    }

    public static function driverMatches(Driver $driver, RideRequest $ride): bool
    {
        if (! $driver->is_active || $driver->service_tier === null) {
            return false;
        }

        if ((int) $driver->service_tier > self::requiredTier($ride)) {
            return false;
        }

        if (self::isClientCar($ride)) {
            return (bool) $driver->is_client_car_operator;
        }

        return (bool) $driver->is_fleet_operator;
    }

    /** @return Collection<int, Driver> */
    public static function eligibleDrivers(RideRequest $ride): Collection
    {
        $query = Driver::query()
            ->where('is_active', true)
            ->whereNotNull('service_tier')
            ->where('service_tier', '<=', self::requiredTier($ride));

        if (self::isClientCar($ride)) {
            $query->where('is_client_car_operator', true);
        } else {
            $query->where('is_fleet_operator', true);
        }

        return $query->get();
    }
}
