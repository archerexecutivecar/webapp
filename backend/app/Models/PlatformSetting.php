<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Schema;

class PlatformSetting extends Model
{
    use HasFactory;

    protected $fillable = [
        'careers_enabled',
        'min_booking_notice_hours',
        'unaccepted_alert_hours',
        'cancellation_window_hours',
        'customer_notice_channel',
        'email_notifications_enabled',
        'phone_notifications_enabled',
        'driver_btn_step1',
        'driver_btn_step2',
        'driver_btn_step3',
        'driver_btn_step4',
    ];

    protected $casts = [
        'careers_enabled' => 'boolean',
        'email_notifications_enabled' => 'boolean',
        'phone_notifications_enabled' => 'boolean',
    ];

    public static function current(): self
    {
        return self::first() ?? self::create([
            'careers_enabled' => true,
            'min_booking_notice_hours' => 48,
            'unaccepted_alert_hours' => 24,
            'cancellation_window_hours' => 24,
            'customer_notice_channel' => 'SMS + email',
            'email_notifications_enabled' => false,
            'phone_notifications_enabled' => true,
            'driver_btn_step1' => 'On my way',
            'driver_btn_step2' => 'At your doorstep',
            'driver_btn_step3' => 'Ride started',
            'driver_btn_step4' => 'Ride ends',
        ]);
    }

    /**
     * Central kill-switch for all outgoing platform emails.
     * Defaults to false during testing unless explicitly enabled in Admin Settings.
     */
    public static function emailsEnabled(): bool
    {
        if (config('mail.suppress_all', false)) {
            return false;
        }

        try {
            if (! Schema::hasTable('platform_settings') || ! Schema::hasColumn('platform_settings', 'email_notifications_enabled')) {
                return false;
            }

            return (bool) (static::current()->email_notifications_enabled ?? false);
        } catch (\Throwable) {
            return false;
        }
    }

    public static function phoneNotificationsEnabled(): bool
    {
        try {
            if (! Schema::hasTable('platform_settings') || ! Schema::hasColumn('platform_settings', 'phone_notifications_enabled')) {
                return true;
            }

            return (bool) (static::current()->phone_notifications_enabled ?? true);
        } catch (\Throwable) {
            return true;
        }
    }
}
