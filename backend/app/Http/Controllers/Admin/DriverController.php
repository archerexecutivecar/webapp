<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Driver;
use App\Models\RideRequest;
use App\Models\Role;
use App\Models\User;
use App\Support\ApiResponse;
use App\Support\RideCloseoutMath;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;

class DriverController extends Controller
{
    public function index(): JsonResponse
    {
        $drivers = Driver::with(['tier', 'user'])
            ->withCount(['rideRequests as active_rides_count' => function ($q) {
                $q->whereIn('status', ['dispatched', 'driver_assigned', 'in_progress']);
            }])
            ->orderBy('sort_order', 'asc')
            ->get()
            ->map(fn (Driver $d) => $this->formatDriverSummary($d));

        return ApiResponse::data(['drivers' => $drivers]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:50',
            'service_tier' => 'nullable|integer|exists:site_tiers,tier,kind,driver',
            'avatar_url' => 'nullable|string|max:255',
            'bio' => 'nullable|string',
            'sort_order' => 'nullable|integer',
            'is_active' => 'nullable|boolean',
            // Operating switches
            'is_fleet_operator' => 'nullable|boolean',
            'is_client_car_operator' => 'nullable|boolean',
            'is_owner_operator' => 'nullable|boolean',
            // Owner-operator vehicle
            'owner_vehicle_model' => 'nullable|string|max:255',
            'owner_vehicle_class' => 'nullable|string|max:100',
            'owner_vehicle_plate' => 'nullable|string|max:50',
            'owner_vehicle_reg_expires' => 'nullable|date',
            'owner_vehicle_ins_expires' => 'nullable|date',
            'owner_vehicle_inspected' => 'nullable|boolean',
            // Driver login account credentials
            'create_user_account' => 'nullable|boolean',
            'username' => 'nullable|string|max:255',
            'password' => 'nullable|string|min:6',
        ]);

