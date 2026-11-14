<?php

namespace App\Http\Controllers;

use App\Models\PricingSetting;
use App\Support\ApiResponse;
use App\Support\Pricing\QuoteException;
use App\Support\Pricing\QuoteService;
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
        $data = $request->validate([
            'service' => ['required', Rule::in(PricingSetting::SERVICES)],
            'tier' => ['required', 'integer', 'between:1,9'],
            'vehicle_class' => ['nullable', 'required_unless:service,client,security', Rule::in(['exec', 'first'])],
            'vehicle_size' => ['nullable', 'required_unless:service,client,security', Rule::in(['sedan', 'suv', 'van'])],
            'hours' => ['nullable', 'integer', 'between:1,24'],
            'miles' => ['nullable', 'integer', 'between:1,2000'],
            'passengers' => ['nullable', 'integer', 'between:0,60'],
            'bags' => ['nullable', 'integer', 'between:0,60'],
            'stops' => ['nullable', 'integer', 'between:0,50'],
            'guards' => ['nullable', 'integer', 'between:0,10'],
            'security_tier' => ['nullable', 'integer', 'between:1,9'],
            'guard_hours' => ['nullable', 'integer', 'between:1,24'],
        ]);

        try {
            return ApiResponse::data(['quote' => $this->quotes->quote($data)]);
        } catch (QuoteException $e) {
            return ApiResponse::error($e->errorCode, $e->getMessage(), 422, [$e->field => [$e->getMessage()]]);
        }
    }
}
