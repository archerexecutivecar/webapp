<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Add operational dispatch fields to vehicles
        Schema::table('vehicles', function (Blueprint $table) {
            $table->string('plate')->nullable()->after('name');
            $table->string('available_from', 10)->default('00:00')->after('availability_label');
            $table->string('available_until', 10)->default('23:59')->after('available_from');
            $table->json('available_days')->nullable()->after('available_until');
            $table->boolean('is_out_of_service')->default(false)->after('is_active');
        });

        // 2. Vehicle maintenance & detailing blockouts
        Schema::create('vehicle_blockouts', function (Blueprint $table) {
            $table->id();
            $table->string('vehicle_id')->index();
            $table->string('vehicle_name');
            $table->dateTime('start_at');
            $table->dateTime('end_at');
            $table->string('reason'); // "Maintenance", "Detailing", "Inspection", etc.
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vehicle_blockouts');

        Schema::table('vehicles', function (Blueprint $table) {
            $table->dropColumn([
                'plate',
                'available_from',
                'available_until',
                'available_days',
                'is_out_of_service',
            ]);
        });
    }
};
