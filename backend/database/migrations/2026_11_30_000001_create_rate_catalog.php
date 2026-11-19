<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Classes and sizes shown on Admin → Vehicles & rates. Existing Executive / 1st Class
 * and Sedan / SUV / Sprinter rows are inserted so current prices stay on the same keys.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('rate_classes', function (Blueprint $table) {
            $table->string('key', 20)->primary();
            $table->string('name', 80);
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('rate_sizes', function (Blueprint $table) {
            $table->string('key', 20)->primary();
            $table->string('name', 80);
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        $now = now();
        DB::table('rate_classes')->insert([
            ['key' => 'exec', 'name' => 'Executive Class', 'sort_order' => 1, 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
            ['key' => 'first', 'name' => '1st Class', 'sort_order' => 2, 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
        ]);
        DB::table('rate_sizes')->insert([
            ['key' => 'sedan', 'name' => 'Sedan / Compact SUV', 'sort_order' => 1, 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
            ['key' => 'suv', 'name' => 'SUV', 'sort_order' => 2, 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
            ['key' => 'van', 'name' => 'Sprinter', 'sort_order' => 3, 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('rate_sizes');
        Schema::dropIfExists('rate_classes');
    }
};
