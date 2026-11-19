<?php

namespace App\Support;

/**
 * Authoritative ride status transitions for dispatch and driver portal.
 * Aliases normalize UI/API vocabulary onto a single graph.
 */
class RideStateMachine
{
    /**
     * Statuses a customer still has in front of them. Completed and cancelled are the only closed ones.
     *
     * @var list<string>
     */
    public const UPCOMING = [
        'new',
        'pending',
        'broadcast',
        'accepted',
        'dispatched',
        'driver_assigned',
        'on_my_way',
        'at_doorstep',
        'at_your_doorstep',
        'ride_started',
        'in_progress',
        'ride_ended',
        'close_out',
    ];

    /** Canonical statuses used after normalization. */
    public const STATUSES = [
        'new',
        'pending',
        'broadcast',
        'accepted',
        'dispatched',
        'driver_assigned',
        'on_my_way',
        'at_doorstep',
        'ride_started',
        'in_progress',
        'ride_ended',
        'close_out',
        'completed',
        'cancelled',
    ];

    /** Progress graphic: 0 requested, 1 assigned, 2 on the way, 3 completed, -1 cancelled. */
    public static function progressRank(?string $status): int
    {
        return match (self::normalize($status ?: 'pending')) {
            'new', 'pending', 'broadcast' => 0,
            'dispatched' => 1,
            'on_my_way', 'at_doorstep', 'ride_started', 'in_progress', 'ride_ended', 'close_out' => 2,
            'completed' => 3,
            'cancelled' => -1,
            default => 0,
        };
    }

    /**
     * Map aliases → preferred storage value (identity for canonical names).
     */
    public static function normalize(string $status): string
    {
        $s = strtolower(trim($status));

        return match ($s) {
            'at_your_doorstep' => 'at_doorstep',
            'driver_assigned' => 'dispatched',
            'accepted' => 'dispatched',
            default => $s,
        };
    }

    /**
     * Allowed next statuses keyed by current (normalized) status.
     *
     * @return array<string, list<string>>
     */
    public static function graph(): array
    {
        return [
            'new' => ['pending', 'broadcast', 'dispatched', 'cancelled'],
            'pending' => ['new', 'broadcast', 'dispatched', 'cancelled'],
            'broadcast' => ['dispatched', 'pending', 'cancelled'],
            'dispatched' => ['on_my_way', 'in_progress', 'ride_started', 'cancelled', 'broadcast'],
            'on_my_way' => ['at_doorstep', 'ride_started', 'in_progress', 'cancelled'],
            'at_doorstep' => ['ride_started', 'in_progress', 'cancelled'],
            'ride_started' => ['in_progress', 'ride_ended', 'completed', 'cancelled'],
            'in_progress' => ['ride_ended', 'close_out', 'completed', 'cancelled'],
            'ride_ended' => ['close_out', 'completed', 'cancelled'],
            'close_out' => ['completed', 'cancelled'],
            'completed' => [],
            'cancelled' => [],
        ];
    }

    public static function canTransition(?string $from, string $to): bool
    {
        $fromN = self::normalize($from ?: 'new');
        $toN = self::normalize($to);

        if ($fromN === $toN) {
            return true;
        }

        $allowed = self::graph()[$fromN] ?? null;
        if ($allowed === null) {
            // Unknown current status: allow only cancellation or known terminal path via broadcast/dispatch
            return in_array($toN, ['cancelled', 'pending', 'broadcast', 'dispatched'], true);
        }

        return in_array($toN, $allowed, true);
    }

    /** @return list<string> */
    public static function allowedFrom(?string $from): array
    {
        $fromN = self::normalize($from ?: 'new');

        return self::graph()[$fromN] ?? ['cancelled'];
    }

    /**
     * @throws \InvalidArgumentException
     */
    public static function assertTransition(?string $from, string $to): string
    {
        $toN = self::normalize($to);
        if (! self::canTransition($from, $toN)) {
            $fromN = self::normalize($from ?: 'new');
            throw new \InvalidArgumentException(
                "Illegal ride status transition from {$fromN} to {$toN}."
            );
        }

        return $toN;
    }
}
