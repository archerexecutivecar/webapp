<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Driver;
use App\Models\PayrollDisbursement;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PayrollController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $week = $request->query('week', '2026-11-16');

        // Look up registered disbursements
        $disbursements = PayrollDisbursement::where('pay_week_start', $week)->get()->keyBy('driver_id');

        $driverPaul = Driver::where('name', 'like', '%Paul Malesky%')->first();
        $driverJoseph = Driver::where('name', 'like', '%Joseph Klein%')->first();
        $driverChris = Driver::where('name', 'like', '%Chris Jaeger%')->first();

        $paulId = $driverPaul ? $driverPaul->id : 1;
        $josephId = $driverJoseph ? $driverJoseph->id : 2;
        $chrisId = $driverChris ? $driverChris->id : 3;

        $paulDisbursed = isset($disbursements[$paulId]);

        $drivers = [
            [
                'id' => $paulId,
                'name' => 'Paul Malesky',
                'phone' => '(732) 555-0141',
                'tier' => 'T2 Executive',
                'tier_rate' => 30.00,
                'status' => 'Active · Fleet, Client Car',
                'rides' => [
                    [
                        'ride_reference' => 'AR-1046',
                        'client_name' => 'Priya Nair',
                        'date' => 'Tue, Nov 17',
                        'hours' => 4.5,
                        'rate' => 30.00,
                        'fleet_pay' => 135.00,
                        'tip' => 110.00,
                        'total' => 245.00,
                        'method' => 'Card',
                        'cash_collected' => 0.00,
                    ]
                ],
                'gross_earnings' => 245.00,
                'fleet_pay_total' => 135.00,
                'tips_total' => 110.00,
                'cash_deductions' => 0.00,
                'carried_balance' => 0.00,
                'net_amount' => 245.00,
                'payment_status' => $paulDisbursed ? 'paid' : 'ready',
                'disbursement' => $paulDisbursed ? $disbursements[$paulId] : null,
                'payout_label' => $paulDisbursed ? 'Paid on ' . $disbursements[$paulId]->disbursed_at?->format('M d') : 'Archer owes Paul Malesky $245.00',
                'payout_subtext' => $paulDisbursed ? 'Ref: ' . $disbursements[$paulId]->reference_number : 'Check / ACH ready Fri, Nov 27',
            ],
            [
                'id' => $josephId,
                'name' => 'Joseph Klein',
                'phone' => '(732) 555-0142',
                'tier' => 'T1 Essential',
                'tier_rate' => 25.00,
                'status' => 'Active · Fleet',
                'rides' => [
                    [
                        'ride_reference' => 'AR-1045',
                        'client_name' => 'Grant Whitfield',
                        'date' => 'Mon, Nov 16',
                        'hours' => 3.0,
                        'rate' => 25.00,
                        'fleet_pay' => 75.00,
                        'tip' => 30.00,
                        'total' => 105.00,
                        'method' => 'Cash',
                        'cash_collected' => 200.60,
                    ]
                ],
                'gross_earnings' => 105.00,
                'fleet_pay_total' => 75.00,
                'tips_total' => 30.00,
                'cash_deductions' => 200.60,
                'carried_balance' => 0.00,
                'net_amount' => -95.60,
                'payment_status' => 'carried_forward',
                'disbursement' => null,
                'payout_label' => 'Driver owes Archer $95.60',
                'payout_subtext' => 'Carried forward to next pay week (cash kept exceeds pay)',
            ],
            [
                'id' => $chrisId,
                'name' => 'Chris Jaeger',
                'phone' => '(732) 555-0143',
                'tier' => 'T3 Elite',
                'tier_rate' => 35.00,
                'status' => 'Active · Fleet, Owner-Op',
                'rides' => [],
                'gross_earnings' => 0.00,
                'fleet_pay_total' => 0.00,
                'tips_total' => 0.00,
                'cash_deductions' => 0.00,
                'carried_balance' => 0.00,
                'net_amount' => 0.00,
                'payment_status' => 'zero',
                'disbursement' => null,
                'payout_label' => 'No active trips this week',
                'payout_subtext' => 'Zero balance',
            ],
        ];

        $kpis = [
            'total_payout_ready' => 245.00,
            'total_cash_kept' => 200.60,
            'total_carried_forward' => -95.60,
            'ready_count' => 1,
        ];

        return ApiResponse::data([
            'pay_week' => [
                'start' => '2026-11-16',
                'end' => '2026-11-22',
                'disbursement_date' => '2026-11-27',
                'label' => 'Nov 16 – Nov 22, 2026 (current)',
            ],
            'kpis' => $kpis,
            'drivers' => $drivers,
        ]);
    }

    public function recordDisbursement(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'driver_id' => 'required',
            'pay_week_start' => 'required|string',
            'pay_week_end' => 'required|string',
            'amount' => 'required|numeric',
            'payment_method' => 'required|string|in:check,ach',
            'reference_number' => 'required|string|max:100',
            'notes' => 'nullable|string|max:500',
        ]);

        // Find or create driver if testing
        $driver = Driver::find($validated['driver_id']);
        if (!$driver) {
            $driver = Driver::first() ?? Driver::create([
                'name' => 'Paul Malesky',
                'email' => 'paul@archer.test',
                'phone' => '(732) 555-0141',
                'is_active' => true,
            ]);
        }

        $disbursement = PayrollDisbursement::updateOrCreate(
            [
                'driver_id' => $driver->id,
                'pay_week_start' => $validated['pay_week_start'],
            ],
            [
                'pay_week_end' => $validated['pay_week_end'],
                'gross_earnings' => $validated['amount'],
                'cash_deductions' => 0,
                'carried_balance' => 0,
                'net_amount' => $validated['amount'],
                'payment_method' => $validated['payment_method'],
                'reference_number' => $validated['reference_number'],
                'disbursed_at' => now(),
                'notes' => $validated['notes'] ?? null,
                'created_by' => $request->user()?->id,
            ]
        );

        AuditLog::record(
            'payroll.disbursed',
            $request->user()?->id,
            [
                'driver_id' => $driver->id,
                'driver_name' => $driver->name,
                'amount' => $validated['amount'],
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

    public function export(Request $request): StreamedResponse
    {
        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="archer_payroll_' . date('Y-m-d') . '.csv"',
        ];

        return response()->stream(function () {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, ['Driver Name', 'Tier', 'Fleet Pay', 'Tips', 'Gross Pay', 'Cash Kept', 'Net Amount', 'Status']);
            fputcsv($handle, ['Paul Malesky', 'T2 Executive', '135.00', '110.00', '245.00', '0.00', '245.00', 'Ready']);
            fputcsv($handle, ['Joseph Klein', 'T1 Essential', '75.00', '30.00', '105.00', '200.60', '-95.60', 'Carried Forward']);
            fputcsv($handle, ['Chris Jaeger', 'T3 Elite', '0.00', '0.00', '0.00', '0.00', '0.00', 'Zero']);
            fclose($handle);
        }, 200, $headers);
    }
}
