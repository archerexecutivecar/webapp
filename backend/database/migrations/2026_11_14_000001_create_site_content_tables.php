<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Public-website tiers (driver + security). Separate from booking `driver_tiers`, which feeds booking logic.
        Schema::create('site_tiers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('kind', 20); // driver | security
            $table->unsignedTinyInteger('tier'); // 1-4
            $table->string('label');
            $table->string('title');
            $table->boolean('call_only')->default(false);
            $table->json('credentials');
            $table->json('suited_for');
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true)->index();
            $table->timestamps();
            $table->unique(['kind', 'tier']);
        });

        Schema::create('site_vehicles', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('vehicle_class', 20); // exec | first
            $table->string('size', 20); // sedan (mid-size SUV) | suv | van
            $table->string('size_label');
            $table->string('model');
            $table->string('blurb');
            $table->string('image_url')->nullable();
            $table->string('image_alt')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true)->index();
            $table->timestamps();
        });

        // Authoritative display rates. Money is stored in cents; every change is audit-logged by the controller.
        Schema::create('rate_cards', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('kind', 30); // hourly | point_to_point | security_hourly
            $table->string('vehicle_class', 20)->nullable();
            $table->string('size', 20)->nullable();
            $table->unsignedTinyInteger('tier');
            $table->unsignedInteger('amount_cents');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->unique(['kind', 'vehicle_class', 'size', 'tier']);
        });

        // Keyed JSON documents: site settings, home content, service pages, tier/fleet hero copy.
        Schema::create('site_content', function (Blueprint $table) {
            $table->string('key', 100)->primary();
            $table->json('data');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('site_content');
        Schema::dropIfExists('rate_cards');
        Schema::dropIfExists('site_vehicles');
        Schema::dropIfExists('site_tiers');
    }
};
