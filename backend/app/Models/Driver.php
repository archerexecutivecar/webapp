<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Validation\ValidationException;

class Driver extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'user_id',
        'name',
        'email',
        'phone',
        'tier_id',
        'service_tier',
        'eligible_tiers',
        'avatar_url',
        'bio',
        'sort_order',
        'is_active',
        'is_online',
        'push_alerts_enabled',
        'current_lat',
        'current_lng',
        'heading',
        'speed',
        'last_location_at',
        // The 3 Operating Switches
        'is_fleet_operator',
        'is_client_car_operator',
        'is_owner_operator',
        // Owner-operator vehicle registry
        'owner_vehicle_model',
        'owner_vehicle_class',
        'owner_vehicle_plate',
        'owner_vehicle_reg_expires',
        'owner_vehicle_ins_expires',
        'owner_vehicle_inspected',
        // Compliance radar & scheduling
        'compliance_credentials',
        'availability_schedule',
    ];

    protected $casts = [
        'service_tier' => 'integer',
        'eligible_tiers' => 'array',
        'sort_order' => 'integer',
        'is_active' => 'boolean',
        'is_online' => 'boolean',
        'push_alerts_enabled' => 'boolean',
        'current_lat' => 'float',
        'current_lng' => 'float',
        'heading' => 'float',
        'speed' => 'float',
        'last_location_at' => 'datetime',
        'is_fleet_operator' => 'boolean',
        'is_client_car_operator' => 'boolean',
        'is_owner_operator' => 'boolean',
        'owner_vehicle_inspected' => 'boolean',
        'owner_vehicle_reg_expires' => 'date',
        'owner_vehicle_ins_expires' => 'date',
        'compliance_credentials' => 'array',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function tier()
    {
        // Website Tiers (kind = driver) is the only tier list; drivers store the tier number.
        return $this->belongsTo(SiteTier::class, 'service_tier', 'tier')->where('kind', 'driver');
    }

    public function rideRequests()
    {
        return $this->hasMany(RideRequest::class, 'assigned_driver_id');
    }

    public function notifications()
    {
        return $this->hasMany(DriverNotification::class, 'driver_id')->orderBy('created_at', 'desc');
    }

    /**
     * Return all tiers this driver is eligible to serve, falling back to 1..service_tier.
     *
     * @return array<int, int>
     */
    public function resolvedEligibleTiers(): array
    {
        if (is_array($this->eligible_tiers) && $this->eligible_tiers !== []) {
            $tiers = array_values(array_unique(array_map('intval', $this->eligible_tiers)));
            sort($tiers);

            return $tiers;
        }

        if ($this->service_tier !== null && (int) $this->service_tier >= 1) {
            return [(int) $this->service_tier];
        }

        return [];
    }

    /**
     * Enforce tier hierarchy: Tier N qualifies for tiers 1..N; lower tiers cannot select higher tiers.
     *
     * @param  array<int, int|string>|null  $eligibleTiers
     * @return array{0: ?int, 1: array<int, int>}
     */
    public static function resolveTierHierarchy(?int $serviceTier, ?array $eligibleTiers): array
    {
        $selected = $eligibleTiers !== null
            ? array_values(array_unique(array_map('intval', $eligibleTiers)))
            : null;

        if ($selected !== null && $selected !== []) {
            sort($selected);
            $highestSelected = max($selected);

            if ($serviceTier !== null && $highestSelected > $serviceTier) {
                throw ValidationException::withMessages([
                    'eligible_tiers' => [
                        "Driver qualification (Tier {$serviceTier}) does not allow selecting Tier {$highestSelected}.",
                    ],
                ]);
            }

            $qualifiedTier = $serviceTier ?? $highestSelected;

            return [$qualifiedTier, $selected];
        }

        if ($serviceTier !== null && $serviceTier >= 1) {
            $availableTiers = SiteTier::where('kind', 'driver')
                ->where('tier', '<=', $serviceTier)
                ->orderBy('tier')
                ->pluck('tier')
                ->map(fn ($t) => (int) $t)
                ->all();

            return [$serviceTier, $availableTiers !== [] ? $availableTiers : range(1, $serviceTier)];
        }

        return [null, []];
    }
}
