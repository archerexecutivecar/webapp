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
            return null;
        }

        $promo = self::money($details['promo'] ?? 0) ?? 0.0;
        $bookingFee = self::money($details['booking_fee'] ?? $details['booking_fee_dollars'] ?? null) ?? 0.0;
        $tax = self::money($details['tax'] ?? $details['tax_dollars'] ?? null);
        $tip = self::money($details['tip'] ?? $details['gratuity'] ?? 0) ?? 0.0;
        $method = (string) ($details['payment_method'] ?? 'Card');
        $driverPay = self::money($details['driver_pay'] ?? $details['fleet_pay'] ?? null);

        $taxableBase = max(0, $fare - $promo);
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
            $archerProfit = round($clientPaid - $tax - $cardFee - $driverPay - $tip, 2);
        }

        $driver = $ride->relationLoaded('assignedDriver') ? $ride->assignedDriver : $ride->assignedDriver()->first();

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
            'promo' => $promo,
            'booking_fee' => $bookingFee,
            'tax' => $tax,
            'tip' => $tip,
            'client_paid' => $clientPaid,
            'card_fee' => $cardFee,
            'driver_pay' => $driverPay,
            'archer_profit' => $archerProfit,
        ];
    }

    private static function money(mixed $value): ?float
    {
        if ($value === null || $value === '') {
            return null;
        }

        return round((float) $value, 2);
    }
}