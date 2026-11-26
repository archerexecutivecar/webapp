<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use LogicException;

class RideStatusHistory extends Model
{
    public $timestamps = false;

    protected $table = 'ride_status_histories';

    protected $fillable = [
        'ride_request_id',
        'from_status',
        'to_status',
        'changed_by_user_id',
        'notes',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::updating(fn () => throw new LogicException('Ride status history records are immutable.'));
        static::deleting(fn () => throw new LogicException('Ride status history records are immutable.'));
    }

    public function ride(): BelongsTo
    {
        return $this->belongsTo(RideRequest::class, 'ride_request_id');
    }

    public function changedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'changed_by_user_id');
    }
}
