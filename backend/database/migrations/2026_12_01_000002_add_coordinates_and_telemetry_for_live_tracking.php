<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ride_requests', function (Blueprint $table) {
            $table->decimal('pickup_lat', 10, 7)->nullable()->after('pickup_location');
            $table->decimal('pickup_lng', 10, 7)->nullable()->after('pickup_lat');
            $table->decimal('dropoff_lat', 10, 7)->nullable()->after('dropoff_location');
            $table->decimal('dropoff_lng', 10, 7)->nullable()->after('dropoff_lat');
        });

        Schema::table('drivers', function (Blueprint $table) {
            $table->decimal('current_lat', 10, 7)->nullable()->after('push_alerts_enabled');
            $table->decimal('current_lng', 10, 7)->nullable()->after('current_lat');
            $table->float('heading')->nullable()->after('current_lng');
            $table->float('speed')->nullable()->after('heading');
            $table->timestamp('last_location_at')->nullable()->after('speed');
        });
    }

    public function down(): void
    {
        Schema::table('ride_requests', function (Blueprint $table) {
            $table->dropColumn(['pickup_lat', 'pickup_lng', 'dropoff_lat', 'dropoff_lng']);
        });

        Schema::table('drivers', function (Blueprint $table) {
            $table->dropColumn(['current_lat', 'current_lng', 'heading', 'speed', 'last_location_at']);
        });
    }
};
