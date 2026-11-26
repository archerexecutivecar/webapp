<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\IntegrationSetting;
use App\Models\RideRequest;
use App\Models\StripeWebhookEvent;
use App\Support\ApiResponse;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Stripe\Exception\SignatureVerificationException;
use Stripe\Webhook;
use UnexpectedValueException;

class StripeWebhookController extends Controller
{
    public function handle(Request $request): JsonResponse
    {
        $payload = $request->getContent();
        $sigHeader = $request->header('Stripe-Signature');

        if ($sigHeader === null || $sigHeader === '') {
            return ApiResponse::error('MISSING_SIGNATURE', 'Stripe-Signature header is required.', 400);
        }

        $secret = IntegrationSetting::current()->resolvedStripeWebhookSecret();
        if ($secret === null || $secret === '') {
            Log::warning('Stripe webhook received but no webhook secret is configured.');

            return ApiResponse::error('WEBHOOK_NOT_CONFIGURED', 'Stripe webhook secret is not configured.', 503);
        }

        try {
            $event = Webhook::constructEvent($payload, $sigHeader, $secret);
        } catch (UnexpectedValueException) {
            return ApiResponse::error('INVALID_PAYLOAD', 'Invalid webhook payload.', 400);
        } catch (SignatureVerificationException) {
            return ApiResponse::error('INVALID_SIGNATURE', 'Webhook signature verification failed.', 400);
        }

        $duplicate = false;

        try {
            DB::transaction(function () use ($event, &$duplicate): void {
                if (Schema::hasTable('stripe_webhook_events')) {
                    if (StripeWebhookEvent::where('stripe_event_id', $event->id)->lockForUpdate()->exists()) {
                        $duplicate = true;

                        return;
                    }

                    StripeWebhookEvent::create([
                        'stripe_event_id' => $event->id,
                        'event_type' => $event->type,
                        'processed_at' => now(),
                    ]);
                }

                if (in_array($event->type, ['payment_intent.succeeded', 'charge.succeeded'], true)) {
                    $this->applyPaymentSuccess($event->type, $event->data->object);
                }
            });
        } catch (QueryException) {
            return ApiResponse::data(['received' => true, 'duplicate' => true]);
        }

        if ($duplicate) {
            return ApiResponse::data(['received' => true, 'duplicate' => true]);
        }

        return ApiResponse::data(['received' => true]);
    }

    /**
     * @param  object  $stripeObject  PaymentIntent or Charge from Stripe
     */
    private function applyPaymentSuccess(string $eventType, object $stripeObject): void
    {
        $metadata = (array) ($stripeObject->metadata ?? []);
        $rideId = $metadata['ride_id'] ?? $metadata['rideId'] ?? null;
        $rideReference = $metadata['ride_reference'] ?? $metadata['rideReference'] ?? $metadata['reference'] ?? null;

        $ride = null;
        if ($rideId) {
            $ride = RideRequest::whereKey($rideId)->lockForUpdate()->first();
        }
        if ($ride === null && $rideReference) {
            $ride = RideRequest::where('reference', $rideReference)->lockForUpdate()->first();
        }

        if ($ride === null) {
            AuditLog::record('payment.stripe.unmatched', null, [
                'event_type' => $eventType,
                'stripe_id' => $stripeObject->id ?? null,
            ]);

            return;
        }

        $details = is_array($ride->details) ? $ride->details : [];
        $expectedIntentId = $details['stripe_payment_intent_id'] ?? null;
        $incomingIntentId = $eventType === 'payment_intent.succeeded'
            ? ($stripeObject->id ?? null)
            : ($stripeObject->payment_intent ?? null);
        if ($expectedIntentId !== null && $incomingIntentId !== null && $expectedIntentId !== $incomingIntentId) {
            AuditLog::record('payment.stripe.intent_mismatch', null, [
                'ride_id' => $ride->id,
                'expected_intent_id' => $expectedIntentId,
                'incoming_intent_id' => $incomingIntentId,
            ], $ride);

            return;
        }

        $details['payment_status'] = 'paid';
        $details['payment_provider'] = 'stripe';
        $details['stripe_payment_id'] = $stripeObject->id ?? null;
        if (isset($stripeObject->amount)) {
            $details['stripe_amount_cents'] = (int) $stripeObject->amount;
        }

        $ride->update(['details' => $details]);

        AuditLog::record('payment.stripe.' . str_replace('.', '_', $eventType), null, [
            'ride_id' => $ride->id,
            'ride_reference' => $ride->reference,
            'stripe_id' => $stripeObject->id ?? null,
            'event_type' => $eventType,
        ], $ride);
    }
}