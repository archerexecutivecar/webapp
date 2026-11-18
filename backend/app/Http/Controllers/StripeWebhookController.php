<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\IntegrationSetting;
use App\Models\RideRequest;
use App\Models\StripeWebhookEvent;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
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

        if (Schema::hasTable('stripe_webhook_events')) {
            $exists = StripeWebhookEvent::where('stripe_event_id', $event->id)->exists();
            if ($exists) {
                return ApiResponse::data(['received' => true, 'duplicate' => true]);
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
            $ride = RideRequest::find($rideId);
        }
        if ($ride === null && $rideReference) {
            $ride = RideRequest::where('reference', $rideReference)->first();
        }

        if ($ride === null) {
            AuditLog::record('payment.stripe.unmatched', null, [
                'event_type' => $eventType,
                'stripe_id' => $stripeObject->id ?? null,
            ]);

            return;
        }

        $details = $ride->details ?? [];
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