<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Schema;

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
        'pickup_lat',
        'pickup_lng',
        'dropoff_location',
        'dropoff_lat',
        'dropoff_lng',
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
        'accepted_at',
        'scheduled_at',
        'completed_at',
        'cancelled_at',
        'cancellation_reason',
        'dispatch_notes',
    ];

    protected function casts(): array
    {
        return [
            'details' => 'array',
            'pickup_lat' => 'float',
            'pickup_lng' => 'float',
            'dropoff_lat' => 'float',
            'dropoff_lng' => 'float',
            'accepted_at' => 'datetime',
            'scheduled_at' => 'datetime',
            'completed_at' => 'datetime',
            'cancelled_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        $syncTimestamps = function (RideRequest $ride): void {
            if (! Schema::hasColumn('ride_requests', 'accepted_at')) {
                return;
            }

            if ($ride->scheduled_at === null && $ride->ride_date) {
                try {
                    $ride->scheduled_at = Carbon::parse(trim($ride->ride_date.' '.($ride->ride_time ?: '00:00')));
                } catch (\Throwable) {
                    // Ignore unparseable date strings
                }
            }

            $status = strtolower((string) $ride->status);
            if ($ride->accepted_at === null && in_array($status, [
                'accepted', 'dispatched', 'driver_assigned', 'on_my_way',
                'at_doorstep', 'ride_started', 'in_progress', 'ride_ended',
                'close_out', 'completed',
            ], true)) {
                $ride->accepted_at = now();
            }

            if ($ride->completed_at === null && $status === 'completed') {
                $ride->completed_at = now();
            }

            if ($ride->cancelled_at === null && $status === 'cancelled') {
                $ride->cancelled_at = now();
            }
        };

        static::creating($syncTimestamps);
        static::updating(function (RideRequest $ride) use ($syncTimestamps): void {
            if ($ride->isDirty(['ride_date', 'ride_time']) && $ride->ride_date && ! $ride->isDirty('scheduled_at')) {
                try {
                    $ride->scheduled_at = Carbon::parse(trim($ride->ride_date.' '.($ride->ride_time ?: '00:00')));
                } catch (\Throwable) {
                    // Ignore
                }
            }
            $syncTimestamps($ride);
        });

        static::created(function (RideRequest $ride): void {
            if (! Schema::hasTable('ride_status_histories')) {
                return;
            }
            RideStatusHistory::create([
                'ride_request_id' => $ride->id,
                'from_status' => null,
                'to_status' => (string) $ride->status,
                'changed_by_user_id' => Auth::id(),
                'created_at' => $ride->created_at ?? now(),
            ]);
        });

        static::updated(function (RideRequest $ride): void {
            if (! $ride->wasChanged('status') || ! Schema::hasTable('ride_status_histories')) {
                return;
            }
            RideStatusHistory::create([
                'ride_request_id' => $ride->id,
                'from_status' => $ride->getOriginal('status'),
                'to_status' => (string) $ride->status,
                'changed_by_user_id' => Auth::id(),
                'notes' => strtolower((string) $ride->status) === 'cancelled' ? $ride->cancellation_reason : null,
                'created_at' => now(),
            ]);
        });
    }

    protected $appends = ['closeout'];

    public function getCloseoutAttribute(): ?array
    {
        if ($this->status !== 'completed') {
            return null;
        }

        return \App\Support\RideCloseoutMath::ledgerRow($this);
    }

    public function assignedDriver()
    {
        return $this->belongsTo(Driver::class, 'assigned_driver_id');
    }

    public function statusHistories(): HasMany
    {
        return $this->hasMany(RideStatusHistory::class, 'ride_request_id')->orderBy('created_at');
    }
}
