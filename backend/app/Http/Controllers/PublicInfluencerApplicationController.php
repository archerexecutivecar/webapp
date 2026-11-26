<?php

namespace App\Http\Controllers;

use App\Models\InfluencerApplication;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PublicInfluencerApplicationController extends Controller
{
    /**
     * Store a new Influencer Marketing application separately from driver/staff applications.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'full_name' => 'required|string|max:120',
            'email' => 'required|email|max:150',
            'phone' => 'required|string|max:30',
            'city' => 'nullable|string|max:100',
            'instagram_handle' => 'nullable|string|max:120',
            'tiktok_handle' => 'nullable|string|max:120',
            'youtube_handle' => 'nullable|string|max:120',
            'follower_count' => 'nullable|string|max:60',
            'portfolio_url' => 'nullable|url|max:255',
            'cover_note' => 'nullable|string|max:4000',
            'resume' => 'nullable|file|mimes:pdf,doc,docx,jpg,jpeg,png|max:15360',
        ]);

        $application = InfluencerApplication::create([
            'full_name' => $validated['full_name'],
            'email' => strtolower(trim($validated['email'])),
            'phone' => $validated['phone'],
            'city' => $validated['city'] ?? null,
            'instagram_handle' => $validated['instagram_handle'] ?? null,
            'tiktok_handle' => $validated['tiktok_handle'] ?? null,
            'youtube_handle' => $validated['youtube_handle'] ?? null,
            'follower_count' => $validated['follower_count'] ?? null,
            'portfolio_url' => $validated['portfolio_url'] ?? null,
            'cover_note' => $validated['cover_note'] ?? null,
            'status' => 'new',
        ]);

        if ($request->hasFile('resume')) {
            $file = $request->file('resume');
            $path = $file->store("influencer_resumes/{$application->id}", 'local');
            $application->update([
                'resume_path' => $path,
                'resume_name' => $file->getClientOriginalName(),
            ]);
        }

        return ApiResponse::created([
            'reference_code' => $application->reference_code,
            'full_name' => $application->full_name,
            'message' => 'Your Influencer Marketing application has been received by Archer.',
        ]);
    }
}
