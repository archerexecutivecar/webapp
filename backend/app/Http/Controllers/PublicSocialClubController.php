<?php

namespace App\Http\Controllers;

use App\Models\SiteContent;
use App\Models\SocialClubComment;
use App\Models\SocialClubMember;
use App\Models\SocialClubPost;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PublicSocialClubController extends Controller
{
    public static function defaultConfig(): array
    {
        return [
            'hero_heading' => 'Join the Archer Club.',
            'hero_line' => 'The inside word on events, fine dining and nights out across NJ, NY and PA, shared with members first.',
            'perks' => [
                'First word on exclusive events, openings and nights out',
                'Help landing hard-to-book restaurant reservations',
                'Invitations to Archer client nights',
                'Behind-the-scenes moments from concerts, galas and games',
                'Early notice for big weekends, so you can book before cars fill up',
                'Members-only offers and VIP event perks',
                'Ways to give back with Archer in our community',
            ],
            'community_title' => 'Driven by service, on and off the road.',
            'community_body' => 'Many of our chauffeurs come from military and law-enforcement service. Giving back is part of who we are. Archer supports the veterans, first responders and neighbors who make our community what it is, here at Fort Monmouth and across New Jersey.',
            'causes' => [
                ['k' => 'Veterans', 'v' => 'Rides, sponsorships and volunteer time for organizations that serve veterans and their families.', 'note' => 'Monmouth County & NJ'],
                ['k' => 'First responders', 'v' => 'Honoring the police, fire and EMS families who protect our towns.', 'note' => 'Community partnerships'],
                ['k' => 'Our neighbors', 'v' => 'Local schools, food drives and community events in Monmouth County and beyond.', 'note' => 'Local outreach'],
                ['k' => 'Charity rides', 'v' => 'Archer rides donated to charity auctions and galas. Ask us about donating a ride.', 'note' => 'Email info@archerexecutivecar.com'],
            ],
        ];
    }

    public function index(Request $request): JsonResponse
    {
        $query = SocialClubPost::with('approvedComments')
            ->where('is_published', true)
            ->orderByDesc('published_at')
            ->orderByDesc('id');

        if ($request->filled('category') && $request->query('category') !== 'All') {
            $query->where('category', $request->query('category'));
        }

        if ($request->filled('post_type')) {
            $query->where('post_type', $request->query('post_type'));
        }

        $posts = $query->get()->map(fn (SocialClubPost $p) => [
            'id' => $p->id,
            'title' => $p->title,
            'slug' => $p->slug,
            'post_type' => $p->post_type,
            'category' => $p->category,
            'body' => $p->body,
            'image_url' => $p->image_url,
            'external_social_url' => $p->external_social_url,
            'event_date' => $p->event_date?->format('Y-m-d'),
            'event_location' => $p->event_location,
            'booking_service_type' => $p->booking_service_type ?: 'hourly',
            'likes_count' => (int) $p->likes_count,
            'published_at' => $p->published_at?->toIso8601String(),
            'comments' => $p->approvedComments->map(fn (SocialClubComment $c) => [
                'id' => $c->id,
                'author_name' => $c->author_name,
                'body' => $c->body,
                'created_at' => $c->created_at?->toIso8601String(),
            ])->values()->all(),
        ]);

        $savedConfig = SiteContent::find('social_club')?->data;
        $config = array_merge(self::defaultConfig(), is_array($savedConfig) ? $savedConfig : []);

        return ApiResponse::data([
            'posts' => $posts,
            'members_count' => SocialClubMember::count(),
            'config' => $config,
        ]);
    }

    public function join(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'first_name' => 'required|string|max:100',
            'last_name' => 'nullable|string|max:100',
            'email' => 'required|email|max:150',
            'mobile' => 'nullable|string|max:40',
            'town_zip' => 'nullable|string|max:80',
            'interests' => 'nullable|array',
            'interests.*' => 'string|max:80',
            'reach_preference' => 'nullable|string|in:Email,Text,Both',
            'consent_accepted' => 'required|accepted',
        ]);

        $member = SocialClubMember::updateOrCreate(
            ['email' => strtolower(trim($validated['email']))],
            [
                'first_name' => trim($validated['first_name']),
                'last_name' => isset($validated['last_name']) ? trim($validated['last_name']) : null,
                'mobile' => $validated['mobile'] ?? null,
                'town_zip' => $validated['town_zip'] ?? null,
                'interests' => $validated['interests'] ?? [],
                'reach_preference' => $validated['reach_preference'] ?? 'Both',
                'consent_accepted' => true,
            ]
        );

        return ApiResponse::created([
            'member_id' => $member->id,
            'members_count' => SocialClubMember::count(),
            'message' => 'Welcome to the Archer Club.',
        ]);
    }

    public function toggleLike(Request $request, int $id): JsonResponse
    {
        $post = SocialClubPost::where('is_published', true)->findOrFail($id);
        $token = substr(trim((string) ($request->input('visitor_token') ?: $request->ip())), 0, 120);

        return DB::transaction(function () use ($post, $token) {
            $existing = DB::table('social_club_likes')
                ->where('post_id', $post->id)
                ->where('visitor_token', $token)
                ->first();

            if ($existing) {
                DB::table('social_club_likes')->where('id', $existing->id)->delete();
                $post->likes_count = max(0, (int) $post->likes_count - 1);
                $liked = false;
            } else {
                DB::table('social_club_likes')->insert([
                    'post_id' => $post->id,
                    'visitor_token' => $token,
                    'created_at' => now(),
                ]);
                $post->likes_count = (int) $post->likes_count + 1;
                $liked = true;
            }
            $post->save();

            return ApiResponse::data([
                'liked' => $liked,
                'likes_count' => $post->likes_count,
            ]);
        });
    }

    public function addComment(Request $request, int $id): JsonResponse
    {
        $post = SocialClubPost::where('is_published', true)->findOrFail($id);

        $validated = $request->validate([
            'author_name' => 'required|string|max:120',
            'body' => 'required|string|max:1500',
        ]);

        $comment = SocialClubComment::create([
            'post_id' => $post->id,
            'author_name' => trim($validated['author_name']),
            'body' => trim($validated['body']),
            'status' => 'approved',
            'created_at' => now(),
        ]);

        return ApiResponse::created([
            'comment' => [
                'id' => $comment->id,
                'author_name' => $comment->author_name,
                'body' => $comment->body,
                'created_at' => $comment->created_at?->toIso8601String(),
            ],
        ]);
    }
}
