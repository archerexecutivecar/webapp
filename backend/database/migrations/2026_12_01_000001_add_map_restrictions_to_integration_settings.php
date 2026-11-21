<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('integration_settings', function (Blueprint $table) {
            $table->string('google_maps_country_codes')->nullable()->after('google_maps_server_key');
            $table->string('google_maps_service_area_label')->nullable()->after('google_maps_country_codes');
            $table->decimal('google_maps_center_lat', 10, 7)->nullable()->after('google_maps_service_area_label');
            $table->decimal('google_maps_center_lng', 10, 7)->nullable()->after('google_maps_center_lat');
            $table->unsignedInteger('google_maps_radius_km')->nullable()->after('google_maps_center_lng');
            $table->boolean('google_maps_strict_bounds')->default(false)->after('google_maps_radius_km');
        });
    }

    public function down(): void
    {
        Schema::table('integration_settings', function (Blueprint $table) {
            $table->dropColumn([
                'google_maps_country_codes',
                'google_maps_service_area_label',
                'google_maps_center_lat',
                'google_maps_center_lng',
                'google_maps_radius_km',
                'google_maps_strict_bounds',
            ]);
        });
    }
};
