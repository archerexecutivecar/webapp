<?php

namespace App\Support\Pricing;

use App\Models\PricingSetting;
use App\Models\RateCard;
use App\Models\SiteTier;
use App\Models\SiteVehicle;

/**
 * The single price calculator for the website, client app and Admin simulator.
 * Every number comes from Admin data (pricing_settings, rate_cards, site_tiers, site_vehicles); nothing is guessed:
 * a missing or inactive rate stops the quote with RATE_NOT_CONFIGURED. All arithmetic is integer cents.
 *
 * Input keys: service, tier, vehicle_class, vehicle_size, hours, miles, passengers, bags, stops, guards,
 * security_tier, guard_hours.
 */
class QuoteService
{
    public const RULE_VERSION = 'pricing-2026-11-14';

    public function quote(array $in): array
    {
        $service = $in['service'];
        $s = PricingSetting::where('service', $service)->first();
        if (! $s || ! $s->is_active) {
            throw new QuoteException('SERVICE_UNAVAILABLE', 'This service is not currently offered.', 'service');
        }

        $tier = (int) $in['tier'];
        $this->assertTier('driver', $tier, 'tier');

        $lines = [];
        $hours = null;
        $vanHourly = false;
        $isFrom = false;

        if ($service === 'security') {
            $guards = max(1, (int) ($in['guards'] ?? 1));
            $hours = $this->hours($s, $in);
            $rate = $this->rate('security_hourly', null, null, $tier);
            $lines[] = $this->line('base', "$guards guard(s) × {$hours} hrs", $rate * $guards * $hours, $rate, 'per guard-hour', $hours, 'hrs', $guards);
        } elseif ($service === 'client') {
            $hours = $this->hours($s, $in);
            $rate = $this->rate('client_car_hourly', null, null, $tier);
            $lines[] = $this->line('base', "Chauffeur × {$hours} hrs", $rate * $hours, $rate, 'per hour', $hours, 'hrs');
        } else {
            [$class, $size] = [$in['vehicle_class'] ?? null, $in['vehicle_size'] ?? null];
            $vehicle = SiteVehicle::where('vehicle_class', $class)->where('size', $size)->where('is_active', true)->first();
            if (! $vehicle) {
                throw new QuoteException('VEHICLE_UNAVAILABLE', 'This vehicle is not currently offered.', 'vehicle_size');
            }
            $this->assertCapacity($vehicle, (int) ($in['passengers'] ?? 0), (int) ($in['bags'] ?? 0));

            $flat = $service !== 'hourly' && $s->pricing_mode === 'flat';
            $vanHourly = $flat && $size === 'van' && $s->van_hourly;

            if ($flat && ! $vanHourly) {
                // Flat trip fare by tier × class × size (Rates: Point to point).
                $rate = $this->rate('point_to_point', $class, $size, $tier);
                $lines[] = $this->line('base', 'Trip fare', $rate, $rate, 'per trip', 1, 'trip');
                $isFrom = true;
            } elseif ($service !== 'hourly' && $s->pricing_mode === 'per_mile') {
                $miles = (int) ($in['miles'] ?? 0);
                if ($miles < 1) {
                    throw new QuoteException('DISTANCE_REQUIRED', 'Trip distance is needed for this price.', 'miles');
                }
                $miles = max($miles, (int) $s->min_miles);
                $rate = $this->rate('per_mile', $class, $size, $tier);
                $lines[] = $this->line('base', "{$vehicle->model} × {$miles} mi", $rate * $miles, $rate, 'per mile', $miles, 'mi');
            } else {
                $hours = $this->hours($s, $in);
                $rate = $this->rate('hourly', $class, $size, $tier);
                $line = $this->line('base', "{$vehicle->model} × {$hours} hrs", $rate * $hours, $rate, 'per hour', $hours, 'hrs');
                if ($vanHourly) {
                    $line['note'] = 'Sprinter, hourly only';
                }
                $lines[] = $line;
            }

            $guards = (int) ($in['guards'] ?? 0);
            if ($guards > 0) {
                $secTier = (int) ($in['security_tier'] ?? $tier);
                $this->assertTier('security', $secTier, 'security_tier');
                $guardHours = $s->guard_hours_mode === 'ride' && $hours !== null ? $hours : (int) ($in['guard_hours'] ?? 0);
                $guardHours = max($guardHours, (int) $s->guard_min_hours);
                if ($guardHours < 1) {
                    throw new QuoteException('GUARD_HOURS_REQUIRED', 'Enter how many hours security is needed.', 'guard_hours');
                }
                $rate = $this->rate('security_hourly', null, null, $secTier);
                $lines[] = $this->line('security', "$guards guard(s) × {$guardHours} hrs", $rate * $guards * $guardHours, $rate, 'per guard-hour', $guardHours, 'hrs', $guards);
            }
        }

        $stops = (int) ($in['stops'] ?? 0);
        if ($s->max_stops !== null && $stops > $s->max_stops) {
            throw new QuoteException('TOO_MANY_STOPS', "This service allows up to {$s->max_stops} stops.", 'stops');
        }
        // A Sprinter priced hourly on a trip gets hourly terms: stops are free.
        $includedStops = $vanHourly ? $stops : (int) $s->included_stops;
        $stopFee = $vanHourly ? 0 : $s->stop_fee_cents;
        $this->charge($lines, 'stops', 'Extra stops', max(0, $stops - $includedStops), $stopFee);
        $this->charge($lines, 'passengers', 'Extra passengers', max(0, (int) ($in['passengers'] ?? 0) - $s->included_passengers), $s->per_passenger_cents);
        $this->charge($lines, 'bags', 'Extra bags', max(0, (int) ($in['bags'] ?? 0) - $s->included_bags), $s->per_bag_cents);

        $subtotal = array_sum(array_column($lines, 'amount_cents'));
        $bookingFee = $s->booking_fee_cents;
        $tax = $this->percent($subtotal + ($s->tax_includes_fees ? $bookingFee : 0), $s->tax_bp);
        $cardFee = $this->percent($subtotal + $bookingFee + $tax, $s->card_fee_bp);
        $total = $subtotal + $bookingFee + $tax + $cardFee;

        return [
            'service' => $service,
            'currency' => 'USD',
            'lines' => $lines,
            'subtotal_cents' => $subtotal,
            'booking_fee_cents' => $bookingFee,
            'stops' => $stops,
            'included_stops' => $vanHourly ? $stops : (int) $s->included_stops, // stops covered by the fare
            'stop_fee_cents' => $stopFee,
            'is_from_price' => $isFrom, // flat trip fares are a starting price: dispatch confirms longer routes
            'tax_cents' => $tax,
            'tax_bp' => $s->tax_bp,
            'card_fee_cents' => $cardFee,
            'card_fee_bp' => $s->card_fee_bp,
            'total_cents' => $total,
            'gratuity_suggested_cents' => $this->percent($subtotal, $s->gratuity_suggested_bp),
            'gratuity_suggested_bp' => $s->gratuity_suggested_bp,
            'gratuity_included' => false,
            'is_estimate' => true,
            'rule_version' => self::RULE_VERSION,
        ];
    }

