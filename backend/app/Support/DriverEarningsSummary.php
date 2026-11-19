<?php

namespace App\Support;

use App\Models\Driver;
use App\Models\RideRequest;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Schema;

/** Driver pay week and history. Uses the same closeout ledger as admin payroll. */
class DriverEarningsSummary
{
    /** @return list<array<string, mixed>> */
    public static function history(Driver $driver): array
    {
        if (! Schema::hasTable('ride_requests')) {
            return [];
        }

        return RideRequest::query()
            ->where('assigned_driver_id', $driver->id)
            ->where('status', 'completed')
            ->orderByDesc('ride_date')
            ->orderByDesc('updated_at')
            ->limit(25)
            ->get()
            ->map(function (RideRequest $ride) {
                $row = RideCloseoutMath::ledgerRow($ride);
                $details = is_array($ride->details) ? $ride->details : [];
                $job = trim(implode(' · ', array_filter([
                    $ride->service_type,
                    $ride->driver_tier,
                ]))) ?: 'Completed ride';

                return [
                    'id' => (string) $ride->id,
                    'date' => $ride->ride_date
                        ? Carbon::parse($ride->ride_date)->format('D, M j')
                        : ($ride->updated_at?->format('D, M j') ?? ''),
                    'client' => $row['client_name'] ?? (trim(($ride->first_name ?? '').' '.($ride->last_name ?? '')) ?: 'Client'),
                    'reference' => $ride->reference,
                    'job' => $job,
                    'paid_by' => $row['method'] ?? ($details['payment_method'] ?? '—'),
                    'earned' => round((float) ($row['driver_pay'] ?? $details['driver_pay'] ?? 0) + (float) ($row['tip'] ?? $details['tip'] ?? 0), 2),
                ];
            })
            ->all();
    }

    /**
     * @param  list<array<string, mixed>>|null  $rideHistory
     * @return array<string, mixed>
     */
    public static function week(Driver $driver, ?array $rideHistory = null): array
    {
        $weekStart = now()->startOfWeek()->startOfDay();
        $weekEnd = $weekStart->copy()->endOfWeek();
        $earned = 0.0;
        $cashKept = 0.0;

        if (Schema::hasTable('ride_requests')) {
            $rides = RideRequest::query()
                ->where('assigned_driver_id', $driver->id)
                ->where('status', 'completed')
                ->where(function ($q) use ($weekStart, $weekEnd) {
                    $q->whereBetween('ride_date', [$weekStart->toDateString(), $weekEnd->toDateString()])
                        ->orWhereBetween('updated_at', [$weekStart, $weekEnd]);
                })
                ->get();

            foreach ($rides as $ride) {
                $row = RideCloseoutMath::ledgerRow($ride);
                if ($row === null) {
                    continue;
                }
                $earned += (float) $row['driver_pay'] + (float) $row['tip'];
                if (strcasecmp((string) $row['method'], 'Cash') === 0) {
                    $cashKept += (float) $row['client_paid'];
                }
            }
        }

        $earned = round($earned, 2);
        $cashKept = round($cashKept, 2);
        $net = round($earned - $cashKept, 2);
        $lifetime = collect($rideHistory ?? self::history($driver))->sum('earned');

        return [
            'earned_pay_tips' => $earned,
            'cash_kept' => $cashKept,
            'carried_earlier_weeks' => 0.0,
            'net_balance' => $net,
            'check_date' => null,
            'status_banner' => $net > 0
                ? ('Archer owes $'.number_format($net, 2).' this week')
                : 'No payroll balance this week',
            'lifetime_earnings' => round((float) $lifetime, 2),
        ];
    }
}
