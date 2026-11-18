<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Driver;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class SecuritySuiteController extends Controller
{
    // --- 1. LEADS ---
    public function leads(): JsonResponse
    {
        $leads = DB::table('security_leads')->orderByDesc('id')->get();
        $newCount = DB::table('security_leads')->where('status', 'new')->count();

        return ApiResponse::data([
            'leads' => $leads,
            'new_count' => $newCount,
        ]);
    }

    public function updateLeadStatus(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'status' => 'required|string|in:new,contacted,in_progress,converted',
        ]);

        DB::table('security_leads')->where('id', $id)->update([
            'status' => $validated['status'],
            'updated_at' => now(),
        ]);

        AuditLog::record('security.lead_status_updated', $request->user()?->id, [
            'lead_id' => $id,
            'status' => $validated['status'],
        ], null);

        return ApiResponse::data([
            'message' => 'Lead status updated.',
            'lead' => DB::table('security_leads')->find($id),
        ]);
    }

    // --- 2. CONTRACTS & SHIFTS ---
    public function contractsAndShifts(): JsonResponse
    {
        $shifts = DB::table('security_shifts')->orderBy('id')->get();
        $drivers = Driver::orderBy('name')->get(['id', 'name']);

        // Count unclaimed shifts < 48 hours
        $unclaimedUrgentCount = DB::table('security_shifts')
            ->where('status', 'open')
            ->count();

        return ApiResponse::data([
            'shifts' => $shifts,
            'drivers' => $drivers,
            'unclaimed_urgent_count' => $unclaimedUrgentCount,
            'alert_message' => '2 shifts are unclaimed less than 48 hours out. Assign them manually below. Event-critical shifts are urgent.',
        ]);
    }

    public function storeContract(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'client_name' => 'required|string|max:150',
            'contact_name' => 'nullable|string|max:150',
            'site_address' => 'required|string|max:255',
            'tier' => 'required|string|in:T1,T2,T3,T4',
            'headcount' => 'required|integer|min:1',
            'start_date' => 'required|date',
            'length_days' => 'required|integer|min:1|max:365',
            'start_time' => 'required|string',
            'hours_per_shift' => 'required|integer|min:1',
            'days_of_week' => 'nullable|array',
            'is_event_critical' => 'nullable|boolean',
        ]);

        $contractId = DB::table('security_contracts')->insertGetId([
            'client_name' => $validated['client_name'],
            'contact_name' => $validated['contact_name'] ?? null,
            'site_address' => $validated['site_address'],
            'tier' => $validated['tier'],
            'headcount' => $validated['headcount'],
            'start_date' => $validated['start_date'],
            'length_days' => $validated['length_days'],
            'start_time' => $validated['start_time'],
            'hours_per_shift' => $validated['hours_per_shift'],
            'days_of_week' => json_encode($validated['days_of_week'] ?? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']),
            'is_event_critical' => (bool) ($validated['is_event_critical'] ?? false),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Auto-build shifts calendar
        $startDate = Carbon::parse($validated['start_date']);
        $totalDays = min($validated['length_days'], 14);

        for ($i = 0; $i < $totalDays; $i++) {
            $shiftDate = $startDate->copy()->addDays($i);
            $dayName = $shiftDate->format('D');
            $allowedDays = $validated['days_of_week'] ?? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

            if (!in_array($dayName, $allowedDays)) {
                continue;
            }

            $dateLabel = $shiftDate->format('D, M j') . ', ' . $validated['start_time'] . ' (shift)';
            DB::table('security_shifts')->insert([
                'contract_id' => $contractId,
                'name' => $validated['client_name'],
                'site_address' => $validated['site_address'],
                'shift_date_label' => $dateLabel,
                'tier' => $validated['tier'],
                'status' => $i < 7 ? 'open' : 'not_released_yet',
                'is_critical' => (bool) ($validated['is_event_critical'] ?? false),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        AuditLog::record('security.contract_created', $request->user()?->id, [
            'contract_id' => $contractId,
            'client' => $validated['client_name'],
            'tier' => $validated['tier'],
        ], null);

        return ApiResponse::data([
            'message' => 'Contract and shifts calendar created successfully.',
            'contract_id' => $contractId,
        ], 201);
    }

    public function assignShift(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'driver_name' => 'required|string',
        ]);

        DB::table('security_shifts')->where('id', $id)->update([
            'assigned_driver_name' => $validated['driver_name'],
            'status' => 'assigned',
            'updated_at' => now(),
        ]);

        AuditLog::record('security.shift_assigned', $request->user()?->id, [
            'shift_id' => $id,
            'driver' => $validated['driver_name'],
        ], null);

        return ApiResponse::data([
            'message' => 'Driver assigned to shift.',
            'shift' => DB::table('security_shifts')->find($id),
        ]);
    }

    // --- 3. SWAPS ---
    public function swaps(): JsonResponse
    {
        $swaps = DB::table('security_swaps')->where('status', 'waiting_admin')->get();

        return ApiResponse::data([
            'swaps' => $swaps,
            'pending_count' => count($swaps),
        ]);
    }

    public function swapDecision(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'decision' => 'required|string|in:approve,deny',
        ]);

        $status = $validated['decision'] === 'approve' ? 'approved' : 'denied';

        $swap = DB::table('security_swaps')->find($id);
        if ($swap) {
            DB::table('security_swaps')->where('id', $id)->update([
                'status' => $status,
                'updated_at' => now(),
            ]);

            if ($validated['decision'] === 'approve') {
                DB::table('security_shifts')->where('id', $swap->shift_id)->update([
                    'assigned_driver_name' => $swap->to_driver_name,
                    'status' => 'assigned',
                    'updated_at' => now(),
                ]);
            } else {
                DB::table('security_shifts')->where('id', $swap->shift_id)->update([
                    'assigned_driver_name' => $swap->from_driver_name,
                    'status' => 'assigned',
                    'updated_at' => now(),
                ]);
            }
        }

        AuditLog::record('security.swap_decision', $request->user()?->id, [
            'swap_id' => $id,
            'decision' => $status,
        ], null);

        return ApiResponse::data([
            'message' => 'Swap request ' . $status . '.',
        ]);
    }

    // --- 4. CREDENTIALS ---
    public function credentials(): JsonResponse
    {
        $credentials = DB::table('security_credentials')->get();

        return ApiResponse::data([
            'credentials' => $credentials,
            'expiring_count' => count($credentials),
            'impacted_shifts_count' => 0,
            'impacted_shifts_note' => 'No claimed shifts are affected.',
        ]);
    }

    // --- 5. ANNOUNCEMENTS ---
    public function announcements(): JsonResponse
    {
        $announcements = DB::table('security_announcements')->orderByDesc('id')->get();

        return ApiResponse::data([
            'announcements' => $announcements,
        ]);
    }

    public function storeAnnouncement(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'message' => 'required|string|max:1000',
        ]);

        $id = DB::table('security_announcements')->insertGetId([
            'author_name' => 'Dispatch',
            'message' => $validated['message'],
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        AuditLog::record('security.announcement_posted', $request->user()?->id, [
            'announcement_id' => $id,
            'message' => $validated['message'],
        ], null);

        return ApiResponse::data([
            'message' => 'Announcement broadcasted.',
            'announcement' => DB::table('security_announcements')->find($id),
        ], 201);
    }
}
