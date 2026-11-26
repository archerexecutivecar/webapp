<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('social_club_posts')) {
            Schema::create('social_club_posts', function (Blueprint $table) {
                $table->id();
                $table->string('title', 180);
                $table->string('slug', 200)->unique();
                $table->string('post_type', 40)->default('event'); // event | announcement | influencer
                $table->string('category', 60)->default('Members'); // Members | Sports | Community | Dining
                $table->text('body');
                $table->string('image_url', 500)->nullable();
                $table->string('external_social_url', 500)->nullable();
                $table->date('event_date')->nullable();
                $table->string('event_location', 200)->nullable();
                $table->string('booking_service_type', 40)->default('hourly');
                $table->boolean('is_published')->default(true)->index();
                $table->timestamp('published_at')->nullable();
                $table->unsignedInteger('likes_count')->default(0);
                $table->unsignedBigInteger('created_by')->nullable();
                $table->timestamps();
            });

            DB::table('social_club_posts')->insert([
                [
                    'title' => 'Archer Client Night & Cocktail Reception',
                    'slug' => 'archer-client-night-reception',
                    'post_type' => 'event',
                    'category' => 'Members',
                    'body' => 'An evening for Archer clients and club members, with chauffeured rides there and home.',
                    'event_date' => now()->addDays(21)->format('Y-m-d'),
                    'event_location' => 'Red Bank, NJ',
                    'booking_service_type' => 'hourly',
                    'is_published' => true,
                    'published_at' => now(),
                    'likes_count' => 14,
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
                [
                    'title' => 'MetLife Stadium Game Day VIP Transfers',
                    'slug' => 'metlife-game-day-vip-transfers',
                    'post_type' => 'event',
                    'category' => 'Sports',
                    'body' => 'Book a group ride to the game in advance and skip the parking. Club members hear about availability first.',
                    'event_date' => now()->addDays(14)->format('Y-m-d'),
                    'event_location' => 'MetLife Stadium, East Rutherford, NJ',
                    'booking_service_type' => 'hourly',
                    'is_published' => true,
                    'published_at' => now(),
                    'likes_count' => 22,
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
            ]);
        }

        if (! Schema::hasTable('social_club_likes')) {
            Schema::create('social_club_likes', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('post_id')->index();
                $table->string('visitor_token', 120);
                $table->timestamp('created_at')->useCurrent();
                $table->unique(['post_id', 'visitor_token']);
            });
        }

        if (! Schema::hasTable('social_club_comments')) {
            Schema::create('social_club_comments', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('post_id')->index();
                $table->string('author_name', 120);
                $table->text('body');
                $table->string('status', 30)->default('approved')->index(); // approved | hidden
                $table->timestamp('created_at')->useCurrent();
            });
        }

        if (! Schema::hasTable('social_club_members')) {
            Schema::create('social_club_members', function (Blueprint $table) {
                $table->id();
                $table->string('first_name', 100);
                $table->string('last_name', 100)->nullable();
                $table->string('email', 150)->unique();
                $table->string('mobile', 40)->nullable();
                $table->string('town_zip', 80)->nullable();
                $table->json('interests')->nullable();
                $table->string('reach_preference', 20)->default('Both');
                $table->boolean('consent_accepted')->default(true);
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('social_club_members');
        Schema::dropIfExists('social_club_comments');
        Schema::dropIfExists('social_club_likes');
        Schema::dropIfExists('social_club_posts');
    }
};
