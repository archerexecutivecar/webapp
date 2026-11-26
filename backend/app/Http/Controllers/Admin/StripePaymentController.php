<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\IntegrationSetting;
use App\Models\RideRequest;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Stripe\StripeClient;

class StripePaymentController extends Controller
{
    public function createIntent(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'ride_id' => 'required|string',
            'currency' => 'nullable|string|size:3',
        ]);

        if (! Schema::hasTable('integration_settings')) {
            return ApiResponse::error('INTEGRATIONS_MISSING', 'Integration settings are not configured.', 503);
        }

        $settings = IntegrationSetting::current();
        $secret = $settings->stripe_secret_key ?: config('services.stripe.secret');
        if (! $secret) {
            return ApiResponse::error('STRIPE_NOT_CONFIGURED', 'Stripe secret key is not configured in Integrations.', 422);
        }

        $ride = RideRequest::findOrFail($validated['ride_id']);
        $details = is_array($ride->details) ? $ride->details : [];
        $closeout = is_array($details['closeout'] ?? null) ? $details['closeout'] : [];

        $dollars = $closeout['total']
            ?? $closeout['amount']
            ?? $details['client_paid']
            ?? $details['fare_total']
            ?? $details['booked_price']
            ?? null;
        if ($dollars === null) {
            return ApiResponse::error('AMOUNT_REQUIRED', 'A server-side closeout or fare total must exist on the ride before creating a payment intent.', 422);
        }

        $amountCents = (int) round(((float) $dollars) * 100);

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
            return ApiResponse::error('STRIPE_ERROR', 'Unable to create Stripe payment intent.', 502);
        }

        DB::transaction(function () use ($ride, $intent): void {
            $locked = RideRequest::whereKey($ride->id)->lockForUpdate()->firstOrFail();
            $lockedDetails = is_array($locked->details) ? $locked->details : [];
            $lockedDetails['stripe_payment_intent_id'] = $intent->id;
            $lockedDetails['stripe_payment_status'] = $intent->status;
            $lockedDetails['payment_provider'] = 'stripe';
            $locked->details = $lockedDetails;
            $locked->save();
        });

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