        return DB::transaction(function () use ($validated, $request) {
            $userId = null;

            if (!empty($validated['create_user_account']) && !empty($validated['username']) && !empty($validated['password'])) {
                $userEmail = !empty($validated['email']) ? $validated['email'] : ($validated['username'] . '@archer.internal');

                $user = User::where('email', $userEmail)->first();
                if (!$user) {
                    $user = User::create([
                        'name' => $validated['name'],
                        'email' => $userEmail,
                        'password' => Hash::make($validated['password']),
                        'status' => 'active',
                    ]);

                    $driverRole = Role::firstOrCreate(
                        ['key' => 'driver'],
                        ['name' => 'Driver / Chauffeur']
                    );
                    $user->roles()->syncWithoutDetaching([$driverRole->id]);
                } else {
                    $user->update([
                        'password' => Hash::make($validated['password']),
                    ]);
                }

                $userId = $user->id;
            }

            $driverData = [
                'user_id' => $userId,
                'name' => $validated['name'],
                'email' => $validated['email'] ?? null,
                'phone' => $validated['phone'] ?? null,
                'avatar_url' => $validated['avatar_url'] ?? null,
                'bio' => $validated['bio'] ?? null,
                'sort_order' => $validated['sort_order'] ?? 0,
                'is_active' => $validated['is_active'] ?? true,
            ];

            // service_tier was added after the original drivers table; skip when schema is behind.
            if (Schema::hasColumn('drivers', 'service_tier')) {
                $driverData['service_tier'] = $validated['service_tier'] ?? null;
            }

            // Operating-mode columns (migration 2026_11_21_000001). Guard so a delayed
            // Hostinger migrate cannot turn roster create into a 500.
            if (Schema::hasColumn('drivers', 'is_fleet_operator')) {
                $driverData['is_fleet_operator'] = $validated['is_fleet_operator'] ?? true;
                $driverData['is_client_car_operator'] = $validated['is_client_car_operator'] ?? false;
                $driverData['is_owner_operator'] = $validated['is_owner_operator'] ?? false;
                $driverData['owner_vehicle_model'] = $validated['owner_vehicle_model'] ?? null;
                $driverData['owner_vehicle_class'] = $validated['owner_vehicle_class'] ?? null;
                $driverData['owner_vehicle_plate'] = $validated['owner_vehicle_plate'] ?? null;
                $driverData['owner_vehicle_reg_expires'] = $validated['owner_vehicle_reg_expires'] ?? null;
                $driverData['owner_vehicle_ins_expires'] = $validated['owner_vehicle_ins_expires'] ?? null;
                $driverData['owner_vehicle_inspected'] = (bool) ($validated['owner_vehicle_inspected'] ?? false);
                $driverData['compliance_credentials'] = null;
                $driverData['availability_schedule'] = $validated['availability_schedule'] ?? null;
            }

            $driver = Driver::create($driverData);

            AuditLog::record('driver.created', $request->user()?->getKey(), [
                'driver_id' => $driver->id,
                'name' => $driver->name,
            ], $this->auditSubject($driver));

            return ApiResponse::data(['driver' => $this->formatDriverDetail($driver->load(['tier', 'user']))], 201);
        });
    }

    public function show(string $id): JsonResponse
    {
        $driver = Driver::with(['tier', 'user'])->findOrFail($id);
        return ApiResponse::data(['driver' => $this->formatDriverDetail($driver)]);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $driver = Driver::findOrFail($id);
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:50',
            'service_tier' => 'nullable|integer|exists:site_tiers,tier,kind,driver',
            'avatar_url' => 'nullable|string|max:255',
            'bio' => 'nullable|string',
            'sort_order' => 'nullable|integer',
            'is_active' => 'nullable|boolean',
            'password' => 'nullable|string|min:6',
            // Operating switches
            'is_fleet_operator' => 'nullable|boolean',
            'is_client_car_operator' => 'nullable|boolean',
            'is_owner_operator' => 'nullable|boolean',
            // Owner-operator vehicle
            'owner_vehicle_model' => 'nullable|string|max:255',
            'owner_vehicle_class' => 'nullable|string|max:100',
            'owner_vehicle_plate' => 'nullable|string|max:50',
            'owner_vehicle_reg_expires' => 'nullable|date',
            'owner_vehicle_ins_expires' => 'nullable|date',
            'owner_vehicle_inspected' => 'nullable|boolean',
            'compliance_credentials' => 'nullable|array',
            'availability_schedule' => 'nullable|string|max:255',
        ]);

        return DB::transaction(function () use ($driver, $validated, $request) {
            if (!empty($validated['password'])) {
                if ($driver->user) {
                    $driver->user->update([
                        'password' => Hash::make($validated['password']),
                    ]);
                } else {
                    $userEmail = !empty($validated['email']) ? $validated['email'] : ($driver->email ?: 'driver_' . substr($driver->id, 0, 6) . '@archer.internal');
                    $user = User::create([
                        'name' => $validated['name'] ?? $driver->name,
                        'email' => $userEmail,
                        'password' => Hash::make($validated['password']),
                        'status' => 'active',
                    ]);
                    $driverRole = Role::firstOrCreate(
                        ['key' => 'driver'],
                        ['name' => 'Driver / Chauffeur']
                    );
                    $user->roles()->syncWithoutDetaching([$driverRole->id]);
                    $driver->user_id = $user->id;
                }
            }

            $updates = [
                'name' => $validated['name'] ?? $driver->name,
                'email' => array_key_exists('email', $validated) ? $validated['email'] : $driver->email,
                'phone' => array_key_exists('phone', $validated) ? $validated['phone'] : $driver->phone,
                'avatar_url' => array_key_exists('avatar_url', $validated) ? $validated['avatar_url'] : $driver->avatar_url,
                'bio' => array_key_exists('bio', $validated) ? $validated['bio'] : $driver->bio,
                'sort_order' => array_key_exists('sort_order', $validated) ? $validated['sort_order'] : $driver->sort_order,
                'is_active' => array_key_exists('is_active', $validated) ? $validated['is_active'] : $driver->is_active,
            ];

            if (Schema::hasColumn('drivers', 'service_tier')) {
                $updates['service_tier'] = array_key_exists('service_tier', $validated) ? $validated['service_tier'] : $driver->service_tier;
            }

            if (Schema::hasColumn('drivers', 'is_fleet_operator')) {
                $updates['is_fleet_operator'] = array_key_exists('is_fleet_operator', $validated) ? $validated['is_fleet_operator'] : $driver->is_fleet_operator;
                $updates['is_client_car_operator'] = array_key_exists('is_client_car_operator', $validated) ? $validated['is_client_car_operator'] : $driver->is_client_car_operator;
                $updates['is_owner_operator'] = array_key_exists('is_owner_operator', $validated) ? $validated['is_owner_operator'] : $driver->is_owner_operator;
                $updates['owner_vehicle_model'] = array_key_exists('owner_vehicle_model', $validated) ? $validated['owner_vehicle_model'] : $driver->owner_vehicle_model;
                $updates['owner_vehicle_class'] = array_key_exists('owner_vehicle_class', $validated) ? $validated['owner_vehicle_class'] : $driver->owner_vehicle_class;
                $updates['owner_vehicle_plate'] = array_key_exists('owner_vehicle_plate', $validated) ? $validated['owner_vehicle_plate'] : $driver->owner_vehicle_plate;
                $updates['owner_vehicle_reg_expires'] = array_key_exists('owner_vehicle_reg_expires', $validated) ? $validated['owner_vehicle_reg_expires'] : $driver->owner_vehicle_reg_expires;
                $updates['owner_vehicle_ins_expires'] = array_key_exists('owner_vehicle_ins_expires', $validated) ? $validated['owner_vehicle_ins_expires'] : $driver->owner_vehicle_ins_expires;
                $updates['owner_vehicle_inspected'] = array_key_exists('owner_vehicle_inspected', $validated) ? $validated['owner_vehicle_inspected'] : $driver->owner_vehicle_inspected;
                $updates['compliance_credentials'] = array_key_exists('compliance_credentials', $validated) ? $validated['compliance_credentials'] : $driver->compliance_credentials;
                $updates['availability_schedule'] = array_key_exists('availability_schedule', $validated) ? $validated['availability_schedule'] : $driver->availability_schedule;
            }

            $driver->update(array_filter($updates, fn ($v) => $v !== null));

            AuditLog::record('driver.updated', $request->user()?->getKey(), [
                'driver_id' => $driver->id,
                'is_active' => $driver->is_active,
                'is_owner_operator' => $driver->is_owner_operator,
            ], $this->auditSubject($driver));

            return ApiResponse::data(['driver' => $this->formatDriverDetail($driver->fresh(['tier', 'user']))]);
        });
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $driver = Driver::findOrFail($id);
        $driverName = $driver->name;
        $driver->delete();

        AuditLog::record('driver.deleted', $request->user()?->getKey(), [
            'driver_id' => $id,
            'name' => $driverName,
        ], null);

        return ApiResponse::data(['message' => 'Driver removed from roster successfully']);
    }

    /**
     * UUID primary keys cannot be stored in a legacy bigint audit_logs.subject_id.
     * Prefer attaching the model when the column can hold a string; otherwise metadata alone is enough.
     */
    private function auditSubject(Driver $driver): ?Driver
    {
        if (! Schema::hasTable('audit_logs') || ! Schema::hasColumn('audit_logs', 'subject_id')) {
            return null;
        }

        $type = strtolower((string) Schema::getColumnType('audit_logs', 'subject_id'));

        return in_array($type, ['string', 'varchar', 'text', 'char', 'guid', 'uuid'], true)
            ? $driver
            : null;
    }

    private function formatDriverSummary(Driver $d): array
    {
        $pay = $this->payWeekForDriver($d);

        return [
            'id' => $d->id,
            'name' => $d->name,
            'email' => $d->email,
            'phone' => $d->phone,
            'service_tier' => $d->service_tier,
            'tier' => $d->tier ? ['tier' => $d->tier->tier, 'name' => $d->tier->label] : null,
            'avatar_url' => $d->avatar_url,
            'bio' => $d->bio,
            'is_active' => (bool) $d->is_active,
            'is_fleet_operator' => (bool) ($d->is_fleet_operator ?? true),
            'is_client_car_operator' => (bool) ($d->is_client_car_operator ?? false),
            'is_owner_operator' => (bool) ($d->is_owner_operator ?? false),
            'weekly_balance' => $pay['net_balance'],
            'active_rides_count' => (int) ($d->active_rides_count ?? 0),
        ];
    }

    private function formatDriverDetail(Driver $d): array
    {
        $regExpires = $d->owner_vehicle_reg_expires
            ? Carbon::parse($d->owner_vehicle_reg_expires)->format('Y-m-d')
            : null;
        $insExpires = $d->owner_vehicle_ins_expires
            ? Carbon::parse($d->owner_vehicle_ins_expires)->format('Y-m-d')
            : null;

        $activeRide = $this->activeRideForDriver($d);
        $rideHistory = $this->rideHistoryForDriver($d);
        $payWeek = $this->payWeekForDriver($d, $rideHistory);

        $modes = [];
        if ($d->is_fleet_operator ?? true) {
            $modes[] = 'fleet';
        }
        if ($d->is_client_car_operator ?? false) {
            $modes[] = 'client-car';
        }
        if ($d->is_owner_operator ?? false) {
            $modes[] = 'owner-operator';
        }
        $status = ($d->is_active ? 'Active' : 'Inactive');
        $employmentType = $modes === []
            ? $status
            : ('Archer chauffeur · ' . implode(' · ', $modes) . ' · ' . $status);

        return [
            'id' => $d->id,
            'name' => $d->name,
            'email' => $d->email,
            'phone' => $d->phone,
            'service_tier' => $d->service_tier,
            'tier' => $d->tier ? ['tier' => $d->tier->tier, 'name' => $d->tier->label] : null,
            'avatar_url' => $d->avatar_url,
            'bio' => $d->bio,
            'is_active' => (bool) $d->is_active,
            'employment_type' => $employmentType,
            'is_fleet_operator' => (bool) ($d->is_fleet_operator ?? true),
            'is_client_car_operator' => (bool) ($d->is_client_car_operator ?? false),
            'is_owner_operator' => (bool) ($d->is_owner_operator ?? false),
            'owner_vehicle_model' => $d->owner_vehicle_model,
            'owner_vehicle_class' => $d->owner_vehicle_class,
            'owner_vehicle_plate' => $d->owner_vehicle_plate,
            'owner_vehicle_reg_expires' => $regExpires,
            'owner_vehicle_ins_expires' => $insExpires,
            'owner_vehicle_inspected' => (bool) ($d->owner_vehicle_inspected ?? false),
            'compliance_credentials' => $this->formatComplianceCredentials($d->compliance_credentials),
            'availability_schedule' => $d->availability_schedule,
            'claimed_shifts' => null,
            'active_ride' => $activeRide,
            'ride_history' => $rideHistory,
            'pay_week' => $payWeek,
        ];
    }

    /** @return array<string, mixed>|null */
    private function activeRideForDriver(Driver $d): ?array
    {
        if (! Schema::hasTable('ride_requests')) {
            return null;
        }

        $ride = RideRequest::query()
            ->where('assigned_driver_id', $d->id)
            ->whereIn('status', ['dispatched', 'driver_assigned', 'in_progress'])
            ->orderByDesc('ride_date')
            ->orderByDesc('created_at')
            ->first();

        if (! $ride) {
            return null;
        }

        $details = is_array($ride->details) ? $ride->details : [];
        $clientName = trim(($ride->first_name ?? '') . ' ' . ($ride->last_name ?? '')) ?: 'Client';
        $dateLabel = $ride->ride_date
            ? Carbon::parse($ride->ride_date . ' ' . ($ride->ride_time ?: '00:00'))->format('D, M j, g:i A')
            : ($ride->created_at?->format('D, M j, g:i A') ?? '');

        return [
            'id' => (string) $ride->id,
            'reference' => $ride->reference,
            'client_name' => $clientName,
            'client_phone' => $ride->phone,
            'date_time_label' => $dateLabel,
            'tier_label' => $ride->driver_tier ?: ($details['tier_label'] ?? null),
            'status_label' => str_replace('_', ' ', ucfirst((string) $ride->status)),
            'pickup_address' => $ride->pickup_location,
            'dropoff_address' => $ride->dropoff_location,
            'service_description' => $ride->service_type ?: ($details['service_description'] ?? null),
            'archer_vehicle' => $ride->vehicle ?: ($details['vehicle'] ?? null),
            'route_note' => $details['route_note'] ?? $ride->dispatch_notes,
        ];
    }

    /** @return list<array<string, mixed>> */
    private function rideHistoryForDriver(Driver $d): array
    {
        if (! Schema::hasTable('ride_requests')) {
            return [];
        }

        return RideRequest::query()
            ->where('assigned_driver_id', $d->id)
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
                    'client' => $row['client_name'] ?? (trim(($ride->first_name ?? '') . ' ' . ($ride->last_name ?? '')) ?: 'Client'),
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
    private function payWeekForDriver(Driver $d, ?array $rideHistory = null): array
    {
        $weekStart = now()->startOfWeek()->startOfDay();
        $weekEnd = $weekStart->copy()->endOfWeek();
        $earned = 0.0;
        $cashKept = 0.0;

        if (Schema::hasTable('ride_requests')) {
            $rides = RideRequest::query()
                ->where('assigned_driver_id', $d->id)
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
        $lifetime = collect($rideHistory ?? $this->rideHistoryForDriver($d))->sum('earned');

        return [
            'earned_pay_tips' => $earned,
            'cash_kept' => $cashKept,
            'carried_earlier_weeks' => 0.0,
            'net_balance' => $net,
            'check_date' => null,
            'status_banner' => $net > 0
                ? ('Archer owes $' . number_format($net, 2) . ' this week')
                : 'No payroll balance this week',
            'lifetime_earnings' => round((float) $lifetime, 2),
        ];
    }

    /** @param  array<string, mixed>|null  $credentials */
    private function formatComplianceCredentials(?array $credentials): ?array
    {
        if ($credentials === null || $credentials === []) {
            return null;
        }

        $out = [];
        foreach ($credentials as $key => $value) {
            if (! is_array($value)) {
                continue;
            }
            $status = (string) ($value['status'] ?? 'unknown');
            $label = $value['label'] ?? null;
            if ($label === null && isset($value['days_remaining'])) {
                $days = (int) $value['days_remaining'];
                $label = $status === 'renewal_due'
                    ? ('Renewal due · ' . $days . ' days')
                    : (ucfirst(str_replace('_', ' ', $status)) . ' · ' . $days . ' days');
            }
            $out[$key] = [
                'status' => $status,
                'label' => $label ?? ucfirst(str_replace('_', ' ', $status)),
            ];
        }

        return $out === [] ? null : $out;
    }
}
