<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

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
        'avatar_url',
        'bio',
        'sort_order',
        'is_active',
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
        'sort_order' => 'integer',
        'is_active' => 'boolean',
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
}
