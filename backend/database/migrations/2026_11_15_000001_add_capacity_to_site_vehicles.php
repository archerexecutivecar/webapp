<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Fleet cards need passenger and luggage capacity (QA BUG-005).
 * Nullable on purpose: values are supplied by Archer and the website hides the line until they are set.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('site_vehicles', function (Blueprint $table) {
            $table->unsignedTinyInteger('passengers')->nullable()->after('blurb');
            $table->unsignedTinyInteger('bags')->nullable()->after('passengers');
        });
    }

    public function down(): void
    {
        Schema::table('site_vehicles', function (Blueprint $table) {
            $table->dropColumn(['passengers', 'bags']);
        });
    }
};
