<?php

namespace App\Support;

use App\Models\PricingSetting;
use App\Models\RideRequest;

/** Builds payment ledger rows from completed ride closeout data stored on the ride. */
class RideCloseoutMath
{
    /**
     * @return array<string, mixed>|null
     */
    public static function ledgerRow(RideRequest $ride, ?PricingSetting $pricing = null): ?array
    {
        $details = $ride->details ?? [];
        if ($details === [] && $ride->status !== 'completed') {
            return null;
        }

        $fare = self::money($details['fare'] ?? $details['booked_price'] ?? null);
        if ($fare === null) {
            if ($ride->status === 'completed') {
                $details = self::resolveCloseoutDetails($ride, $pricing);
                $fare = self::money($details['fare'] ?? $details['booked_price'] ?? null);
            }
            if ($fare === null) {
                return null;
            }
        }

        $promo = self::money($details['promo'] ?? 0) ?? 0.0;
        $bookingFee = self::money($details['booking_fee'] ?? $details['booking_fee_dollars'] ?? null) ?? 0.0;
        $tax = self::money($details['tax'] ?? $details['tax_dollars'] ?? null);
        $tip = self::money($details['tip'] ?? $details['gratuity'] ?? 0) ?? 0.0;
        $method = (string) ($details['payment_method'] ?? 'Card');
        $driverPay = self::money($details['driver_pay'] ?? $details['fleet_pay'] ?? null);
        $securityPay = self::money($details['security_pay'] ?? null) ?? 0.0;
        $extraTime = self::money($details['extra_time'] ?? null) ?? 0.0;
        $extraMinutes = (int) ($details['extra_minutes'] ?? 0);

        $taxableBase = max(0, $fare - $promo + $extraTime);
        if ($tax === null && $pricing !== null && $pricing->tax_bp > 0) {
            $feeInTaxBase = $pricing->tax_includes_fees ? $bookingFee : 0;
            $tax = round(($taxableBase + $feeInTaxBase) * ($pricing->tax_bp / 10000), 2);
        }
        $tax ??= 0.0;

        $clientPaid = self::money($details['client_paid'] ?? null);
        if ($clientPaid === null) {
            $clientPaid = round($taxableBase + $bookingFee + $tax + $tip, 2);
        }

        $cardFee = self::money($details['card_fee'] ?? null);
        if ($cardFee === null && strcasecmp($method, 'Cash') !== 0 && $pricing !== null && $pricing->card_fee_bp > 0) {
            $cardFee = round($clientPaid * ($pricing->card_fee_bp / 10000), 2);
        }
        $cardFee ??= 0.0;

        $driverPay ??= 0.0;

        $archerProfit = self::money($details['archer_profit'] ?? null);
        if ($archerProfit === null) {
            $archerProfit = round($clientPaid - $tax - $cardFee - $driverPay - $securityPay - $tip, 2);
        }

        $driver = $ride->relationLoaded('assignedDriver') ? $ride->assignedDriver : $ride->assignedDriver()->first();
        $tier = (int) ($details['tier'] ?? $ride->driver_tier ?: 1);

        return [
            'id' => (string) $ride->id,
            'ride_id' => (string) $ride->id,
            'date' => $ride->ride_date
                ? \Illuminate\Support\Carbon::parse($ride->ride_date)->format('D, M j')
                : $ride->updated_at->format('D, M j'),
            'ride_reference' => $ride->reference,
            'client_name' => trim(($ride->first_name ?? '') . ' ' . ($ride->last_name ?? '')) ?: 'Client',
            'customer_id' => $ride->customer_id ? (string) $ride->customer_id : null,
            'driver_id' => $ride->assigned_driver_id ? (string) $ride->assigned_driver_id : null,
            'driver_name' => $driver?->name,
            'method' => $method,
            'fare' => $fare,
            'booked_price' => $fare,
            'extra_time' => $extraTime,
            'extra_minutes' => $extraMinutes,
            'hours' => (int) ($details['hours'] ?? 4),
            'tier' => $tier,
            'driver_hourly_rate' => ChauffeurPay::dollarsForTier($tier),
            'promo' => $promo,
            'booking_fee' => $bookingFee,
            'tax' => $tax,
            'tip' => $tip,
            'client_paid' => $clientPaid,
            'card_fee' => $cardFee,
            'driver_pay' => $driverPay,
            'security_pay' => $securityPay,
            'archer_profit' => $archerProfit,
        ];
    }

