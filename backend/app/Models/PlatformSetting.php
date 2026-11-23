<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PlatformSetting extends Model
{
    use HasFactory;

    protected $fillable = [
        'careers_enabled',
        'min_booking_notice_hours',
        'unaccepted_alert_hours',
        'cancellation_window_hours',
        'customer_notice_channel',
        'driver_btn_step1',
        'driver_btn_step2',
        'driver_btn_step3',
        'driver_btn_step4',
    ];

    protected $casts = [
        'careers_enabled' => 'boolean',
    ];

    public static function current(): self
    {
        return self::first() ?? self::create([
            'careers_enabled' => true,
            'min_booking_notice_hours' => 48,
            'unaccepted_alert_hours' => 24,
            'cancellation_window_hours' => 24,
            'customer_notice_channel' => 'SMS + email',
            'driver_btn_step1' => 'On my way',
            'driver_btn_step2' => 'At your doorstep',
            'driver_btn_step3' => 'Ride started',
            'driver_btn_step4' => 'Ride ends',
        ]);
    }
}
