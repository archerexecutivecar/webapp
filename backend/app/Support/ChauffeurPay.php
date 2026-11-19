<?php

namespace App\Support;

use App\Models\SiteTier;

/**
 * Hourly chauffeur pay shown on Vehicles & rates and on a driver offer.
 * A saved site_tiers.pay_cents wins. Until an admin saves one, tiers 1–4 keep the
 * figures that screen already publishes. This is the hourly rate on file, not a closeout total.
 */
class ChauffeurPay
{
    /** @var array<int, int> */
    private const PUBLISHED_CENTS = [
        1 => 2500,
        2 => 3000,
        3 => 3500,
        4 => 5500,
    ];

    public static function centsForTier(int|string|null $tier): ?int
    {
        $tier = (int) $tier;
        if ($tier < 1) {
            return null;
        }

        $saved = SiteTier::query()->where('kind', 'driver')->where('tier', $tier)->value('pay_cents');
        if ($saved !== null) {
            return (int) $saved;
        }

        return self::PUBLISHED_CENTS[$tier] ?? null;
    }

    public static function dollarsForTier(int|string|null $tier): ?float
    {
        $cents = self::centsForTier($tier);

        return $cents === null ? null : round($cents / 100, 2);
    }
}
