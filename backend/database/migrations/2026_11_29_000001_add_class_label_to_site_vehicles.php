<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * The customer app shows the class name Admin saves on Website Fleet.
 * Existing rows keep the names already used in that screen.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('site_vehicles', function (Blueprint $table) {
            $table->string('class_label', 60)->nullable()->after('vehicle_class');
        });

        DB::table('site_vehicles')->where('vehicle_class', 'exec')->whereNull('class_label')->update(['class_label' => 'Executive Class']);
        DB::table('site_vehicles')->where('vehicle_class', 'first')->whereNull('class_label')->update(['class_label' => '1st Class']);
    }

    public function down(): void
    {
        Schema::table('site_vehicles', function (Blueprint $table) {
            $table->dropColumn('class_label');
        });
    }
};
