<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\RideRequest;
use App\Support\ApiResponse;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Symfony\Component\HttpFoundation\StreamedResponse;

class RideReportController extends Controller
{
    private const ACCEPTED_STATUSES = [
        'accepted', 'dispatched', 'driver_assigned', 'on_my_way',
        'at_doorstep', 'ride_started', 'in_progress', 'ride_ended', 'close_out',
    ];

    private const SCHEDULED_STATUSES = [
        'new', 'pending', 'broadcast',
        'accepted', 'dispatched', 'driver_assigned', 'on_my_way',
        'at_doorstep', 'ride_started', 'in_progress', 'ride_ended', 'close_out',
    ];

    /**
     * GET /api/v1/admin/reports/rides
     */
    public function index(Request $request): JsonResponse
    {
        $baseQuery = $this->applyCommonFilters(RideRequest::query(), $request);

        $summary = [
            'total' => (clone $baseQuery)->count(),
            'accepted' => (clone $baseQuery)->whereIn('status', self::ACCEPTED_STATUSES)->count(),
            'scheduled' => (clone $baseQuery)->whereIn('status', self::SCHEDULED_STATUSES)
                ->where(function (Builder $q) {
                    $q->whereNotNull('scheduled_at')->orWhereNotNull('ride_date');
                })->count(),
            'completed' => (clone $baseQuery)->where('status', 'completed')->count(),
            'cancelled' => (clone $baseQuery)->where('status', 'cancelled')->count(),
        ];

        $filtered = $this->applyStatusCategory(clone $baseQuery, $request->query('status'));

        $rides = $filtered
            ->with(['assignedDriver:id,name,phone', 'statusHistories.changedBy:id,name'])
            ->orderByDesc('created_at')
            ->paginate($request->integer('per_page', 25));

        $rides->getCollection()->transform(fn (RideRequest $ride) => $this->formatRideReportRow($ride));

        return ApiResponse::data([
            'summary' => $summary,
            'rides' => $rides,
        ]);
    }

