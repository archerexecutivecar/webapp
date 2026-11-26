<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Driver;
use App\Models\PayrollDisbursement;
use App\Models\RideRequest;
use App\Support\ApiResponse;
use App\Support\RideCloseoutMath;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PayrollController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $weekStart = Carbon::parse($request->query('week', now()->startOfWeek()->toDateString()))->startOfDay();
        $weekEnd = $weekStart->copy()->endOfWeek();

        $disbursements = collect();
        if (Schema::hasTable('payroll_disbursements')) {
            try {
                $disbursements = PayrollDisbursement::where('pay_week_start', $weekStart->toDateString())->get()->keyBy('driver_id');
            } catch (\Throwable) {
                $disbursements = collect();
            }
        }

        $driversOut = [];
        $totalPayoutReady = 0.0;
        $totalCashKept = 0.0;
        $totalCarriedForward = 0.0;
        $readyCount = 0;

        $activeDrivers = Driver::with('tier')->where('is_active', true)->orderBy('name')->get();

        $ridesByDriver = collect();
        if (Schema::hasTable('ride_requests')) {
            $ridesByDriver = RideRequest::with('assignedDriver')
                ->where('status', 'completed')
                ->where(function ($q) use ($weekStart, $weekEnd) {
                    $q->whereBetween('ride_date', [$weekStart->toDateString(), $weekEnd->toDateString()])
                        ->orWhereBetween('updated_at', [$weekStart, $weekEnd]);
                })
                ->get()
                ->groupBy('assigned_driver_id');
        }

        foreach ($activeDrivers as $driver) {
            $rides = $ridesByDriver->get($driver->id, collect());
            $lineItems = [];
            $fleetPayTotal = 0.0;
            $tipsTotal = 0.0;
            $cashDeductions = 0.0;
            $grossEarnings = 0.0;

            foreach ($rides as $ride) {
                $row = RideCloseoutMath::ledgerRow($ride);
                if ($row === null) {
                    continue;
                }

                $hours = (float) ($ride->details['hours'] ?? $ride->details['billable_hours'] ?? 0);
                $rate = (float) ($ride->details['hourly_rate'] ?? $ride->details['tier_rate'] ?? ($hours > 0 ? $row['driver_pay'] / $hours : $row['driver_pay']));
                $fleetPay = $row['driver_pay'];
                $tip = $row['tip'];
                $method = $row['method'];
                $cashCollected = strcasecmp($method, 'Cash') === 0 ? $row['client_paid'] : 0.0;

                $lineTotal = round($fleetPay + $tip, 2);
                $fleetPayTotal += $fleetPay;
                $tipsTotal += $tip;
                $grossEarnings += $lineTotal;
                if ($cashCollected > 0) {
                    $cashDeductions += $cashCollected;
                }

                $lineItems[] = [
                    'ride_id' => (string) $ride->id,
                    'ride_reference' => $ride->reference,
                    'driver_id' => (string) $driver->id,
                    'client_name' => $row['client_name'],
                    'date' => $row['date'],
                    'hours' => $hours > 0 ? $hours : null,
                    'rate' => round($rate, 2),
                    'fleet_pay' => $fleetPay,
                    'tip' => $tip,
                    'total' => $lineTotal,
                    'method' => $method,
                    'cash_collected' => round($cashCollected, 2),
                ];
            }

            $netAmount = round($grossEarnings - $cashDeductions, 2);
            $disbursed = $disbursements->get($driver->id);

            if ($disbursed) {
                $paymentStatus = 'paid';
                $payoutLabel = 'Paid on ' . $disbursed->disbursed_at?->format('M d');
                $payoutSubtext = 'Ref: ' . $disbursed->reference_number;
            } elseif ($netAmount > 0) {
                $paymentStatus = 'ready';
                $payoutLabel = 'Archer owes ' . $driver->name . ' $' . number_format($netAmount, 2);
                $payoutSubtext = 'Check / ACH ready';
                $totalPayoutReady += $netAmount;
                $readyCount++;
            } elseif ($netAmount < 0) {
                $paymentStatus = 'carried_forward';
                $payoutLabel = 'Driver owes Archer $' . number_format(abs($netAmount), 2);
                $payoutSubtext = 'Carried forward to next pay week (cash kept exceeds pay)';
                $totalCarriedForward += $netAmount;
            } else {
                $paymentStatus = 'zero';
                $payoutLabel = $rides->isEmpty() ? 'No active trips this week' : 'Zero balance';
                $payoutSubtext = 'Zero balance';
            }

            if ($cashDeductions > 0) {
                $totalCashKept += $cashDeductions;
            }

            $driversOut[] = [
                'id' => $driver->id,
                'name' => $driver->name,
                'phone' => $driver->phone,
                'tier' => $driver->tier?->name,
                'tier_rate' => $lineItems[0]['rate'] ?? null,
                'status' => $driver->is_active ? 'Active' : 'Inactive',
                'rides' => $lineItems,
                'gross_earnings' => round($grossEarnings, 2),
                'fleet_pay_total' => round($fleetPayTotal, 2),
                'tips_total' => round($tipsTotal, 2),
                'cash_deductions' => round($cashDeductions, 2),
                'carried_balance' => 0.00,
                'net_amount' => $netAmount,
                'payment_status' => $paymentStatus,
                'disbursement' => $disbursed,
                'payout_label' => $payoutLabel,
                'payout_subtext' => $payoutSubtext,
            ];
        }

        return ApiResponse::data([
            'pay_week' => [
                'start' => $weekStart->toDateString(),
                'end' => $weekEnd->toDateString(),
                'disbursement_date' => $weekEnd->copy()->addDays(5)->toDateString(),
                'label' => $weekStart->format('M j') . ' – ' . $weekEnd->format('M j, Y'),
            ],
            'kpis' => [
                'total_payout_ready' => round($totalPayoutReady, 2),
                'total_cash_kept' => round($totalCashKept, 2),
                'total_carried_forward' => round($totalCarriedForward, 2),
                'ready_count' => $readyCount,
            ],
            'drivers' => $driversOut,
        ]);
    }

    public function recordDisbursement(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'driver_id' => 'required',
            'pay_week_start' => 'required|date',
            'pay_week_end' => 'required|date|after_or_equal:pay_week_start',
            'payment_method' => 'required|string|in:check,ach',
            'reference_number' => 'required|string|max:100',
            'notes' => 'nullable|string|max:500',
        ]);

        $driver = Driver::find($validated['driver_id']);
        if (! $driver) {
            return ApiResponse::error('DRIVER_NOT_FOUND', 'Driver not found.', 422);
        }

        $weekStart = Carbon::parse($validated['pay_week_start'])->startOfDay();
        $weekEnd = Carbon::parse($validated['pay_week_end'])->endOfDay();
        $rides = Schema::hasTable('ride_requests')
            ? RideRequest::with('assignedDriver')
                ->where('assigned_driver_id', $driver->id)
                ->where('status', 'completed')
                ->where(function ($q) use ($weekStart, $weekEnd) {
                    $q->whereBetween('ride_date', [$weekStart->toDateString(), $weekEnd->toDateString()])
                        ->orWhereBetween('updated_at', [$weekStart, $weekEnd]);
                })
                ->get()
            : collect();

        $summary = $this->summarizeDriverRides($driver, $rides);
        if ($summary['net_amount'] <= 0) {
            return ApiResponse::error('NO_PAYOUT_DUE', 'Driver has no positive net payout due for this pay week.', 422);
        }

        $disbursement = DB::transaction(function () use ($driver, $weekStart, $weekEnd, $summary, $validated, $request): PayrollDisbursement {
            return PayrollDisbursement::updateOrCreate(
                [
                    'driver_id' => $driver->id,
                    'pay_week_start' => $weekStart->toDateString(),
                ],
                [
                    'pay_week_end' => $weekEnd->toDateString(),
                    'gross_earnings' => $summary['gross_earnings'],
                    'cash_deductions' => $summary['cash_deductions'],
                    'carried_balance' => 0,
                    'net_amount' => $summary['net_amount'],
                    'payment_method' => $validated['payment_method'],
                    'reference_number' => $validated['reference_number'],
                    'disbursed_at' => now(),
                    'notes' => $validated['notes'] ?? null,
                    'created_by' => $request->user()?->id,
                ]
            );
        });

        AuditLog::record(
            'payroll.disbursed',
            $request->user()?->id,
            [
                'driver_id' => $driver->id,
                'driver_name' => $driver->name,
                'amount' => $summary['net_amount'],
                'method' => $validated['payment_method'],
                'reference' => $validated['reference_number'],
            ],
            $disbursement
        );

        return ApiResponse::data([
            'message' => 'Disbursement recorded successfully.',
            'disbursement' => $disbursement,
        ]);
    }

    /**
     * @param  Collection<int, RideRequest>  $rides
     * @return array{gross_earnings: float, cash_deductions: float, net_amount: float}
     */
    private function summarizeDriverRides(Driver $driver, Collection $rides): array
    {
        $grossEarnings = 0.0;
        $cashDeductions = 0.0;

        foreach ($rides as $ride) {
            $row = RideCloseoutMath::ledgerRow($ride);
            if ($row === null) {
                continue;
            }
            $grossEarnings += round($row['driver_pay'] + $row['tip'], 2);
            if (strcasecmp($row['method'], 'Cash') === 0) {
                $cashDeductions += $row['client_paid'];
            }
        }

        $grossEarnings = round($grossEarnings, 2);
        $cashDeductions = round($cashDeductions, 2);

        return [
            'gross_earnings' => $grossEarnings,
            'cash_deductions' => $cashDeductions,
            'net_amount' => round($grossEarnings - $cashDeductions, 2),
        ];
    }

    public function export(Request $request): StreamedResponse
    {
        $weekStart = Carbon::parse($request->query('week', now()->startOfWeek()->toDateString()))->startOfDay();
        $payload = $this->index($request)->getData(true)['data'];
        $drivers = $payload['drivers'] ?? [];

        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="archer_payroll_' . $weekStart->toDateString() . '.csv"',
        ];

        return response()->stream(function () use ($drivers) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, ['Driver Name', 'Tier', 'Fleet Pay', 'Tips', 'Gross Pay', 'Cash Kept', 'Net Amount', 'Status']);
            foreach ($drivers as $driver) {
                fputcsv($handle, [
                    $driver['name'],
                    $driver['tier'] ?? '',
                    number_format($driver['fleet_pay_total'], 2, '.', ''),
                    number_format($driver['tips_total'], 2, '.', ''),
                    number_format($driver['gross_earnings'], 2, '.', ''),
                    number_format($driver['cash_deductions'], 2, '.', ''),
                    number_format($driver['net_amount'], 2, '.', ''),
                    $driver['payment_status'],
                ]);
            }
            fclose($handle);
        }, 200, $headers);
    }
}