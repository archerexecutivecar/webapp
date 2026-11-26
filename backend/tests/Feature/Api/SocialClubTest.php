<?php

namespace Tests\Feature\Api;

use App\Models\SocialClubPost;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\CreatesStaff;
use Tests\TestCase;

class SocialClubTest extends TestCase
{
    use CreatesStaff, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
    }

    public function test_public_can_view_posts_join_club_like_and_comment(): void
    {
        $list = $this->getJson('/api/v1/social-club')->assertOk();
        $this->assertNotEmpty($list->json('data.posts'));
        $postId = $list->json('data.posts.0.id');
        $initialLikes = $list->json('data.posts.0.likes_count');

        // Like toggle on
        $this->postJson("/api/v1/social-club/posts/{$postId}/like", ['visitor_token' => 'vis-1'])
            ->assertOk()
            ->assertJsonPath('data.liked', true)
            ->assertJsonPath('data.likes_count', $initialLikes + 1);

        // Like toggle off
        $this->postJson("/api/v1/social-club/posts/{$postId}/like", ['visitor_token' => 'vis-1'])
            ->assertOk()
            ->assertJsonPath('data.liked', false)
            ->assertJsonPath('data.likes_count', $initialLikes);

        // Add comment
        $comment = $this->postJson("/api/v1/social-club/posts/{$postId}/comments", [
            'author_name' => 'Jordan',
            'body' => 'Looking forward to this event!',
        ])->assertCreated();
        $comment->assertJsonPath('data.comment.author_name', 'Jordan');

        // Join club
        $this->postJson('/api/v1/social-club/join', [
            'first_name' => 'Ava',
            'last_name' => 'Stone',
            'email' => 'ava@example.com',
            'interests' => ['Fine dining', 'Concerts'],
            'reach_preference' => 'Both',
            'consent_accepted' => true,
        ])->assertCreated()->assertJsonPath('data.members_count', 1);
    }

    public function test_admin_can_crud_social_club_posts_and_moderate_comments(): void
    {
        [, $admin] = $this->actingAsRole('super_admin');

        $created = $this->postJson('/api/v1/admin/social-club/posts', [
            'title' => 'US Open VIP Chauffeur Series',
            'post_type' => 'event',
            'category' => 'Sports',
            'body' => 'Reserve your chauffeur in advance for the US Open.',
            'event_date' => '2026-09-01',
            'event_location' => 'Flushing Meadows, NY',
            'booking_service_type' => 'hourly',
            'is_published' => true,
        ], $admin)->assertCreated();

        $postId = $created->json('data.post.id');
        $this->assertNotNull(SocialClubPost::find($postId));

        $this->putJson("/api/v1/admin/social-club/posts/{$postId}", [
            'title' => 'US Open VIP Series Updated',
        ], $admin)->assertOk()->assertJsonPath('data.post.title', 'US Open VIP Series Updated');

        $this->deleteJson("/api/v1/admin/social-club/posts/{$postId}", [], $admin)->assertOk();
        $this->assertNull(SocialClubPost::find($postId));
    }
}
