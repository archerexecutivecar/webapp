<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Driver Tiers
        Schema::create('driver_tiers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('tier_code'); // e.g. "1", "2", "3"
            $table->string('subtitle')->nullable();
            $table->text('description')->nullable();
            $table->decimal('multiplier', 5, 2)->default(1.00);
            $table->integer('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // 2. Vehicles / Fleet
        Schema::create('vehicles', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name'); // e.g. "Chevrolet Traverse"
            $table->string('slug')->unique();
            $table->string('class_type'); // e.g. "exec", "first", "group"
            $table->string('category'); // e.g. "Compact SUV", "Full-Size SUV"
            $table->string('form_value'); // e.g. "exec|sedan", "exec|suv", "first|suv"
            $table->integer('passengers')->default(3);
            $table->integer('luggage')->default(3);
            $table->string('image_url')->nullable();
            $table->string('availability')->default('request'); // "confirmed" | "request"
            $table->string('availability_label')->nullable();
            $table->integer('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // 3. Security Add-ons
        Schema::create('security_addons', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name'); // e.g. "None", "1 guard, same tier", "2 guards, same tier"
            $table->string('form_value'); // e.g. "0", "1", "2"
            $table->integer('guards_count')->default(0);
            $table->string('description')->nullable();
            $table->decimal('hourly_rate', 8, 2)->default(0.00);
            $table->integer('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // 4. Drivers
        Schema::create('drivers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('email')->nullable();
            $table->string('phone')->nullable();
            $table->foreignUuid('tier_id')->nullable()->constrained('driver_tiers')->nullOnDelete();
            $table->string('avatar_url')->nullable();
            $table->text('bio')->nullable();
            $table->integer('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('drivers');
        Schema::dropIfExists('security_addons');
        Schema::dropIfExists('vehicles');
        Schema::dropIfExists('driver_tiers');
    }
};