    private function hours(PricingSetting $s, array $in): int
    {
        $hours = max((int) ($in['hours'] ?? 0), (int) $s->min_hours);
        if ($hours < 1) {
            throw new QuoteException('HOURS_REQUIRED', 'Enter how many hours you need.', 'hours');
        }

        return $hours;
    }

    private function rate(string $kind, ?string $class, ?string $size, int $tier): int
    {
        $card = RateCard::where('kind', $kind)->where('vehicle_class', $class)->where('size', $size)
            ->where('tier', $tier)->where('is_active', true)->first();
        if (! $card) {
            throw new QuoteException('RATE_NOT_CONFIGURED', 'A price is not set for this combination yet. Please call dispatch.', 'tier');
        }

        return $card->amount_cents;
    }

    private function assertTier(string $kind, int $tier, string $field): void
    {
        if (! SiteTier::where('kind', $kind)->where('tier', $tier)->where('is_active', true)->exists()) {
            throw new QuoteException('TIER_UNAVAILABLE', 'This tier is not currently offered.', $field);
        }
    }

    private function assertCapacity(SiteVehicle $v, int $passengers, int $bags): void
    {
        if ($v->passengers !== null && $passengers > $v->passengers) {
            throw new QuoteException('OVER_CAPACITY', "The {$v->model} seats up to {$v->passengers} passengers.", 'passengers');
        }
        if ($v->bags !== null && $bags > $v->bags) {
            throw new QuoteException('OVER_CAPACITY', "The {$v->model} holds up to {$v->bags} bags.", 'bags');
        }
    }

    private function charge(array &$lines, string $code, string $label, int $qty, int $unit): void
    {
        if ($qty > 0 && $unit > 0) {
            $lines[] = $this->line($code, $label, $qty * $unit, $unit, 'each', $qty, 'each');
        }
    }

    /** quantity × unit_cents (× guards, for security lines) = amount_cents. */
    private function line(string $code, string $label, int $amount, int $unit, string $per, int $quantity, string $quantityUnit, ?int $guards = null): array
    {
        return [
            'code' => $code, 'label' => $label, 'unit_cents' => $unit, 'per' => $per, 'amount_cents' => $amount,
            'quantity' => $quantity, 'quantity_unit' => $quantityUnit, 'guards' => $guards,
        ];
    }

    /** Basis-point percentage of integer cents, rounded half up. */
    private function percent(int $cents, int $bp): int
    {
        return intdiv($cents * $bp + 5000, 10000);
    }
}
