<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('drivers')) {
            return;
        }

        if (! Schema::hasColumn('drivers', 'eligible_tiers')) {
            Schema::table('drivers', function (Blueprint $table) {
                $table->json('eligible_tiers')->nullable()->after('service_tier');
            });
        }

        // Backfill: a driver qualified at tier N automatically qualifies for tiers 1..N.
        DB::table('drivers')
            ->whereNotNull('service_tier')
            ->get(['id', 'service_tier'])
            ->each(function ($driver) {
                $tier = (int) $driver->service_tier;
                if ($tier >= 1) {
                    DB::table('drivers')
                        ->where('id', $driver->id)
                        ->update(['eligible_tiers' => json_encode(range(1, $tier))]);
                }
            });
    }

    public function down(): void
    {
        if (Schema::hasTable('drivers') && Schema::hasColumn('drivers', 'eligible_tiers')) {
            Schema::table('drivers', function (Blueprint $table) {
                $table->dropColumn('eligible_tiers');
            });
        }
    }
};
