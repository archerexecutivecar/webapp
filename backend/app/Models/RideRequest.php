<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RideRequest extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'reference',
        'request_type',
        'details',
        'idempotency_key',
        'first_name',
        'last_name',
        'email',
        'phone',
        'pickup_location',
        'dropoff_location',
        'service_type',
        'driver_tier',
        'ride_date',
        'ride_time',
        'vehicle',
        'security_addon',
        'driver_preference',
        'assigned_driver_id',
        'customer_id',
        'status',
        'dispatch_notes',
    ];

    protected function casts(): array
    {
        return ['details' => 'array'];
    }

    public function assignedDriver()
    {
        return $this->belongsTo(Driver::class, 'assigned_driver_id');
    }
}
