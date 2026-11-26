<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\SiteContent;
use App\Support\ApiResponse;
use App\Support\BrandSettings;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class BrandSettingsController extends Controller
{
    public function show(): JsonResponse
    {
        $data = SiteContent::find('settings')?->data;
        $brand = BrandSettings::present($data);
        $brand['social'] = is_array($data['social'] ?? null)
            ? $data['social']
            : ['instagram' => null, 'facebook' => null, 'linkedin' => null, 'x' => null];

        return ApiResponse::data([
            'brand' => $brand,
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $merge = [
            'tagline' => self::blankToNull($request->input('tagline')),
            'logo_url' => self::blankToNull($request->input('logo_url')),
            'phone_secondary' => self::blankToNull($request->input('phone_secondary')),
        ];

        if ($request->has('social') && is_array($request->input('social'))) {
            $socialInput = $request->input('social');
            $merge['social'] = [
                'instagram' => self::blankToNull($socialInput['instagram'] ?? null),
                'facebook' => self::blankToNull($socialInput['facebook'] ?? null),
                'linkedin' => self::blankToNull($socialInput['linkedin'] ?? null),
                'x' => self::blankToNull($socialInput['x'] ?? null),
            ];
        }

        $request->merge($merge);

        $validated = $request->validate([
            'brand_name' => ['required', 'string', 'max:120'],
            'legal_name' => ['required', 'string', 'max:160'],
            'tagline' => ['nullable', 'string', 'max:160'],
            'logo_url' => ['nullable', 'url', 'max:500'],
            'phone' => ['required', 'string', 'max:50'],
            'phone_tel' => ['required', 'string', 'max:30'],
            'phone_secondary' => ['nullable', 'string', 'max:50'],
            'email' => ['required', 'email', 'max:150'],
            'address' => ['required', 'array', 'min:1', 'max:5'],
            'address.*' => ['required', 'string', 'max:160'],
            'social' => ['nullable', 'array'],
            'social.instagram' => ['nullable', 'url', 'max:500'],
            'social.facebook' => ['nullable', 'url', 'max:500'],
            'social.linkedin' => ['nullable', 'url', 'max:500'],
            'social.x' => ['nullable', 'url', 'max:500'],
        ]);

        $validated['brand_name'] = trim($validated['brand_name']);
        $validated['legal_name'] = trim($validated['legal_name']);
        $validated['phone'] = trim($validated['phone']);
        $validated['phone_tel'] = trim($validated['phone_tel']);
        $validated['email'] = trim($validated['email']);
        $validated['address'] = array_values(array_filter(array_map(
            static fn ($line) => trim((string) $line),
            $validated['address']
        ), static fn ($line) => $line !== ''));

        $messages = array_filter([
            'brand_name' => $validated['brand_name'] === '' ? 'Enter the exact brand name.' : null,
            'legal_name' => $validated['legal_name'] === '' ? 'Enter the legal name.' : null,
            'address' => $validated['address'] === [] ? 'Enter at least one address line.' : null,
        ]);
        if ($messages !== []) {
            throw ValidationException::withMessages($messages);
        }

        $doc = SiteContent::firstOrNew(['key' => 'settings']);
        $data = is_array($doc->data) ? $doc->data : [];
        $doc->data = array_merge($data, $validated);
        $doc->save();

        AuditLog::record('brand.settings.updated', $request->user()?->id, $validated, $doc);

        $brand = BrandSettings::present($doc->data);
        $brand['social'] = is_array($doc->data['social'] ?? null)
            ? $doc->data['social']
            : ['instagram' => null, 'facebook' => null, 'linkedin' => null, 'x' => null];

        return ApiResponse::data([
            'message' => 'Brand settings saved.',
            'brand' => $brand,
        ]);
    }

    private static function blankToNull(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }
        $value = trim($value);

        return $value === '' ? null : $value;
    }
}
