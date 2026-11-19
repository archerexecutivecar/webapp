<?php

namespace App\Http\Controllers;

use App\Models\RateCard;
use App\Models\SiteContent;
use App\Models\SiteTier;
use App\Support\ApiResponse;
use App\Support\FleetAvailability;
use App\Support\PublicFleet;
use App\Support\OperationalFleet;
use App\Support\ServiceAreas;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Read-only public content for the website. Active records only; rates are display figures. */
class PublicSiteController extends Controller
{
    public function show(): JsonResponse
    {
        $docs = SiteContent::all()->mapWithKeys(fn ($c) => [$c->key => $c->data]);

        return ApiResponse::data([
            'settings' => ServiceAreas::withDefaults(is_array($docs['settings'] ?? null) ? $docs['settings'] : null),
            'home' => $docs['home'] ?? null,
            'fleet' => $docs['fleet'] ?? null,
            'tiers' => $docs['tiers'] ?? null,
            'services' => $docs->filter(fn ($_, $k) => str_starts_with($k, 'service.'))->values(),
            'tier_list' => SiteTier::where('is_active', true)->orderBy('kind')->orderBy('sort_order')->get(),
            'vehicles' => PublicFleet::vehicles(),
            'rate_fleet' => OperationalFleet::publicRows(),
            'rates' => RateCard::where('is_active', true)->get(['kind', 'vehicle_class', 'size', 'tier', 'amount_cents']),
        ]);
    }

    /** Cars marked out of service or blocked on Site Vehicles, grouped by class and size. */
    public function availability(Request $request): JsonResponse
    {
        $data = $request->validate([
            'date' => ['nullable', 'date_format:Y-m-d'],
            'time' => ['nullable', 'date_format:H:i'],
            'hours' => ['nullable', 'integer', 'between:1,24'],
        ]);

        return ApiResponse::data([
            'options' => FleetAvailability::options(
                $data['date'] ?? null,
                $data['time'] ?? null,
                isset($data['hours']) ? (int) $data['hours'] : null,
            ),
        ]);
    }
}
