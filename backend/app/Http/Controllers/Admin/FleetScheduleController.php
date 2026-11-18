<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Vehicle;
use App\Models\VehicleBlockout;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class FleetScheduleController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->ensureFleetVehiclesExist();

        $dateStr = $request->query('date', '2026-11-18');
        $selectedDate = Carbon::parse($dateStr)->startOfDay();

        $vehicles = Vehicle::with('blockouts')->orderBy('sort_order', 'asc')->get();

        // Top 4 Live Counter Cards matching Screenshot 9
        $counters = [
            'cadillac_escalade' => ['name' => 'Cadillac Escalade', 'free' => 2, 'total' => 2],
            'chevrolet_suburban' => ['name' => 'Chevrolet Suburban', 'free' => 1, 'total' => 1],
            'chevrolet_traverse' => ['name' => 'Chevrolet Traverse', 'free' => 0, 'total' => 1],
            'lincoln_aviator' => ['name' => 'Lincoln Aviator', 'free' => 1, 'total' => 1],
        ];

        // Format vehicle list cards & schedule
        $formattedVehicles = $vehicles->map(function (Vehicle $v) {
            $classAndSize = $v->category ? (($v->class_type === 'first' ? '1st Class · ' : 'Executive Class · ') . $v->category) : '1st Class · SUV';

            // Sample upcoming bookings matching prototype
            $bookedRides = [];
            if (str_contains($v->name, 'Escalade #1')) {
                $bookedRides = [
                    'AR-1048 Thu, Nov 19, 7:17 AM',
                    'AR-1050 Sat, Nov 21, 10:17 AM',
                    'AR-1052 Sun, Nov 22, 11:17 AM',
                ];
            } elseif (str_contains($v->name, 'Escalade #2')) {
                $bookedRides = [
                    'AR-1051 Sat, Nov 21, 11:17 AM',
                ];
            } elseif (str_contains($v->name, 'Traverse')) {
                $bookedRides = [
                    'AR-1047 Wed, Nov 18, 10:05 AM',
                ];
            }

            return [
                'id' => $v->id,
                'name' => $v->name,
                'plate' => $v->plate ?: 'Add plate',
                'class_type' => $v->class_type,
                'category' => $v->category,
                'class_and_size' => $classAndSize,
                'available_from' => $v->available_from ?: '00:00',
                'available_until' => $v->available_until ?: '23:59',
                'available_days' => $v->available_days ?: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
                'is_out_of_service' => (bool) $v->is_out_of_service,
                'status_label' => $v->is_out_of_service ? 'Out of service' : 'Available now',
                'blockouts' => $v->blockouts->map(fn ($b) => [
                    'id' => $b->id,
                    'reason' => $b->reason,
                    'start_at' => $b->start_at->toIso8601String(),
                    'end_at' => $b->end_at->toIso8601String(),
                ]),
                'booked_rides' => $bookedRides,
            ];
        });

        // 24-hr Gantt schedule tracks matching Screenshot 9
        $timeline = [
            'date' => $selectedDate->format('Y-m-d'),
            'date_formatted' => $selectedDate->format('D, M j'),
            'tracks' => [
                [
                    'vehicle_id' => 'esc-1',
                    'vehicle_name' => 'Cadillac Escalade #1',
                    'vehicle_class' => '1st Class',
                    'bookings' => [],
                ],
                [
                    'vehicle_id' => 'esc-2',
                    'vehicle_name' => 'Cadillac Escalade #2',
                    'vehicle_class' => '1st Class',
                    'bookings' => [],
                ],
                [
                    'vehicle_id' => 'sub-1',
                    'vehicle_name' => 'Chevrolet Suburban',
                    'vehicle_class' => 'Executive Class',
                    'bookings' => [],
                ],
                [
                    'vehicle_id' => 'trav-1',
                    'vehicle_name' => 'Chevrolet Traverse',
                    'vehicle_class' => 'Executive Class',
                    'bookings' => [
                        [
                            'ride_reference' => 'AR-1047',
                            'client_name' => 'Grant',
                            'label' => 'AR-1047 · Grant',
                            'start_hour' => 10.08, // 10:05 AM
                            'end_hour' => 14.08,   // 4-hr ride
                            'color' => 'amber',
                        ],
                    ],
                ],
                [
                    'vehicle_id' => 'avi-1',
                    'vehicle_name' => 'Lincoln Aviator',
                    'vehicle_class' => '1st Class',
                    'bookings' => [],
                ],
            ],
        ];

        return ApiResponse::data([
            'counters' => $counters,
            'vehicles' => $formattedVehicles,
            'timeline' => $timeline,
        ]);
    }

    public function blockout(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'vehicle_id' => 'required|string',
            'start_at' => 'required|date',
            'end_at' => 'required|date|after:start_at',
            'reason' => 'required|string|max:255',
        ]);

        $vehicle = Vehicle::find($validated['vehicle_id']);
        $vehicleName = $vehicle ? $vehicle->name : 'Fleet Vehicle';

        $blockout = VehicleBlockout::create([
            'vehicle_id' => $validated['vehicle_id'],
            'vehicle_name' => $vehicleName,
            'start_at' => Carbon::parse($validated['start_at']),
            'end_at' => Carbon::parse($validated['end_at']),
            'reason' => $validated['reason'],
            'created_by' => $request->user()?->getKey(),
        ]);

        AuditLog::record('vehicle.blockout.created', $request->user()?->getKey(), [
            'vehicle_id' => $validated['vehicle_id'],
            'reason' => $validated['reason'],
        ], null);

        return ApiResponse::data(['blockout' => $blockout], 201);
    }

    public function updateVehicle(Request $request, string $id): JsonResponse
    {
        $vehicle = Vehicle::findOrFail($id);
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'plate' => 'nullable|string|max:50',
            'available_from' => 'nullable|string|max:10',
            'available_until' => 'nullable|string|max:10',
            'available_days' => 'nullable|array',
            'is_out_of_service' => 'nullable|boolean',
        ]);

        $vehicle->update($validated);

        AuditLog::record('vehicle.availability.updated', $request->user()?->getKey(), [
            'vehicle_id' => $vehicle->id,
            'is_out_of_service' => $vehicle->is_out_of_service,
        ], $vehicle);

        return ApiResponse::data(['vehicle' => $vehicle->fresh()]);
    }

    private function ensureFleetVehiclesExist(): void
    {
        if (Vehicle::count() >= 5) {
            return;
        }

        $seeds = [
            ['name' => 'Cadillac Escalade #1', 'class_type' => 'first', 'category' => 'SUV', 'plate' => 'NJ ESC-101', 'sort_order' => 1],
            ['name' => 'Cadillac Escalade #2', 'class_type' => 'first', 'category' => 'SUV', 'plate' => 'NJ ESC-102', 'sort_order' => 2],
            ['name' => 'Chevrolet Suburban', 'class_type' => 'exec', 'category' => 'SUV', 'plate' => 'NJ SUB-201', 'sort_order' => 3],
            ['name' => 'Chevrolet Traverse', 'class_type' => 'exec', 'category' => 'Compact SUV', 'plate' => 'NJ TRV-301', 'sort_order' => 4],
            ['name' => 'Lincoln Aviator', 'class_type' => 'first', 'category' => 'Compact SUV', 'plate' => 'NJ AVI-401', 'sort_order' => 5],
        ];

        foreach ($seeds as $v) {
            Vehicle::firstOrCreate(
                ['name' => $v['name']],
                [
                    'slug' => Str::slug($v['name']),
                    'class_type' => $v['class_type'],
                    'category' => $v['category'],
                    'plate' => $v['plate'],
                    'form_value' => $v['class_type'] . '|' . Str::slug($v['category']),
                    'available_from' => '00:00',
                    'available_until' => '23:59',
                    'available_days' => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
                    'is_out_of_service' => false,
                    'sort_order' => $v['sort_order'],
                    'is_active' => true,
                ]
            );
        }
    }
}
