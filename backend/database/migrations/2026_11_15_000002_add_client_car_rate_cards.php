<?php

use App\Models\RateCard;
use Illuminate\Database\Migrations\Migration;

/**
 * Client Car hourly rates get their own rate card rows so Admin can change them independently of
 * security staffing. Values are the currently published Client Car rates ($45/$60/$75/$125 per hour,
 * services.json "CLIENT CAR RATES"); this does not change any price. Existing rows are left untouched.
 */
return new class extends Migration
{
    private const PUBLISHED_DOLLARS = [45, 60, 75, 125];

    public function up(): void
    {
        foreach (self::PUBLISHED_DOLLARS as $i => $dollars) {
            RateCard::firstOrCreate(
                ['kind' => 'client_car_hourly', 'vehicle_class' => null, 'size' => null, 'tier' => $i + 1],
                ['amount_cents' => $dollars * 100, 'is_active' => true],
            );
        }
    }

    public function down(): void
    {
        RateCard::where('kind', 'client_car_hourly')->delete();
    }
};
