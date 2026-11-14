<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Airport and Point to Point follow the approved design (product owner decision 2026-11-14, "Follow the design";
 * design canvas Book board): a flat trip fare from Rates (kind point_to_point) by tier × class × size, Sprinters
 * billed hourly with a 4-hour minimum, first stop included then $20 each (max 3), guards billed 3 hours on a trip.
 * Hourly/Client Car/Security: up to 5 stops; Security 3-hour minimum. All values stay Admin-editable.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pricing_settings', function (Blueprint $table) {
            $table->unsignedSmallInteger('included_stops')->default(0)->after('stop_fee_cents');
            $table->boolean('van_hourly')->default(false)->after('pricing_mode'); // Sprinter priced hourly on a flat-fare service
        });

        foreach (['airport', 'p2p'] as $service) {
            DB::table('pricing_settings')->where('service', $service)->update([
                'pricing_mode' => 'flat', 'van_hourly' => true, 'min_hours' => 4,
                'included_stops' => 1, 'stop_fee_cents' => 2000, 'max_stops' => 3, 'guard_min_hours' => 3,
            ]);
        }
        DB::table('pricing_settings')->whereIn('service', ['hourly', 'client', 'security'])->update(['max_stops' => 5]);
        DB::table('pricing_settings')->where('service', 'security')->update(['min_hours' => 3]);
    }

    public function down(): void
    {
        DB::table('pricing_settings')->whereIn('service', ['airport', 'p2p'])->update([
            'pricing_mode' => 'hourly', 'min_hours' => null, 'stop_fee_cents' => 0, 'max_stops' => null, 'guard_min_hours' => null,
        ]);
        Schema::table('pricing_settings', function (Blueprint $table) {
            $table->dropColumn(['included_stops', 'van_hourly']);
        });
    }
};
