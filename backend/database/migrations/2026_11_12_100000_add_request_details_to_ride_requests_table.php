<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ride_requests', function (Blueprint $table) {
            // Which public form produced the row (general, point_to_point, airport, client_car, concierge, assistant_week).
            $table->string('request_type', 40)->nullable()->after('reference')->index();
            // Validated form details that have no dedicated column (stops, flight, vehicle class, rides, ...).
            $table->json('details')->nullable()->after('dispatch_notes');
            // Client-supplied key that makes a double submit return the original request.
            $table->string('idempotency_key', 100)->nullable()->unique()->after('details');
        });

        // Not every public form collects these (e.g. concierge has no vehicle or time).
        Schema::table('ride_requests', function (Blueprint $table) {
            $table->string('vehicle')->nullable()->change();
            $table->string('ride_date')->nullable()->change();
            $table->string('ride_time')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('ride_requests', function (Blueprint $table) {
            $table->dropUnique(['idempotency_key']);
            $table->dropIndex(['request_type']);
            $table->dropColumn(['request_type', 'details', 'idempotency_key']);
        });
    }
};