    /**
     * Resolves and stores closeout breakdown for completed rides if missing from details.
     *
     * @return array<string, mixed>
     */
    public static function resolveCloseoutDetails(RideRequest $ride, ?PricingSetting $pricing = null): array
    {
        $details = $ride->details ?? [];
        if (isset($details['fare']) || isset($details['booked_price'])) {
            return $details;
        }

        $service = match ($ride->service_type) {
            'point_to_point', 'p2p' => 'p2p',
            'airport' => 'airport',
            'client-car', 'client_car', 'client' => 'client',
            'security' => 'security',
            default => 'hourly',
        };

        $tier = (int) ($details['tier'] ?? $ride->driver_tier ?: 1);
        if ($tier < 1) {
            $tier = 1;
        }

        $class = $details['vehicle_class'] ?? null;
        $size = $details['vehicle_size'] ?? null;
        if (! $class || ! $size) {
            if ($ride->vehicle && str_contains($ride->vehicle, '|')) {
                [$c, $s] = explode('|', $ride->vehicle, 2);
                $class = $class ?: $c;
                $size = $size ?: $s;
            }
        }
        $class = $class ?: 'exec';
        $size = $size ?: 'suv';

        $hours = (int) ($details['hours'] ?? ($service === 'client' ? 3 : 4));
        if ($hours < 1) {
            $hours = 4;
        }

        $guards = (int) ($details['guards'] ?? ($ride->security_addon ? 1 : 0));
        $secTier = (int) ($details['security_tier'] ?? $tier);

        $fare = 0.0;
        $bookingFee = 5.00;
        $tax = 0.0;
        $tip = self::money($details['tip'] ?? $details['gratuity'] ?? null) ?? 0.0;

        try {
            $quoteService = app(\App\Support\Pricing\QuoteService::class);
            $quote = $quoteService->quote([
                'service' => $service,
                'tier' => $tier,
                'vehicle_class' => in_array($service, ['client', 'security']) ? null : $class,
                'vehicle_size' => in_array($service, ['client', 'security']) ? null : $size,
                'hours' => $hours,
                'passengers' => (int) ($details['passengers'] ?? 1),
                'bags' => (int) ($details['bags'] ?? 0),
                'guards' => $guards,
                'security_tier' => $secTier,
                'guard_hours' => (int) ($details['guard_hours'] ?? $hours),
            ]);

            $fare = round($quote['subtotal_cents'] / 100, 2);
            $bookingFee = round($quote['booking_fee_cents'] / 100, 2);
            $tax = round($quote['tax_cents'] / 100, 2);
            if ($tip === 0.0 && ($quote['gratuity_suggested_cents'] ?? 0) > 0) {
                $tip = round($quote['gratuity_suggested_cents'] / 100, 2);
            }
        } catch (\Throwable) {
            $rateCard = \App\Models\RateCard::where('kind', $service === 'p2p' ? 'point_to_point' : 'hourly')
                ->where('vehicle_class', $class)
                ->where('size', $size)
                ->where('tier', $tier)
                ->value('amount_cents');
            if ($rateCard) {
                $fare = round(($rateCard / 100) * ($service === 'p2p' ? 1 : $hours), 2);
            } else {
                $fare = 320.00;
            }
            $tax = round($fare * 0.06625, 2);
        }

        $extraTimeDollars = self::money($details['extra_time'] ?? null) ?? 0.0;
        $extraMinutes = (int) ($details['extra_minutes'] ?? 0);
        $totalHours = $hours + ($extraMinutes / 60);

        $driverHourlyRate = ChauffeurPay::dollarsForTier($tier);
        $driverPay = self::money($details['driver_pay'] ?? null) ?? round($driverHourlyRate * $totalHours, 2);

        $securityHourlyRate = match ($secTier) {
            1 => 30.0,
            2 => 40.0,
            3 => 50.0,
            default => 40.0,
        };
        $securityPay = self::money($details['security_pay'] ?? null) ?? ($guards > 0 ? round($securityHourlyRate * $totalHours * $guards, 2) : 0.0);

        $clientPaid = self::money($details['client_paid'] ?? null) ?? round($fare + $extraTimeDollars + $bookingFee + $tax + $tip, 2);
        $cardFee = self::money($details['card_fee'] ?? null) ?? round(($clientPaid * 0.035) + 0.15, 2);
        $archerProfit = self::money($details['archer_profit'] ?? null) ?? round($clientPaid - $tax - $cardFee - $driverPay - $securityPay - $tip, 2);

        $details['fare'] = $fare;
        $details['booked_price'] = $fare;
        $details['extra_time'] = $extraTimeDollars;
        $details['extra_minutes'] = $extraMinutes;
        $details['booking_fee'] = $bookingFee;
        $details['tax'] = $tax;
        $details['tip'] = $tip;
        $details['client_paid'] = $clientPaid;
        $details['driver_pay'] = $driverPay;
        $details['security_pay'] = $securityPay;
        $details['card_fee'] = $cardFee;
        $details['archer_profit'] = $archerProfit;
        $details['payment_method'] = $details['payment_method'] ?? 'Card';

        return $details;
    }

    private static function money(mixed $value): ?float
    {
        if ($value === null || $value === '') {
            return null;
        }

        return round((float) $value, 2);
    }
}
