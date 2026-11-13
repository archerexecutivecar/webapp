<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ride_requests', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('reference')->unique(); // e.g. "AR-8492"
            $table->string('first_name');
            $table->string('last_name')->nullable();
            $table->string('email')->nullable();
            $table->string('phone');
            $table->string('service_type'); // e.g. "hourly", "airport", "client-car"
            $table->string('driver_tier')->default('1');
            $table->string('ride_date');
            $table->string('ride_time');
            $table->string('vehicle');
            $table->string('security_addon')->default('0');
            $table->string('driver_preference')->nullable();
            $table->foreignUuid('assigned_driver_id')->nullable()->constrained('drivers')->nullOnDelete();
            $table->string('status')->default('pending'); // pending, dispatched, in_progress, completed, cancelled
            $table->text('dispatch_notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ride_requests');
    }
};
