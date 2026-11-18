<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Driver;
use App\Models\RideRequest;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class PaymentsEarningsController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $period = $request->query('period', 'this_week');
        $driverId = $request->query('driver');

        $drivers = Driver::orderBy('name')->get(['id', 'name']);

        // Prototype verified close-out transactions matching Screenshot 6
        $sampleLedger = [
            [
                'id' => 'trans-1',
                'date' => 'Tue, Nov 17',
                'ride_reference' => 'AR-1046',
                'client_name' => 'Priya Nair',
                'driver_id' => 'driver-1',
                'driver_name' => 'Paul Malesky',
                'method' => 'Card',
                'fare' => 840.00,
                'promo' => 0.00,
                'booking_fee' => 5.00,
                'tax' => 55.98,
                'tip' => 110.00,
                'client_paid' => 1010.98,
                'card_fee' => 35.53,
                'driver_pay' => 157.50,
                'archer_profit' => 441.97,
            ],
            [
                'id' => 'trans-2',
                'date' => 'Mon, Nov 16',
                'ride_reference' => 'AR-1045',
                'client_name' => 'Grant Whitfield',
                'driver_id' => 'driver-2',
                'driver_name' => 'Joseph Klein',
                'method' => 'Cash',
                'fare' => 155.00,
                'promo' => 0.00,
                'booking_fee' => 5.00,
                'tax' => 10.60,
                'tip' => 30.00,
                'client_paid' => 200.60,
                'card_fee' => 0.00,
                'driver_pay' => 75.00,
                'archer_profit' => 85.00,
            ],
        ];

        // Filter by driver if specified
        $filteredLedger = $sampleLedger;
        if (!empty($driverId) && $driverId !== 'all') {
            $filteredLedger = array_values(array_filter($sampleLedger, function ($item) use ($driverId) {
                return $item['driver_name'] === $driverId || $item['driver_id'] === $driverId;
            }));
        }

        // Totals calculation
        $totalFare = array_sum(array_column($filteredLedger, 'fare'));
        $totalPromo = array_sum(array_column($filteredLedger, 'promo'));
        $totalBookingFee = array_sum(array_column($filteredLedger, 'booking_fee'));
        $totalTax = array_sum(array_column($filteredLedger, 'tax'));
        $totalTip = array_sum(array_column($filteredLedger, 'tip'));
        $totalClientPaid = array_sum(array_column($filteredLedger, 'client_paid'));
        $totalCardFee = array_sum(array_column($filteredLedger, 'card_fee'));
        $totalDriverPay = array_sum(array_column($filteredLedger, 'driver_pay'));
        $totalArcherProfit = array_sum(array_column($filteredLedger, 'archer_profit'));
        $totalDriverPayPlusTips = $totalDriverPay + $totalTip;

        $kpis = [
            'collected' => $totalClientPaid,
            'driver_pay_tips' => $totalDriverPayPlusTips,
            'sales_tax' => $totalTax,
            'card_fees' => $totalCardFee,
            'archer_profit' => $totalArcherProfit,
        ];

        $totals = [
            'count' => count($filteredLedger),
            'fare' => $totalFare,
            'promo' => $totalPromo,
            'booking_fee' => $totalBookingFee,
            'tax' => $totalTax,
            'tip' => $totalTip,
            'client_paid' => $totalClientPaid,
            'card_fee' => $totalCardFee,
            'driver_pay' => $totalDriverPay,
            'archer_profit' => $totalArcherProfit,
        ];

        return ApiResponse::data([
            'period' => $period,
            'drivers' => $drivers,
            'kpis' => $kpis,
            'totals' => $totals,
            'ledger' => $filteredLedger,
        ]);
    }
}
