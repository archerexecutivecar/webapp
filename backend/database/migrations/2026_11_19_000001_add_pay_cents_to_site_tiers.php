<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('site_tiers', function (Blueprint $table) {
            $table->unsignedInteger('pay_cents')->nullable()->after('title');
        });
    }

    public function down(): void
    {
        Schema::table('site_tiers', function (Blueprint $table) {
            $table->dropColumn('pay_cents');
        });
    }
};
