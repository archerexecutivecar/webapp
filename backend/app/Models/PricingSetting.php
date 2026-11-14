<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

/** Admin-set pricing rules for one bookable service. Money in cents, percentages in basis points. */
class PricingSetting extends Model
{
    use HasUuids;

    public const SERVICES = ['hourly', 'airport', 'p2p', 'client', 'security'];

    protected $table = 'pricing_settings';

    protected $fillable = [
        'pricing_mode', 'van_hourly', 'included_stops', 'min_hours', 'min_miles', 'booking_fee_cents', 'stop_fee_cents', 'max_stops',
        'per_passenger_cents', 'included_passengers', 'per_bag_cents', 'included_bags',
        'guard_hours_mode', 'guard_min_hours', 'tax_bp', 'tax_includes_fees', 'card_fee_bp', 'gratuity_suggested_bp', 'is_active',
    ];

    protected $casts = [
        'van_hourly' => 'boolean', 'included_stops' => 'integer', 'min_hours' => 'integer', 'min_miles' => 'integer', 'booking_fee_cents' => 'integer', 'stop_fee_cents' => 'integer',
        'max_stops' => 'integer', 'per_passenger_cents' => 'integer', 'included_passengers' => 'integer',
        'per_bag_cents' => 'integer', 'included_bags' => 'integer', 'guard_min_hours' => 'integer', 'tax_bp' => 'integer',
        'tax_includes_fees' => 'boolean', 'card_fee_bp' => 'integer', 'gratuity_suggested_bp' => 'integer', 'is_active' => 'boolean',
    ];
}
