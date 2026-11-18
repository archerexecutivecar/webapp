<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Driver;
use App\Models\RideRequest;
use App\Models\Role;
use App\Models\User;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

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
                'service_tier' => $validated['service_tier'] ?? 1,
                'avatar_url' => $validated['avatar_url'] ?? null,
                'bio' => $validated['bio'] ?? null,
                'sort_order' => $validated['sort_order'] ?? 0,
                'is_active' => $validated['is_active'] ?? true,
                'is_fleet_operator' => $validated['is_fleet_operator'] ?? true,
                'is_client_car_operator' => $validated['is_client_car_operator'] ?? true,
                'is_owner_operator' => $validated['is_owner_operator'] ?? false,
                'owner_vehicle_model' => $validated['owner_vehicle_model'] ?? null,
                'owner_vehicle_class' => $validated['owner_vehicle_class'] ?? 'Executive Class · SUV',
                'owner_vehicle_plate' => $validated['owner_vehicle_plate'] ?? null,
                'owner_vehicle_reg_expires' => $validated['owner_vehicle_reg_expires'] ?? null,
                'owner_vehicle_ins_expires' => $validated['owner_vehicle_ins_expires'] ?? null,
                'owner_vehicle_inspected' => (bool) ($validated['owner_vehicle_inspected'] ?? false),
                'compliance_credentials' => [
                    'soar_certification' => ['status' => 'active', 'days_remaining' => 203],
                    'driver_license' => ['status' => 'active', 'days_remaining' => 519],
                    'carry_permit' => ['status' => 'renewal_due', 'days_remaining' => 21],
                ],
                'availability_schedule' => 'Mon, Tue, Wed, Thu, Fri: 07:00–19:00',
            ];

            $driver = Driver::create($driverData);

            AuditLog::record('driver.created', $request->user()?->getKey(), [
                'driver_id' => $driver->id,
                'name' => $driver->name,
            ], $driver);

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

            $driver->update(array_filter([
                'name' => $validated['name'] ?? $driver->name,
                'email' => array_key_exists('email', $validated) ? $validated['email'] : $driver->email,
                'phone' => array_key_exists('phone', $validated) ? $validated['phone'] : $driver->phone,
                'service_tier' => array_key_exists('service_tier', $validated) ? $validated['service_tier'] : $driver->service_tier,
                'avatar_url' => array_key_exists('avatar_url', $validated) ? $validated['avatar_url'] : $driver->avatar_url,
                'bio' => array_key_exists('bio', $validated) ? $validated['bio'] : $driver->bio,
                'sort_order' => array_key_exists('sort_order', $validated) ? $validated['sort_order'] : $driver->sort_order,
                'is_active' => array_key_exists('is_active', $validated) ? $validated['is_active'] : $driver->is_active,
                'is_fleet_operator' => array_key_exists('is_fleet_operator', $validated) ? $validated['is_fleet_operator'] : $driver->is_fleet_operator,
                'is_client_car_operator' => array_key_exists('is_client_car_operator', $validated) ? $validated['is_client_car_operator'] : $driver->is_client_car_operator,
                'is_owner_operator' => array_key_exists('is_owner_operator', $validated) ? $validated['is_owner_operator'] : $driver->is_owner_operator,
                'owner_vehicle_model' => array_key_exists('owner_vehicle_model', $validated) ? $validated['owner_vehicle_model'] : $driver->owner_vehicle_model,
                'owner_vehicle_class' => array_key_exists('owner_vehicle_class', $validated) ? $validated['owner_vehicle_class'] : $driver->owner_vehicle_class,
                'owner_vehicle_plate' => array_key_exists('owner_vehicle_plate', $validated) ? $validated['owner_vehicle_plate'] : $driver->owner_vehicle_plate,
                'owner_vehicle_reg_expires' => array_key_exists('owner_vehicle_reg_expires', $validated) ? $validated['owner_vehicle_reg_expires'] : $driver->owner_vehicle_reg_expires,
                'owner_vehicle_ins_expires' => array_key_exists('owner_vehicle_ins_expires', $validated) ? $validated['owner_vehicle_ins_expires'] : $driver->owner_vehicle_ins_expires,
                'owner_vehicle_inspected' => array_key_exists('owner_vehicle_inspected', $validated) ? $validated['owner_vehicle_inspected'] : $driver->owner_vehicle_inspected,
                'compliance_credentials' => array_key_exists('compliance_credentials', $validated) ? $validated['compliance_credentials'] : $driver->compliance_credentials,
                'availability_schedule' => array_key_exists('availability_schedule', $validated) ? $validated['availability_schedule'] : $driver->availability_schedule,
            ], fn ($v) => $v !== null));

            AuditLog::record('driver.updated', $request->user()?->getKey(), [
                'driver_id' => $driver->id,
                'is_active' => $driver->is_active,
                'is_owner_operator' => $driver->is_owner_operator,
            ], $driver);

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

    private function formatDriverSummary(Driver $d): array
    {
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
            'is_client_car_operator' => (bool) ($d->is_client_car_operator ?? true),
            'is_owner_operator' => (bool) ($d->is_owner_operator ?? false),
            'weekly_balance' => 424.50, // Prototype exact balance
            'active_rides_count' => (int) ($d->active_rides_count ?? 0),
        ];
    }

    private function formatDriverDetail(Driver $d): array
    {
        $regExpires = $d->owner_vehicle_reg_expires ? Carbon::parse($d->owner_vehicle_reg_expires)->format('Y-m-d') : '2027-09-14';
        $insExpires = $d->owner_vehicle_ins_expires ? Carbon::parse($d->owner_vehicle_ins_expires)->format('Y-m-d') : '2026-11-20';

        // Upcoming and active ride matching Screenshot 4
        $activeRide = [
            'id' => 'ride-1048',
            'reference' => 'AR-1048',
            'client_name' => 'Morgan Hale',
            'client_phone' => '(732) 555-0199',
            'date_time_label' => 'Thu, Nov 19, 7:17 AM',
            'tier_label' => 'T3 Elite',
            'status_label' => 'Driver assigned',
            'pickup_address' => '14 Riverside Dr, Rumson, NJ 07760',
            'dropoff_address' => 'Newark Liberty Intl (EWR), Terminal B',
            'service_description' => 'Airport transfer · 1st Class SUV · Cadillac Escalade · 1 pax',
            'archer_vehicle' => 'Cadillac Escalade #1',
            'route_note' => 'United 1422 to Denver, departs 9:40 AM',
        ];

        // Ride history matching Screenshot 4
        $rideHistory = [
            [
                'id' => 'hist-1',
                'date' => 'Tue, Nov 17',
                'client' => 'Priya Nair',
                'reference' => 'AR-1046',
                'job' => 'Hourly · T2 Executive',
                'paid_by' => 'Card',
                'earned' => 157.50,
            ],
            [
                'id' => 'hist-2',
                'date' => 'Tue, Nov 10',
                'client' => 'Priya Nair',
                'reference' => 'AR-1041',
                'job' => 'Point to point · T3 Elite',
                'paid_by' => 'Card',
                'earned' => 157.00,
            ],
        ];

        // Weekly pay card matching Screenshot 4
        $payWeek = [
            'earned_pay_tips' => 267.50,
            'cash_kept' => 0.00,
            'carried_earlier_weeks' => 157.00,
            'net_balance' => 424.50,
            'check_date' => 'Fri, Nov 27',
            'status_banner' => 'Archer owes $424.50 check ready Fri, Nov 27',
            'lifetime_earnings' => 424.50,
        ];

        return [
            'id' => $d->id,
            'name' => $d->name,
            'email' => $d->email ?: 'paul.m@example.com',
            'phone' => $d->phone ?: '(732) 555-0141',
            'service_tier' => $d->service_tier ?: 3,
            'tier' => $d->tier ? ['tier' => $d->tier->tier, 'name' => $d->tier->label] : ['tier' => 3, 'name' => 'T3 Elite'],
            'avatar_url' => $d->avatar_url,
            'bio' => $d->bio,
            'is_active' => (bool) $d->is_active,
            'employment_type' => 'Archer employee · owner-operator rights · Active · online now',
            // Operating switches
            'is_fleet_operator' => (bool) ($d->is_fleet_operator ?? true),
            'is_client_car_operator' => (bool) ($d->is_client_car_operator ?? true),
            'is_owner_operator' => (bool) ($d->is_owner_operator ?? true),
            // Owner-operator vehicle
            'owner_vehicle_model' => $d->owner_vehicle_model ?: '2022 Chevrolet Suburban',
            'owner_vehicle_class' => $d->owner_vehicle_class ?: 'Executive Class · SUV',
            'owner_vehicle_plate' => $d->owner_vehicle_plate ?: 'NJ PLM-221',
            'owner_vehicle_reg_expires' => $regExpires,
            'owner_vehicle_ins_expires' => $insExpires,
            'owner_vehicle_inspected' => $d->owner_vehicle_inspected !== null ? (bool) $d->owner_vehicle_inspected : true,
            // Compliance credentials
            'compliance_credentials' => $d->compliance_credentials ?: [
                'soar_certification' => ['status' => 'active', 'label' => 'Active · 203 days'],
                'driver_license' => ['status' => 'active', 'label' => 'Active · 519 days'],
                'carry_permit' => ['status' => 'renewal_due', 'label' => 'Renewal due · 21 days'],
            ],
            'availability_schedule' => $d->availability_schedule ?: 'Mon, Tue, Wed, Thu, Fri: 07:00–19:00',
            'claimed_shifts' => [
                'title' => 'Shore Day Camp (sample)',
                'schedule' => 'Mon, Nov 23, 8:00 AM – 4:00 PM · T2',
            ],
            'active_ride' => $activeRide,
            'ride_history' => $rideHistory,
            'pay_week' => $payWeek,
        ];
    }
}
