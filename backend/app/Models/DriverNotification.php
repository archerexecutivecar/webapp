<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DriverNotification extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'driver_id',
        'ride_request_id',
        'title',
        'message',
        'type',
        'is_read',
    ];

    protected $casts = [
        'is_read' => 'boolean',
    ];

    public function driver()
    {
        return $this->belongsTo(Driver::class);
    }

    public function rideRequest()
    {
        return $this->belongsTo(RideRequest::class);
    }
}
