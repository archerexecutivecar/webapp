<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\IntegrationSetting;
use App\Models\RideRequest;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Stripe\StripeClient;

class StripePaymentController extends Controller
{
    public function createIntent(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'ride_id' => 'required|string',
            'amount_cents' => 'nullable|integer|min:50',
            'currency' => 'nullable|string|size:3',
        ]);

        if (! Schema::hasTable('integration_settings')) {
            return ApiResponse::error('INTEGRATIONS_MISSING', 'Integration settings are not configured.', 503);
        }

        $settings = IntegrationSetting::current();
        $secret = $settings->stripe_secret_key ?: env('STRIPE_SECRET_KEY');
        if (! $secret) {
            return ApiResponse::error('STRIPE_NOT_CONFIGURED', 'Stripe secret key is not configured in Integrations.', 422);
        }

        $ride = RideRequest::findOrFail($validated['ride_id']);
        $details = is_array($ride->details) ? $ride->details : [];
        $closeout = is_array($details['closeout'] ?? null) ? $details['closeout'] : [];

        $amountCents = $validated['amount_cents'] ?? null;
        if ($amountCents === null) {
            $dollars = $closeout['total']
                ?? $closeout['amount']
                ?? $details['fare_total']
                ?? $details['booked_price']
                ?? null;
            if ($dollars === null) {
                return ApiResponse::error('AMOUNT_REQUIRED', 'Provide amount_cents or store a closeout total on the ride.', 422);
            }
            $amountCents = (int) round(((float) $dollars) * 100);
        }

        if ($amountCents < 50) {
            return ApiResponse::error('AMOUNT_TOO_LOW', 'Stripe requires at least 50 cents.', 422);
        }

        $currency = strtolower($validated['currency'] ?? 'usd');

        try {
            $stripe = new StripeClient($secret);
            $intent = $stripe->paymentIntents->create([
                'amount' => $amountCents,
                'currency' => $currency,
                'metadata' => [
                    'ride_id' => (string) $ride->id,
                    'ride_reference' => (string) ($ride->reference ?? ''),
                ],
                'automatic_payment_methods' => ['enabled' => true],
            ]);
        } catch (\Throwable $e) {
            return ApiResponse::error('STRIPE_ERROR', $e->getMessage(), 502);
        }

        $details['stripe_payment_intent_id'] = $intent->id;
        $details['stripe_payment_status'] = $intent->status;
        $details['payment_provider'] = 'stripe';
        $ride->details = $details;
        $ride->save();

        AuditLog::record('payment.stripe.intent_created', $request->user()?->id, [
            'ride_id' => $ride->id,
            'payment_intent_id' => $intent->id,
            'amount_cents' => $amountCents,
        ], $ride);

        return ApiResponse::data([
            'payment_intent_id' => $intent->id,
            'client_secret' => $intent->client_secret,
            'amount_cents' => $amountCents,
            'currency' => $currency,
            'ride_id' => $ride->id,
            'ride_reference' => $ride->reference,
        ], 201);
    }
}
