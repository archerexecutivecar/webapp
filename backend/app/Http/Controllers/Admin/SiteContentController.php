<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\SiteContent;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SiteContentController extends Controller
{
    public function index(): JsonResponse
    {
        return ApiResponse::data(['documents' => SiteContent::orderBy('key')->get(['key', 'updated_at'])]);
    }

    public function show(string $key): JsonResponse
    {
        abort_unless(SiteContent::allowedKey($key), 404);

        return ApiResponse::data(['key' => $key, 'data' => SiteContent::findOrFail($key)->data]);
    }

    public function update(Request $request, string $key): JsonResponse
    {
        abort_unless(SiteContent::allowedKey($key), 404);
        $payload = $request->validate(['data' => 'required|array']);
        if ($key === 'settings') {
            $request->validate([
                'data.phone' => 'required|string|max:50', 'data.phone_tel' => 'required|string|max:30',
                'data.email' => 'required|email|max:150', 'data.address' => 'required|array|max:5',
                'data.apps_coming_soon' => 'required|boolean',
                'data.social' => 'nullable|array:facebook,instagram,linkedin,x', 'data.social.*' => 'nullable|url|max:500',
                'data.app_store_url' => 'nullable|url|max:500', 'data.play_store_url' => 'nullable|url|max:500',
            ]);
        }

        $doc = SiteContent::updateOrCreate(['key' => $key], ['data' => $payload['data']]);
        AuditLog::record('site.content.updated', $request->user()->getKey(), ['key' => $key]);

        return ApiResponse::data(['key' => $key, 'data' => $doc->data]);
    }
}
