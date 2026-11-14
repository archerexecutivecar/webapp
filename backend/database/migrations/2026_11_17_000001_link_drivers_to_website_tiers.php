<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Website Tiers (site_tiers, kind = driver) is the single tier list (decision 2026-11-14: "Website catalog wins").
 * Each driver now stores the tier number (1–4) instead of a link to the retired driver_tiers table.
 * Values are copied from driver_tiers.tier_code, so every driver keeps the tier they had. tier_id and the
 * driver_tiers rows are left in place (not dropped) so nothing is lost.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('drivers', function (Blueprint $table) {
            $table->unsignedTinyInteger('service_tier')->nullable()->after('tier_id');
        });

        $codes = DB::table('driver_tiers')->pluck('tier_code', 'id');
        foreach (DB::table('drivers')->whereNotNull('tier_id')->get(['id', 'tier_id']) as $driver) {
            $code = $codes[$driver->tier_id] ?? null;
            if (is_numeric($code) && (int) $code >= 1 && (int) $code <= 9) {
                DB::table('drivers')->where('id', $driver->id)->update(['service_tier' => (int) $code]);
            }
        }
    }

    public function down(): void
    {
        Schema::table('drivers', function (Blueprint $table) {
            $table->dropColumn('service_tier');
        });
    }
};
