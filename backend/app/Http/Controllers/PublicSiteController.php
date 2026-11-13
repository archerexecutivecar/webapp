<?php

namespace App\Http\Controllers;

use App\Models\RateCard;
use App\Models\SiteContent;
use App\Models\SiteTier;
use App\Models\SiteVehicle;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;

/** Read-only public content for the website. Active records only; rates are display figures. */
class PublicSiteController extends Controller
{
    public function show(): JsonResponse
    {
        $docs = SiteContent::all()->mapWithKeys(fn ($c) => [$c->key => $c->data]);

        return ApiResponse::data([
            'settings' => $docs['settings'] ?? null,
            'home' => $docs['home'] ?? null,
            'fleet' => $docs['fleet'] ?? null,
            'tiers' => $docs['tiers'] ?? null,
            'services' => $docs->filter(fn ($_, $k) => str_starts_with($k, 'service.'))->values(),
            'tier_list' => SiteTier::where('is_active', true)->orderBy('kind')->orderBy('sort_order')->get(),
            'vehicles' => SiteVehicle::where('is_active', true)->orderBy('sort_order')->get(),
            'rates' => RateCard::where('is_active', true)->get(['kind', 'vehicle_class', 'size', 'tier', 'amount_cents']),
        ]);
    }
}
