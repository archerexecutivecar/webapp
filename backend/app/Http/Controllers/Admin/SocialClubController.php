<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Controllers\PublicSocialClubController;
use App\Models\AuditLog;
use App\Models\SiteContent;
use App\Models\SocialClubComment;
use App\Models\SocialClubMember;
use App\Models\SocialClubPost;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SocialClubController extends Controller
{
    public function index(): JsonResponse
    {
        $posts = SocialClubPost::with('comments')
            ->orderByDesc('created_at')
            ->get();

        return ApiResponse::data([
            'posts' => $posts,
            'members_count' => SocialClubMember::count(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => 'required|string|max:180',
            'post_type' => 'required|string|in:event,announcement,influencer',
            'category' => 'required|string|max:60',
            'body' => 'required|string|max:5000',
            'image_url' => 'nullable|string|max:500',
            'external_social_url' => 'nullable|url|max:500',
            'event_date' => 'nullable|date',
            'event_location' => 'nullable|string|max:200',
            'booking_service_type' => 'nullable|string|max:40',
            'is_published' => 'nullable|boolean',
        ]);

        $post = SocialClubPost::create([
            ...$validated,
            'is_published' => $validated['is_published'] ?? true,
            'published_at' => ($validated['is_published'] ?? true) ? now() : null,
            'created_by' => $request->user()?->id,
        ]);

        AuditLog::record('social_club.post_created', $request->user()?->id, ['post_id' => $post->id, 'title' => $post->title], $post);

        return ApiResponse::created(['post' => $post->load('comments')]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $post = SocialClubPost::findOrFail($id);

        $validated = $request->validate([
            'title' => 'sometimes|required|string|max:180',
            'post_type' => 'sometimes|required|string|in:event,announcement,influencer',
            'category' => 'sometimes|required|string|max:60',
            'body' => 'sometimes|required|string|max:5000',
            'image_url' => 'nullable|string|max:500',
            'external_social_url' => 'nullable|url|max:500',
            'event_date' => 'nullable|date',
            'event_location' => 'nullable|string|max:200',
            'booking_service_type' => 'nullable|string|max:40',
            'is_published' => 'nullable|boolean',
        ]);

        if (array_key_exists('is_published', $validated) && $validated['is_published'] && ! $post->published_at) {
            $validated['published_at'] = now();
        }

        $post->update($validated);

        AuditLog::record('social_club.post_updated', $request->user()?->id, ['post_id' => $post->id], $post);

        return ApiResponse::data(['post' => $post->fresh()->load('comments')]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $post = SocialClubPost::findOrFail($id);
        $post->delete();

        AuditLog::record('social_club.post_deleted', $request->user()?->id, ['post_id' => $id]);

        return ApiResponse::data(['deleted' => true]);
    }

    public function moderateComment(Request $request, int $id): JsonResponse
    {
        $comment = SocialClubComment::findOrFail($id);
        $validated = $request->validate([
            'status' => 'required|string|in:approved,hidden',
        ]);
        $comment->update(['status' => $validated['status']]);

        return ApiResponse::data(['comment' => $comment]);
    }

    public function members(): JsonResponse
    {
        return ApiResponse::data([
            'members' => SocialClubMember::orderByDesc('created_at')->limit(200)->get(),
        ]);
    }

    public function getConfig(): JsonResponse
    {
        $saved = SiteContent::find('social_club')?->data;

        return ApiResponse::data([
            'config' => array_merge(PublicSocialClubController::defaultConfig(), is_array($saved) ? $saved : []),
        ]);
    }

    public function updateConfig(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'hero_heading' => 'required|string|max:160',
            'hero_line' => 'required|string|max:500',
            'perks' => 'required|array|min:1',
            'perks.*' => 'required|string|max:200',
            'community_title' => 'required|string|max:160',
            'community_body' => 'required|string|max:2000',
            'causes' => 'required|array|min:1',
            'causes.*.k' => 'required|string|max:80',
            'causes.*.v' => 'required|string|max:400',
            'causes.*.note' => 'nullable|string|max:120',
        ]);

        $doc = SiteContent::firstOrNew(['key' => 'social_club']);
        $doc->data = $validated;
        $doc->save();

        AuditLog::record('social_club.config_updated', $request->user()?->id, ['updated' => true], $doc);

        return ApiResponse::data(['config' => $doc->data]);
    }
}