    /**
     * GET /api/v1/admin/reports/rides/export
     */
    public function export(Request $request): StreamedResponse
    {
        $query = $this->applyCommonFilters(RideRequest::query(), $request);
        $query = $this->applyStatusCategory($query, $request->query('status'));

        $rides = $query
            ->with(['assignedDriver:id,name', 'statusHistories'])
            ->orderByDesc('created_at')
            ->get();

        $filename = 'archer-ride-report-' . now()->format('Y-m-d-His') . '.csv';

        return response()->streamDownload(function () use ($rides) {
            $out = fopen('php://output', 'w');
            // UTF-8 BOM for clean Excel compatibility
            fwrite($out, "\xEF\xBB\xBF");

            fputcsv($out, [
                'Reference',
                'Status',
                'Service Type',
                'Tier',
                'Passenger Name',
                'Passenger Email',
                'Passenger Phone',
                'Assigned Chauffeur',
                'Pickup Location',
                'Dropoff Location',
                'Booked At',
                'Accepted At',
                'Scheduled Pickup',
                'Completed At',
                'Cancelled At',
                'Status History Trail',
            ]);

            foreach ($rides as $ride) {
                $trail = $ride->statusHistories
                    ->map(fn ($h) => ($h->from_status ? "{$h->from_status}->" : '') . "{$h->to_status}@" . ($h->created_at?->toIso8601String() ?? ''))
                    ->implode(' | ');

                $scheduled = $ride->scheduled_at
                    ? $ride->scheduled_at->toIso8601String()
                    : trim(($ride->ride_date ?? '') . ' ' . ($ride->ride_time ?? ''));

                fputcsv($out, [
                    $ride->reference,
                    $ride->status,
                    $ride->service_type ?: $ride->request_type,
                    $ride->driver_tier,
                    trim($ride->first_name . ' ' . ($ride->last_name ?? '')),
                    $ride->email,
                    $ride->phone,
                    $ride->assignedDriver?->name ?? 'Unassigned',
                    $ride->pickup_location,
                    $ride->dropoff_location,
                    $ride->created_at?->toIso8601String(),
                    $ride->accepted_at?->toIso8601String(),
                    $scheduled,
                    $ride->completed_at?->toIso8601String(),
                    $ride->cancelled_at?->toIso8601String(),
                    $trail,
                ]);
            }

            fclose($out);
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    private function applyCommonFilters(Builder $query, Request $request): Builder
    {
        $dateField = match ($request->query('date_field', 'booked')) {
            'accepted' => 'accepted_at',
            'scheduled' => 'scheduled_at',
            'completed' => 'completed_at',
            'cancelled' => 'cancelled_at',
            default => 'created_at',
        };

        if ($request->filled('date_from')) {
            try {
                $from = Carbon::parse($request->query('date_from'))->startOfDay();
                $query->where($dateField, '>=', $from);
            } catch (\Throwable) {
                // Ignore invalid date filter
            }
        }

        if ($request->filled('date_to')) {
            try {
                $to = Carbon::parse($request->query('date_to'))->endOfDay();
                $query->where($dateField, '<=', $to);
            } catch (\Throwable) {
                // Ignore invalid date filter
            }
        }

        if ($request->filled('driver_id')) {
            $query->where('assigned_driver_id', $request->query('driver_id'));
        }

        if ($request->filled('search')) {
            $s = trim((string) $request->query('search'));
            $query->where(function (Builder $q) use ($s) {
                $q->where('reference', 'like', "%{$s}%")
                    ->orWhere('first_name', 'like', "%{$s}%")
                    ->orWhere('last_name', 'like', "%{$s}%")
                    ->orWhere('email', 'like', "%{$s}%")
                    ->orWhere('phone', 'like', "%{$s}%")
                    ->orWhere('pickup_location', 'like', "%{$s}%")
                    ->orWhere('dropoff_location', 'like', "%{$s}%");
            });
        }

        return $query;
    }

    private function applyStatusCategory(Builder $query, ?string $status): Builder
    {
        if (! $status || $status === 'all') {
            return $query;
        }

        return match (strtolower($status)) {
            'accepted' => $query->whereIn('status', self::ACCEPTED_STATUSES),
            'scheduled' => $query->whereIn('status', self::SCHEDULED_STATUSES)
                ->where(function (Builder $q) {
                    $q->whereNotNull('scheduled_at')->orWhereNotNull('ride_date');
                }),
            'completed' => $query->where('status', 'completed'),
            'cancelled' => $query->where('status', 'cancelled'),
            default => $query->where('status', $status),
        };
    }

    private function formatRideReportRow(RideRequest $ride): array
    {
        return [
            'id' => $ride->id,
            'reference' => $ride->reference,
            'status' => $ride->status,
            'service_type' => $ride->service_type ?: $ride->request_type,
            'driver_tier' => $ride->driver_tier,
            'passenger_name' => trim($ride->first_name . ' ' . ($ride->last_name ?? '')),
            'email' => $ride->email,
            'phone' => $ride->phone,
            'pickup_location' => $ride->pickup_location,
            'dropoff_location' => $ride->dropoff_location,
            'ride_date' => $ride->ride_date,
            'ride_time' => $ride->ride_time,
            'assigned_driver' => $ride->assignedDriver ? [
                'id' => $ride->assignedDriver->id,
                'name' => $ride->assignedDriver->name,
                'phone' => $ride->assignedDriver->phone,
            ] : null,
            'booked_at' => $ride->created_at?->toIso8601String(),
            'accepted_at' => $ride->accepted_at?->toIso8601String(),
            'scheduled_at' => $ride->scheduled_at?->toIso8601String(),
            'completed_at' => $ride->completed_at?->toIso8601String(),
            'cancelled_at' => $ride->cancelled_at?->toIso8601String(),
            'cancellation_reason' => $ride->cancellation_reason,
            'status_histories' => $ride->statusHistories->map(fn ($h) => [
                'id' => $h->id,
                'from_status' => $h->from_status,
                'to_status' => $h->to_status,
                'changed_by' => $h->changedBy?->name ?? 'System',
                'notes' => $h->notes,
                'created_at' => $h->created_at?->toIso8601String(),
            ])->values()->all(),
        ];
    }
}
