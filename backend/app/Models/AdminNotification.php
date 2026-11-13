<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AdminNotification extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'ride_request_id',
        'title',
        'message',
        'type',
        'is_read',
    ];

    protected $casts = [
        'is_read' => 'boolean',
    ];

    public function rideRequest()
    {
        return $this->belongsTo(RideRequest::class);
    }
}
