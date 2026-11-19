<?php

namespace App\Http\Controllers;

use App\Models\SiteContent;
use App\Support\ApiResponse;
use App\Support\BrandSettings;
use Illuminate\Http\JsonResponse;

/** Brand name, logo, and contact details for the website, customer app, and driver app. */
class PublicBrandController extends Controller
{
    public function show(): JsonResponse
    {
        return ApiResponse::data(BrandSettings::present(SiteContent::find('settings')?->data));
    }
}
