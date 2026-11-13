<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\DriverNotification;
use App\Models\RideRequest;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RideDispatchController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = RideRequest::with('assignedDriver')->orderBy('created_at', 'desc');

        if ($request->has('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        $rides = $query->get();

        return ApiResponse::data(['rides' => $rides]);
    }

    public function show(string $id): JsonResponse
    {
        $ride = RideRequest::with('assignedDriver')->findOrFail($id);
        return ApiResponse::data(['ride' => $ride]);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $ride = RideRequest::findOrFail($id);
        $previousDriverId = $ride->assigned_driver_id;
        $previousStatus = $ride->status;

        $validated = $request->validate([
            'status' => 'sometimes|required|string|in:pending,dispatched,in_progress,completed,cancelled',
            'assigned_driver_id' => 'nullable|exists:drivers,id',
            'pickup_location' => 'nullable|string|max:255',
            'dropoff_location' => 'nullable|string|max:255',
            'dispatch_notes' => 'nullable|string',
        ]);

        $ride->update($validated);

        // If driver was newly assigned or changed, trigger an in-app driver notification!
        if (!empty($validated['assigned_driver_id']) && $validated['assigned_driver_id'] !== $previousDriverId) {
            DriverNotification::create([
                'driver_id' => $validated['assigned_driver_id'],
                'ride_request_id' => $ride->id,
                'title' => 'New Ride Assigned (' . $ride->reference . ')',
                'message' => 'You have been dispatched for a ride on ' . $ride->ride_date . ' at ' . $ride->ride_time . '. Passenger: ' . $ride->first_name . ' ' . $ride->last_name . '.',
                'type' => 'assignment',
                'is_read' => false,
            ]);
        } elseif (!empty($ride->assigned_driver_id) && isset($validated['status']) && $validated['status'] !== $previousStatus) {
            // If status changed by dispatch
            DriverNotification::create([
                'driver_id' => $ride->assigned_driver_id,
                'ride_request_id' => $ride->id,
                'title' => 'Ride Status Updated (' . $ride->reference . ')',
                'message' => 'Status changed to ' . strtoupper(str_replace('_', ' ', $validated['status'])) . '.',
                'type' => 'status_change',
                'is_read' => false,
            ]);
        }

        return ApiResponse::data(['ride' => $ride->load('assignedDriver')]);
    }
}
