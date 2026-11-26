<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('influencer_applications')) {
            return;
        }

        Schema::create('influencer_applications', function (Blueprint $table) {
            $table->id();
            $table->string('reference_code', 40)->unique();
            $table->string('full_name', 120);
            $table->string('email', 150)->index();
            $table->string('phone', 30);
            $table->string('city', 100)->nullable();
            $table->string('instagram_handle', 120)->nullable();
            $table->string('tiktok_handle', 120)->nullable();
            $table->string('youtube_handle', 120)->nullable();
            $table->string('follower_count', 60)->nullable();
            $table->string('portfolio_url', 255)->nullable();
            $table->string('resume_path', 255)->nullable();
            $table->string('resume_name', 255)->nullable();
            $table->text('cover_note')->nullable();
            $table->string('status', 30)->default('new')->index();
            $table->text('internal_notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('influencer_applications');
    }
};
