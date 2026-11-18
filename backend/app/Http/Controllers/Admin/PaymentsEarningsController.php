<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Driver;
use App\Models\PricingSetting;
use App\Models\RideRequest;
use App\Support\ApiResponse;
use App\Support\RideCloseoutMath;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Schema;

class PaymentsEarningsController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $period = $request->query('period', 'this_week');
        $driverId = $request->query('driver');

        $drivers = Driver::orderBy('name')->get(['id', 'name']);

        $ledger = [];
        $pricing = PricingSetting::query()->where('service', 'hourly')->where('is_active', true)->first();

        if (Schema::hasTable('ride_requests')) {
            $ridesQuery = RideRequest::with('assignedDriver')
                ->where('status', 'completed')
                ->orderByDesc('updated_at');

            if ($period === 'this_week') {
                $start = Carbon::now()->startOfWeek();
                $end = Carbon::now()->endOfWeek();
                $ridesQuery->where(function ($q) use ($start, $end) {
                    $q->whereBetween('ride_date', [$start->toDateString(), $end->toDateString()])
                        ->orWhereBetween('updated_at', [$start, $end]);
                });
            }

            foreach ($ridesQuery->get() as $ride) {
                $row = RideCloseoutMath::ledgerRow($ride, $pricing);
                if ($row !== null) {
                    $ledger[] = $row;
                }
            }
        }

        if (! empty($driverId) && $driverId !== 'all') {
            $ledger = array_values(array_filter($ledger, function ($item) use ($driverId) {
                return $item['driver_id'] === (string) $driverId
                    || $item['driver_name'] === $driverId;
            }));
        }

        $totalFare = array_sum(array_column($ledger, 'fare'));
        $totalPromo = array_sum(array_column($ledger, 'promo'));
        $totalBookingFee = array_sum(array_column($ledger, 'booking_fee'));
        $totalTax = array_sum(array_column($ledger, 'tax'));
        $totalTip = array_sum(array_column($ledger, 'tip'));
        $totalClientPaid = array_sum(array_column($ledger, 'client_paid'));
        $totalCardFee = array_sum(array_column($ledger, 'card_fee'));
        $totalDriverPay = array_sum(array_column($ledger, 'driver_pay'));
        $totalArcherProfit = array_sum(array_column($ledger, 'archer_profit'));
        $totalDriverPayPlusTips = $totalDriverPay + $totalTip;

        return ApiResponse::data([
            'period' => $period,
            'drivers' => $drivers,
            'kpis' => [
                'collected' => round($totalClientPaid, 2),
                'driver_pay_tips' => round($totalDriverPayPlusTips, 2),
                'sales_tax' => round($totalTax, 2),
                'card_fees' => round($totalCardFee, 2),
                'archer_profit' => round($totalArcherProfit, 2),
            ],
            'totals' => [
                'count' => count($ledger),
                'fare' => round($totalFare, 2),
                'promo' => round($totalPromo, 2),
                'booking_fee' => round($totalBookingFee, 2),
                'tax' => round($totalTax, 2),
                'tip' => round($totalTip, 2),
                'client_paid' => round($totalClientPaid, 2),
                'card_fee' => round($totalCardFee, 2),
                'driver_pay' => round($totalDriverPay, 2),
                'archer_profit' => round($totalArcherProfit, 2),
            ],
            'ledger' => $ledger,
        ]);
    }
}