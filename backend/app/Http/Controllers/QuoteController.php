<?php

namespace App\Http\Controllers;

use App\Models\PricingSetting;
use App\Support\ApiResponse;
use App\Support\Pricing\QuoteException;
use App\Support\Pricing\QuoteService;
use App\Support\RateCatalog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * POST /v1/quotes (public) and POST /v1/admin/pricing/simulate (Admin) share this one calculator,
 * so the website, client app and Admin always show the same price. Client totals are never accepted.
 */
class QuoteController extends Controller
{
    public function __construct(private readonly QuoteService $quotes) {}

    public function store(Request $request): JsonResponse
    {
        if ($request->has('size') && ! $request->has('vehicle_size')) {
            $request->merge(['vehicle_size' => $request->input('size')]);
        }

        $data = $request->validate([
            'service' => ['required', Rule::in(PricingSetting::SERVICES)],
            'tier' => ['required', 'integer', 'min:1', 'max:255'],
            'vehicle_class' => ['nullable', 'required_unless:service,client,security', Rule::in(RateCatalog::classKeys())],
            'vehicle_size' => ['nullable', 'required_unless:service,client,security', Rule::in(RateCatalog::sizeKeys())],
            'airport_code' => ['nullable', 'string', 'max:20'],
            'airport' => ['nullable', 'string', 'max:20'],
            'round_trip' => ['nullable', 'boolean'],
            'is_round_trip' => ['nullable', 'boolean'],
            'booking_type' => ['nullable', 'string', 'max:50'],
            'is_fbo_hotel' => ['nullable', 'boolean'],
            'hours' => ['nullable', 'integer', 'between:1,24'],
            'miles' => ['nullable', 'integer', 'between:1,2000'],
            'passengers' => ['nullable', 'integer', 'between:0,60'],
            'bags' => ['nullable', 'integer', 'between:0,60'],
            'stops' => ['nullable', 'integer', 'between:0,50'],
            'guards' => ['nullable', 'integer', 'between:0,10'],
            'security_tier' => ['nullable', 'integer', 'min:1', 'max:255'],
            'guard_hours' => ['nullable', 'integer', 'between:1,24'],
        ]);

        try {
            return ApiResponse::data(['quote' => $this->quotes->quote($data)]);
        } catch (QuoteException $e) {
            return ApiResponse::error($e->errorCode, $e->getMessage(), 422, [$e->field => [$e->getMessage()]]);
        }
    }
}
