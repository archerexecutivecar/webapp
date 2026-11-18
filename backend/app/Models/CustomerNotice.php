<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CustomerNotice extends Model
{
    use HasFactory;

    protected $fillable = [
        'ride_id',
        'ride_reference',
        'recipient_name',
        'recipient_phone',
        'recipient_email',
        'channel',
        'trigger',
        'trigger_label',
        'message',
        'status',
        'sent_at',
    ];

    protected $casts = [
        'sent_at' => 'datetime',
    ];

    public function ride()
    {
        return $this->belongsTo(RideRequest::class, 'ride_id');
    }
}
