<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('career_applications') && ! Schema::hasColumn('career_applications', 'details')) {
            Schema::table('career_applications', function (Blueprint $table) {
                $table->json('details')->nullable()->after('cover_note');
            });
        }

        if (Schema::hasTable('influencer_applications') && ! Schema::hasColumn('influencer_applications', 'details')) {
            Schema::table('influencer_applications', function (Blueprint $table) {
                $table->json('details')->nullable()->after('cover_note');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('career_applications') && Schema::hasColumn('career_applications', 'details')) {
            Schema::table('career_applications', function (Blueprint $table) {
                $table->dropColumn('details');
            });
        }

        if (Schema::hasTable('influencer_applications') && Schema::hasColumn('influencer_applications', 'details')) {
            Schema::table('influencer_applications', function (Blueprint $table) {
                $table->dropColumn('details');
            });
        }
    }
};
