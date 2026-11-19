<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Driver;
use App\Support\ApiResponse;
use App\Support\Security\ShiftEligibility as Rules;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Security Phase 2: leads → contracts → shifts → assignment → swaps, gated by driver credentials.
 * Rules and assumptions: docs/SECURITY_OPERATIONS_RULES.md. Every mutation is validated here.
 */
class SecuritySuiteController extends Controller
{
    private const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    private const ACTIVE_SHIFT = ['open', 'not_released_yet', 'assigned', 'swap_pending'];

    // ───────────────────────── LEADS ─────────────────────────
    public function leads(Request $request): JsonResponse
    {
        $leads = DB::table('security_leads as l')
            ->leftJoin('ride_requests as r', 'r.id', '=', 'l.ride_request_id')
            ->when($request->query('status'), fn ($q, $s) => $q->where('l.status', $s))
            ->orderByDesc('l.id')
            ->get(['l.*', 'r.reference as ride_reference']);

        return ApiResponse::data([
            'leads' => $leads,
            'new_count' => DB::table('security_leads')->where('status', 'new')->count(),
        ]);
    }

    public function showLead(int $id): JsonResponse
    {
        $lead = DB::table('security_leads')->find($id);

        return $lead ? ApiResponse::data(['lead' => $lead]) : $this->notFound('Lead');
    }

    public function storeLead(Request $request): JsonResponse
    {
        $v = $request->validate($this->leadRules(true));
        $id = DB::table('security_leads')->insertGetId($v + [
            'status' => 'new', 'source' => 'admin', 'created_at' => now(), 'updated_at' => now(),
        ]);
        $this->audit($request, 'security.lead_created', ['lead_id' => $id, 'client' => $v['client_name']]);

        return ApiResponse::data(['message' => 'Lead created.', 'lead' => DB::table('security_leads')->find($id)], 201);
    }

    public function updateLead(Request $request, int $id): JsonResponse
    {
        $lead = DB::table('security_leads')->find($id);
        if (! $lead) {
            return $this->notFound('Lead');
        }
        if ($lead->status === 'converted') {
            return ApiResponse::error('CONFLICT', 'A converted lead is locked; edit its contract instead.', 409);
        }
        $v = $request->validate($this->leadRules(false));
        DB::table('security_leads')->where('id', $id)->update($v + ['updated_at' => now()]);
        $this->audit($request, 'security.lead_updated', ['lead_id' => $id, 'fields' => array_keys($v)]);

        return ApiResponse::data(['message' => 'Lead updated.', 'lead' => DB::table('security_leads')->find($id)]);
    }

    public function updateLeadStatus(Request $request, int $id): JsonResponse
    {
        $v = $request->validate(['status' => 'required|string|in:new,contacted,in_progress,lost,converted']);
        $lead = DB::table('security_leads')->find($id);
        if (! $lead) {
            return $this->notFound('Lead');
        }
        if ($v['status'] === 'converted') {
            return ApiResponse::error('VALIDATION_FAILED', 'Use "Convert to contract" to convert a lead.', 422, ['status' => ['Use the convert action.']]);
        }
        if ($lead->status === 'converted') {
            return ApiResponse::error('CONFLICT', 'A converted lead cannot be moved back.', 409);
        }
        DB::table('security_leads')->where('id', $id)->update(['status' => $v['status'], 'updated_at' => now()]);
        $this->audit($request, 'security.lead_status_updated', ['lead_id' => $id, 'status' => $v['status']]);

        return ApiResponse::data(['message' => 'Lead status updated.', 'lead' => DB::table('security_leads')->find($id)]);
    }

    public function destroyLead(Request $request, int $id): JsonResponse
    {
        $lead = DB::table('security_leads')->find($id);
        if (! $lead) {
            return $this->notFound('Lead');
        }
        if ($lead->status === 'converted' || $lead->contract_id) {
            return ApiResponse::error('CONFLICT', 'A converted lead is part of a contract and cannot be deleted.', 409);
        }
        DB::table('security_leads')->where('id', $id)->delete();
        $this->audit($request, 'security.lead_deleted', ['lead_id' => $id, 'client' => $lead->client_name]);

        return ApiResponse::data(['message' => 'Lead deleted.']);
    }

    /** Converts a lead into a contract (and its shifts) atomically; the lead keeps the link. */
    public function convertLead(Request $request, int $id): JsonResponse
    {
        $v = $request->validate($this->contractRules(false));
        $lead = DB::table('security_leads')->find($id);
        if (! $lead) {
            return $this->notFound('Lead');
        }
        if ($lead->status === 'converted') {
            return ApiResponse::error('CONFLICT', 'This lead has already been converted.', 409);
        }

        $contractId = DB::transaction(function () use ($v, $lead, $id) {
            $v['client_name'] = $v['client_name'] ?? $lead->client_name;
            $v['contact_name'] = $v['contact_name'] ?? $lead->contact_name;
            $contractId = $this->createContract($v, $id);
            DB::table('security_leads')->where('id', $id)->update([
                'status' => 'converted', 'contract_id' => $contractId, 'converted_at' => now(), 'updated_at' => now(),
            ]);

            return $contractId;
        });
        $this->audit($request, 'security.lead_converted', ['lead_id' => $id, 'contract_id' => $contractId]);

        return ApiResponse::data(['message' => 'Lead converted to a contract.', 'contract_id' => $contractId], 201);
    }

    // ───────────────────────── CONTRACTS ─────────────────────────
    public function contractsAndShifts(): JsonResponse
    {
        $names = Driver::pluck('name', 'id');
        $shifts = DB::table('security_shifts')->orderBy('starts_at')->orderBy('id')->get()->map(function ($s) use ($names) {
            if ($s->assigned_driver_id && isset($names[$s->assigned_driver_id])) {
                $s->assigned_driver_name = $names[$s->assigned_driver_id];
            }

            return $s;
        });
        $open = $shifts->where('status', 'open')->count();

        $contracts = DB::table('security_contracts')->orderByDesc('id')->get()->map(function ($c) use ($shifts) {
            $mine = $shifts->where('contract_id', $c->id);
            $c->shift_count = $mine->count();
            $c->open_count = $mine->where('status', 'open')->count();
            $c->assigned_count = $mine->whereIn('status', ['assigned', 'swap_pending'])->count();

            return $c;
        });

        return ApiResponse::data([
            'shifts' => $shifts->values(),
            'contracts' => $contracts,
            'drivers' => Driver::where('is_active', true)->orderBy('name')->get(['id', 'name', 'service_tier']),
            'unclaimed_urgent_count' => $open,
            'alert_message' => $open > 0 ? $open.' open shift(s) still need a driver assigned.' : null,
        ]);
    }

    public function showContract(int $id): JsonResponse
    {
        $contract = DB::table('security_contracts')->find($id);
        if (! $contract) {
            return $this->notFound('Contract');
        }

        return ApiResponse::data([
            'contract' => $contract,
            'shifts' => DB::table('security_shifts')->where('contract_id', $id)->orderBy('starts_at')->orderBy('id')->get(),
            'lead' => DB::table('security_leads')->where('contract_id', $id)->first(),
        ]);
    }

    public function storeContract(Request $request): JsonResponse
    {
        $v = $request->validate($this->contractRules(true));
        $contractId = DB::transaction(fn () => $this->createContract($v, null));
        $this->audit($request, 'security.contract_created', ['contract_id' => $contractId, 'client' => $v['client_name'], 'tier' => $v['tier']]);

        return ApiResponse::data(['message' => 'Contract and shifts calendar created successfully.', 'contract_id' => $contractId], 201);
    }

    public function updateContract(Request $request, int $id): JsonResponse
    {
        $contract = DB::table('security_contracts')->find($id);
        if (! $contract) {
            return $this->notFound('Contract');
        }
        if ($contract->status !== 'active') {
            return ApiResponse::error('CONFLICT', 'Only an active contract can be edited.', 409);
        }
        $v = $request->validate([
            'client_name' => 'sometimes|string|max:150', 'contact_name' => 'nullable|string|max:150',
            'site_address' => 'sometimes|string|max:255', 'notes' => 'nullable|string|max:2000',
            'is_event_critical' => 'sometimes|boolean',
        ]);

        DB::transaction(function () use ($id, $v) {
            DB::table('security_contracts')->where('id', $id)->update($v + ['updated_at' => now()]);
            $shiftFields = array_filter([
                'name' => $v['client_name'] ?? null, 'site_address' => $v['site_address'] ?? null,
                'is_critical' => $v['is_event_critical'] ?? null,
            ], fn ($x) => $x !== null);
            if ($shiftFields) {
                DB::table('security_shifts')->where('contract_id', $id)->whereIn('status', self::ACTIVE_SHIFT)
                    ->update($shiftFields + ['updated_at' => now()]);
            }
        });
        $this->audit($request, 'security.contract_updated', ['contract_id' => $id, 'fields' => array_keys($v)]);

        return ApiResponse::data(['message' => 'Contract updated.', 'contract' => DB::table('security_contracts')->find($id)]);
    }

    public function cancelContract(Request $request, int $id): JsonResponse
    {
        $contract = DB::table('security_contracts')->find($id);
        if (! $contract) {
            return $this->notFound('Contract');
        }
        if ($contract->status !== 'active') {
            return ApiResponse::error('CONFLICT', 'This contract is already '.$contract->status.'.', 409);
        }

        DB::transaction(function () use ($id, $contract) {
            $shifts = DB::table('security_shifts')->where('contract_id', $id)->whereIn('status', self::ACTIVE_SHIFT)->get();
            foreach ($shifts->whereNotNull('assigned_driver_id') as $s) {
                Rules::notifyDriver($s->assigned_driver_id, 'Shift cancelled', $contract->client_name.' ('.$s->shift_date_label.') was cancelled.');
            }
            DB::table('security_swaps')->whereIn('shift_id', $shifts->pluck('id'))->where('status', 'waiting_admin')
                ->update(['status' => 'withdrawn', 'updated_at' => now()]);
            DB::table('security_shifts')->whereIn('id', $shifts->pluck('id'))->update(['status' => 'cancelled', 'updated_at' => now()]);
            DB::table('security_contracts')->where('id', $id)->update(['status' => 'cancelled', 'updated_at' => now()]);
        });
        $this->audit($request, 'security.contract_cancelled', ['contract_id' => $id]);

        return ApiResponse::data(['message' => 'Contract cancelled; open and assigned shifts were cancelled.']);
    }

    public function destroyContract(Request $request, int $id): JsonResponse
    {
        $contract = DB::table('security_contracts')->find($id);
        if (! $contract) {
            return $this->notFound('Contract');
        }
        $worked = DB::table('security_shifts')->where('contract_id', $id)
            ->where(fn ($q) => $q->whereNotNull('assigned_driver_id')->orWhere('status', 'completed'))->exists();
        if ($worked) {
            return ApiResponse::error('CONFLICT', 'This contract has assigned or completed shifts. Cancel it instead of deleting.', 409);
        }

        DB::transaction(function () use ($id) {
            DB::table('security_shifts')->where('contract_id', $id)->delete();
            DB::table('security_leads')->where('contract_id', $id)->update([
                'contract_id' => null, 'status' => 'in_progress', 'converted_at' => null, 'updated_at' => now(),
            ]);
            DB::table('security_contracts')->where('id', $id)->delete();
        });
        $this->audit($request, 'security.contract_deleted', ['contract_id' => $id, 'client' => $contract->client_name]);

        return ApiResponse::data(['message' => 'Contract deleted.']);
    }

    // ───────────────────────── SHIFTS ─────────────────────────
    public function storeShift(Request $request): JsonResponse
    {
        $v = $request->validate([
            'name' => 'required|string|max:150', 'site_address' => 'required|string|max:255',
            'date' => 'required|date|after_or_equal:today', 'start_time' => ['required', 'regex:/^\d{2}:\d{2}$/'],
            'hours' => 'required|integer|min:1|max:24', 'tier' => 'required|in:T1,T2,T3,T4',
            'is_critical' => 'nullable|boolean', 'contract_id' => 'nullable|integer',
        ]);
        if (! empty($v['contract_id'])) {
            $c = DB::table('security_contracts')->find($v['contract_id']);
            if (! $c || $c->status !== 'active') {
                return ApiResponse::error('VALIDATION_FAILED', 'Contract not found or not active.', 422, ['contract_id' => ['Choose an active contract.']]);
            }
        }
        [$start, $end] = Rules::window($v['date'], $v['start_time'], $v['hours']);
        $id = DB::table('security_shifts')->insertGetId([
            'contract_id' => $v['contract_id'] ?? null, 'name' => $v['name'], 'site_address' => $v['site_address'],
            'shift_date_label' => Rules::label($start, $end), 'starts_at' => $start, 'ends_at' => $end, 'slot' => 1,
            'tier' => $v['tier'], 'status' => 'open', 'is_critical' => (bool) ($v['is_critical'] ?? false),
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $this->audit($request, 'security.shift_created', ['shift_id' => $id]);

        return ApiResponse::data(['message' => 'Shift created.', 'shift' => DB::table('security_shifts')->find($id)], 201);
    }

    public function updateShift(Request $request, int $id): JsonResponse
    {
        $shift = DB::table('security_shifts')->find($id);
        if (! $shift) {
            return $this->notFound('Shift');
        }
        if (! in_array($shift->status, self::ACTIVE_SHIFT, true)) {
            return ApiResponse::error('CONFLICT', 'A '.$shift->status.' shift cannot be edited.', 409);
        }
        $v = $request->validate([
            'name' => 'sometimes|string|max:150', 'site_address' => 'sometimes|string|max:255',
            'date' => 'sometimes|date|after_or_equal:today', 'start_time' => ['sometimes', 'regex:/^\d{2}:\d{2}$/'],
            'hours' => 'sometimes|integer|min:1|max:24', 'tier' => 'sometimes|in:T1,T2,T3,T4', 'is_critical' => 'sometimes|boolean',
        ]);

        $update = array_intersect_key($v, array_flip(['name', 'site_address', 'tier', 'is_critical']));
        $timeChanged = false;
        if (isset($v['date']) || isset($v['start_time']) || isset($v['hours'])) {
            $hasWindow = $shift->starts_at && $shift->ends_at;
            $current = ($hasWindow ? Carbon::parse($shift->starts_at, 'UTC') : now('UTC'))->setTimezone(Rules::TZ);
            $hours = $v['hours'] ?? ($hasWindow ? max(1, (int) round(Carbon::parse($shift->starts_at)->diffInMinutes($shift->ends_at) / 60)) : 8);
            [$start, $end] = Rules::window($v['date'] ?? $current->toDateString(), $v['start_time'] ?? $current->format('H:i'), $hours);
            // Only a real change moves the shift (and notifies the driver); the form resends unchanged values.
            $timeChanged = ! $hasWindow || ! $start->equalTo(Carbon::parse($shift->starts_at, 'UTC')) || ! $end->equalTo(Carbon::parse($shift->ends_at, 'UTC'));
            if ($timeChanged) {
                $update += ['starts_at' => $start, 'ends_at' => $end, 'shift_date_label' => Rules::label($start, $end)];
            }
        }

        if ($shift->assigned_driver_id && ($timeChanged || isset($v['tier']))) {
            $problems = Rules::problems(Driver::find($shift->assigned_driver_id), (object) array_merge((array) $shift, $update), $id);
            if ($problems) {
                return ApiResponse::error('VALIDATION_FAILED', 'The assigned driver cannot work this change: '.implode(' ', $problems), 422, ['shift' => $problems]);
            }
        }

        DB::table('security_shifts')->where('id', $id)->update($update + ['updated_at' => now()]);
        if ($shift->assigned_driver_id && $timeChanged) {
            $fresh = DB::table('security_shifts')->find($id);
            Rules::notifyDriver($shift->assigned_driver_id, 'Shift updated', $fresh->name.' is now '.$fresh->shift_date_label.'.');
        }
        $this->audit($request, 'security.shift_updated', ['shift_id' => $id, 'fields' => array_keys($update)]);

        return ApiResponse::data(['message' => 'Shift updated.', 'shift' => DB::table('security_shifts')->find($id)]);
    }

    public function destroyShift(Request $request, int $id): JsonResponse
    {
        $shift = DB::table('security_shifts')->find($id);
        if (! $shift) {
            return $this->notFound('Shift');
        }
        if ($shift->assigned_driver_id || in_array($shift->status, ['completed', 'swap_pending'], true)) {
            return ApiResponse::error('CONFLICT', 'Unassign the driver (or cancel the contract) before deleting this shift.', 409);
        }
        DB::table('security_shifts')->where('id', $id)->delete();
        $this->audit($request, 'security.shift_deleted', ['shift_id' => $id]);

        return ApiResponse::data(['message' => 'Shift deleted.']);
    }

    public function assignShift(Request $request, int $id): JsonResponse
    {
        $v = $request->validate(['driver_id' => 'required|string|max:36']);

        return DB::transaction(function () use ($request, $id, $v) {
            $shift = DB::table('security_shifts')->where('id', $id)->lockForUpdate()->first();
            if (! $shift) {
                return $this->notFound('Shift');
            }
            if (! in_array($shift->status, ['open', 'not_released_yet', 'assigned'], true)) {
                return ApiResponse::error('CONFLICT', 'A '.$shift->status.' shift cannot be assigned.', 409);
            }
            if ($shift->starts_at && Carbon::parse($shift->starts_at)->isPast()) {
                return ApiResponse::error('VALIDATION_FAILED', 'This shift has already started.', 422, ['shift' => ['Shift is in the past.']]);
            }
            $driver = Driver::find($v['driver_id']);
            $problems = Rules::problems($driver, $shift, $id);
            if ($problems) {
                return ApiResponse::error('VALIDATION_FAILED', implode(' ', $problems), 422, ['driver_id' => $problems]);
            }

            $previous = $shift->assigned_driver_id;
            DB::table('security_shifts')->where('id', $id)->update([
                'assigned_driver_id' => $driver->getKey(), 'assigned_driver_name' => $driver->name, 'status' => 'assigned', 'updated_at' => now(),
            ]);
            if ($previous && $previous !== $driver->getKey()) {
                Rules::notifyDriver($previous, 'Shift reassigned', $shift->name.' ('.$shift->shift_date_label.') was moved to another driver.');
            }
            Rules::notifyDriver($driver->getKey(), 'New security shift', $shift->name.' — '.$shift->shift_date_label.' at '.$shift->site_address.'.');
            $this->audit($request, 'security.shift_assigned', ['shift_id' => $id, 'driver_id' => $driver->getKey()]);

            return ApiResponse::data(['message' => 'Driver assigned to shift.', 'shift' => DB::table('security_shifts')->find($id)]);
        });
    }

    public function unassignShift(Request $request, int $id): JsonResponse
    {
        $shift = DB::table('security_shifts')->find($id);
        if (! $shift) {
            return $this->notFound('Shift');
        }
        if (! in_array($shift->status, ['assigned', 'swap_pending'], true) || ! $shift->assigned_driver_id) {
            return ApiResponse::error('CONFLICT', 'This shift has no driver to remove.', 409);
        }
        DB::transaction(function () use ($id, $shift) {
            DB::table('security_swaps')->where('shift_id', $id)->where('status', 'waiting_admin')
                ->update(['status' => 'withdrawn', 'updated_at' => now()]);
            DB::table('security_shifts')->where('id', $id)->update([
                'assigned_driver_id' => null, 'assigned_driver_name' => null, 'status' => 'open', 'updated_at' => now(),
            ]);
            Rules::notifyDriver($shift->assigned_driver_id, 'Shift removed', 'You were removed from '.$shift->name.' ('.$shift->shift_date_label.').');
        });
        $this->audit($request, 'security.shift_unassigned', ['shift_id' => $id, 'driver_id' => $shift->assigned_driver_id]);

        return ApiResponse::data(['message' => 'Driver removed; shift is open again.', 'shift' => DB::table('security_shifts')->find($id)]);
    }

    // ───────────────────────── SWAPS ─────────────────────────
    public function swaps(): JsonResponse
    {
        $pending = DB::table('security_swaps')->where('status', 'waiting_admin')->orderBy('id')->get();

        return ApiResponse::data([
            'swaps' => $pending,
            'pending_count' => $pending->count(),
            'history' => DB::table('security_swaps')->where('status', '!=', 'waiting_admin')->orderByDesc('id')->limit(50)->get(),
            'drivers' => Driver::where('is_active', true)->orderBy('name')->get(['id', 'name', 'service_tier']),
        ]);
    }

    public function storeSwap(Request $request): JsonResponse
    {
        $v = $request->validate([
            'shift_id' => 'required|integer', 'to_driver_id' => 'required|string|max:36', 'reason' => 'nullable|string|max:500',
        ]);

        return DB::transaction(function () use ($request, $v) {
            $shift = DB::table('security_shifts')->where('id', $v['shift_id'])->lockForUpdate()->first();
            if (! $shift) {
                return $this->notFound('Shift');
            }
            if ($shift->status !== 'assigned' || ! $shift->assigned_driver_id) {
                return ApiResponse::error('CONFLICT', 'Only an assigned shift can be swapped.', 409);
            }
            if ($shift->starts_at && Carbon::parse($shift->starts_at)->isPast()) {
                return ApiResponse::error('VALIDATION_FAILED', 'This shift has already started.', 422, ['shift_id' => ['Shift is in the past.']]);
            }
            if ($shift->assigned_driver_id === $v['to_driver_id']) {
                return ApiResponse::error('VALIDATION_FAILED', 'Choose a different driver.', 422, ['to_driver_id' => ['Same driver.']]);
            }
            $to = Driver::find($v['to_driver_id']);
            $problems = Rules::problems($to, $shift, $shift->id);
            if ($problems) {
                return ApiResponse::error('VALIDATION_FAILED', implode(' ', $problems), 422, ['to_driver_id' => $problems]);
            }
            $from = Driver::find($shift->assigned_driver_id);

            $id = DB::table('security_swaps')->insertGetId([
                'shift_id' => $shift->id, 'shift_name' => $shift->name, 'shift_time_label' => $shift->shift_date_label,
                'from_driver_id' => $shift->assigned_driver_id, 'from_driver_name' => $from?->name ?? $shift->assigned_driver_name,
                'to_driver_id' => $to->getKey(), 'to_driver_name' => $to->name, 'to_driver_tier' => 'T'.(int) $to->service_tier,
                'reason' => $v['reason'] ?? null, 'status' => 'waiting_admin', 'created_at' => now(), 'updated_at' => now(),
            ]);
            DB::table('security_shifts')->where('id', $shift->id)->update(['status' => 'swap_pending', 'updated_at' => now()]);
            $this->audit($request, 'security.swap_requested', ['swap_id' => $id, 'shift_id' => $shift->id]);

            return ApiResponse::data(['message' => 'Swap request logged for approval.', 'swap' => DB::table('security_swaps')->find($id)], 201);
        });
    }

    public function swapDecision(Request $request, int $id): JsonResponse
    {
        $v = $request->validate(['decision' => 'required|string|in:approve,deny', 'notes' => 'nullable|string|max:500']);

        return DB::transaction(function () use ($request, $id, $v) {
            $swap = DB::table('security_swaps')->where('id', $id)->lockForUpdate()->first();
            if (! $swap) {
                return $this->notFound('Swap request');
            }
            if ($swap->status !== 'waiting_admin') {
                return ApiResponse::error('CONFLICT', 'This swap has already been decided.', 409);
            }
            $shift = DB::table('security_shifts')->where('id', $swap->shift_id)->lockForUpdate()->first();

            if ($v['decision'] === 'approve') {
                $to = $swap->to_driver_id ? Driver::find($swap->to_driver_id) : null;
                $problems = $shift ? Rules::problems($to, $shift, $shift->id) : ['The shift no longer exists.'];
                if ($problems) {
                    return ApiResponse::error('VALIDATION_FAILED', 'Cannot approve: '.implode(' ', $problems), 422, ['swap' => $problems]);
                }
                DB::table('security_shifts')->where('id', $shift->id)->update([
                    'assigned_driver_id' => $to->getKey(), 'assigned_driver_name' => $to->name, 'status' => 'assigned', 'updated_at' => now(),
                ]);
                Rules::notifyDriver($to->getKey(), 'Swap approved', 'You now cover '.$shift->name.' ('.$shift->shift_date_label.').');
                Rules::notifyDriver($swap->from_driver_id, 'Swap approved', 'Your swap for '.$shift->name.' ('.$shift->shift_date_label.') was approved.');
            } elseif ($shift) {
                DB::table('security_shifts')->where('id', $shift->id)->update(['status' => 'assigned', 'updated_at' => now()]);
                Rules::notifyDriver($swap->from_driver_id, 'Swap denied', 'Your swap for '.$shift->name.' ('.$shift->shift_date_label.') was denied; you keep the shift.');
            }

            $status = $v['decision'] === 'approve' ? 'approved' : 'denied';
            DB::table('security_swaps')->where('id', $id)->update([
                'status' => $status, 'admin_notes' => $v['notes'] ?? null,
                'decided_by' => $request->user()?->id, 'decided_at' => now(), 'updated_at' => now(),
            ]);
            $this->audit($request, 'security.swap_decision', ['swap_id' => $id, 'decision' => $status]);

            return ApiResponse::data(['message' => 'Swap request '.$status.'.']);
        });
    }

    public function withdrawSwap(Request $request, int $id): JsonResponse
    {
        return DB::transaction(function () use ($request, $id) {
            $swap = DB::table('security_swaps')->where('id', $id)->lockForUpdate()->first();
            if (! $swap) {
                return $this->notFound('Swap request');
            }
            if ($swap->status !== 'waiting_admin') {
                return ApiResponse::error('CONFLICT', 'Only a pending swap can be withdrawn.', 409);
            }
            DB::table('security_swaps')->where('id', $id)->update(['status' => 'withdrawn', 'updated_at' => now()]);
            DB::table('security_shifts')->where('id', $swap->shift_id)->where('status', 'swap_pending')
                ->update(['status' => 'assigned', 'updated_at' => now()]);
            $this->audit($request, 'security.swap_withdrawn', ['swap_id' => $id]);

            return ApiResponse::data(['message' => 'Swap request withdrawn.']);
        });
    }

    // ───────────────────────── CREDENTIALS ─────────────────────────
    public function credentials(): JsonResponse
    {
        $names = Driver::pluck('name', 'id');
        $shifts = DB::table('security_shifts')->whereIn('status', ['assigned', 'swap_pending'])
            ->where('starts_at', '>=', now())->whereNotNull('assigned_driver_id')->get();

        $impactedIds = [];
        $rows = DB::table('security_credentials')->orderBy('expires_at')->get()->map(function ($c) use ($names, $shifts, &$impactedIds) {
            $c->effective_status = Rules::credentialStatus($c->status, $c->expires_at);
            $c->employee_name = $c->driver_id && isset($names[$c->driver_id]) ? $names[$c->driver_id] : $c->employee_name;
            $c->days_left = (int) now()->startOfDay()->diffInDays(Carbon::parse($c->expires_at), false);
            $hits = $shifts->filter(fn ($s) => $s->assigned_driver_id === $c->driver_id
                && ($c->effective_status === 'suspended' || Carbon::parse($c->expires_at)->endOfDay()->lt(Carbon::parse($s->starts_at))));
            $c->impacted_shift_ids = $hits->pluck('id')->values();
            $impactedIds = array_merge($impactedIds, $c->impacted_shift_ids->all());

            return $c;
        });
        $impacted = count(array_unique($impactedIds));

        return ApiResponse::data([
            'credentials' => $rows,
            'drivers' => Driver::where('is_active', true)->orderBy('name')->get(['id', 'name']),
            'expiring_count' => $rows->whereIn('effective_status', ['suspended', 'expired', 'renewal_due'])->count(),
            'impacted_shifts_count' => $impacted,
            'impacted_shifts_note' => $impacted > 0 ? $impacted.' assigned shift(s) are affected. Review and reassign.' : 'No claimed shifts are affected.',
        ]);
    }

    public function storeCredential(Request $request): JsonResponse
    {
        $v = $request->validate([
            'driver_id' => 'required|string|max:36', 'credential_name' => 'required|string|max:150',
            'expires_at' => 'required|date', 'status' => 'nullable|in:valid,suspended', 'notes' => 'nullable|string|max:1000',
        ]);
        $driver = Driver::find($v['driver_id']);
        if (! $driver) {
            return ApiResponse::error('VALIDATION_FAILED', 'Driver not found.', 422, ['driver_id' => ['Choose a driver from the roster.']]);
        }
        $exp = Carbon::parse($v['expires_at']);
        $id = DB::table('security_credentials')->insertGetId([
            'driver_id' => $driver->getKey(), 'employee_name' => $driver->name, 'credential_name' => $v['credential_name'],
            'expires_at' => $exp->toDateString(), 'expires_label' => $exp->format('D, M j, Y'),
            'status' => $v['status'] ?? 'valid', 'notes' => $v['notes'] ?? null, 'created_at' => now(), 'updated_at' => now(),
        ]);
        $this->audit($request, 'security.credential_created', ['credential_id' => $id, 'driver_id' => $driver->getKey(), 'credential_name' => $v['credential_name']]);

        return ApiResponse::data(['message' => 'Credential recorded.', 'credential' => DB::table('security_credentials')->find($id)], 201);
    }

    public function updateCredential(Request $request, int $id): JsonResponse
    {
        if (! DB::table('security_credentials')->find($id)) {
            return $this->notFound('Credential');
        }
        $v = $request->validate([
            'credential_name' => 'sometimes|string|max:150', 'expires_at' => 'sometimes|date',
            'status' => 'sometimes|in:valid,suspended', 'notes' => 'nullable|string|max:1000',
        ]);
        $update = $v;
        if (isset($v['expires_at'])) {
            $exp = Carbon::parse($v['expires_at']);
            $update['expires_at'] = $exp->toDateString();
            $update['expires_label'] = $exp->format('D, M j, Y');
        }
        DB::table('security_credentials')->where('id', $id)->update($update + ['updated_at' => now()]);
        $this->audit($request, 'security.credential_updated', ['credential_id' => $id, 'fields' => array_keys($v)]);

        return ApiResponse::data(['message' => 'Credential updated.', 'credential' => DB::table('security_credentials')->find($id)]);
    }

    public function destroyCredential(Request $request, int $id): JsonResponse
    {
        $c = DB::table('security_credentials')->find($id);
        if (! $c) {
            return $this->notFound('Credential');
        }
        DB::table('security_credentials')->where('id', $id)->delete();
        $this->audit($request, 'security.credential_deleted', ['credential_id' => $id, 'driver_id' => $c->driver_id]);

        return ApiResponse::data(['message' => 'Credential deleted.']);
    }

    // ───────────────────────── ANNOUNCEMENTS ─────────────────────────
    public function announcements(): JsonResponse
    {
        return ApiResponse::data(['announcements' => DB::table('security_announcements')->orderByDesc('id')->get()]);
    }

    public function storeAnnouncement(Request $request): JsonResponse
    {
        $v = $request->validate(['message' => 'required|string|max:1000']);
        $user = $request->user();

        $id = DB::transaction(function () use ($v, $user) {
            $id = DB::table('security_announcements')->insertGetId([
                'author_name' => $user?->name ?: 'Dispatch', 'author_id' => $user?->id, 'message' => $v['message'],
                'created_at' => now(), 'updated_at' => now(),
            ]);
            Driver::where('is_active', true)->pluck('id')->each(fn ($driverId) => Rules::notifyDriver($driverId, 'Security announcement', $v['message']));

            return $id;
        });
        $this->audit($request, 'security.announcement_posted', ['announcement_id' => $id]);

        return ApiResponse::data(['message' => 'Announcement broadcasted to active drivers.', 'announcement' => DB::table('security_announcements')->find($id)], 201);
    }

    public function updateAnnouncement(Request $request, int $id): JsonResponse
    {
        if (! DB::table('security_announcements')->find($id)) {
            return $this->notFound('Announcement');
        }
        $v = $request->validate(['message' => 'required|string|max:1000']);
        DB::table('security_announcements')->where('id', $id)->update(['message' => $v['message'], 'updated_at' => now()]);
        $this->audit($request, 'security.announcement_updated', ['announcement_id' => $id]);

        return ApiResponse::data(['message' => 'Announcement updated. Notifications already sent are not recalled.', 'announcement' => DB::table('security_announcements')->find($id)]);
    }

    public function destroyAnnouncement(Request $request, int $id): JsonResponse
    {
        if (! DB::table('security_announcements')->find($id)) {
            return $this->notFound('Announcement');
        }
        DB::table('security_announcements')->where('id', $id)->delete();
        $this->audit($request, 'security.announcement_deleted', ['announcement_id' => $id]);

        return ApiResponse::data(['message' => 'Announcement deleted.']);
    }

    // ───────────────────────── helpers ─────────────────────────
    private function leadRules(bool $creating): array
    {
        $req = $creating ? 'required' : 'sometimes';

        return [
            'client_name' => "$req|string|max:150", 'contact_name' => "$req|string|max:150", 'phone' => "$req|string|max:50",
            'email' => 'nullable|email|max:150', 'coverage_type' => 'nullable|string|max:100', 'protecting' => 'nullable|string|max:150',
            'starts_at' => 'nullable|string|max:50', 'hours_per_day' => 'nullable|integer|min:1|max:24', 'frequency' => 'nullable|string|max:100',
            'venue_type' => 'nullable|string|max:100', 'instructions' => 'nullable|string|max:2000',
        ];
    }

    private function contractRules(bool $creating): array
    {
        return [
            'client_name' => ($creating ? 'required' : 'nullable').'|string|max:150', 'contact_name' => 'nullable|string|max:150',
            'site_address' => 'required|string|max:255', 'tier' => 'required|in:T1,T2,T3,T4', 'headcount' => 'required|integer|min:1|max:20',
            'start_date' => 'required|date|after_or_equal:today', 'length_days' => 'required|integer|min:1|max:90',
            'start_time' => ['required', 'regex:/^\d{2}:\d{2}$/'], 'hours_per_shift' => 'required|integer|min:1|max:24',
            'days_of_week' => 'nullable|array', 'days_of_week.*' => 'in:'.implode(',', self::DAYS),
            'is_event_critical' => 'nullable|boolean', 'notes' => 'nullable|string|max:2000',
        ];
    }

    /** Creates the contract and one shift per guard slot per allowed day. Call inside a transaction. */
    private function createContract(array $v, ?int $leadId): int
    {
        $days = $v['days_of_week'] ?? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
        $critical = (bool) ($v['is_event_critical'] ?? false);
        $contractId = DB::table('security_contracts')->insertGetId([
            'client_name' => $v['client_name'], 'contact_name' => $v['contact_name'] ?? null, 'site_address' => $v['site_address'],
            'tier' => $v['tier'], 'headcount' => $v['headcount'], 'start_date' => $v['start_date'], 'length_days' => $v['length_days'],
            'start_time' => $v['start_time'], 'hours_per_shift' => $v['hours_per_shift'], 'days_of_week' => json_encode($days),
            'is_event_critical' => $critical, 'status' => 'active', 'lead_id' => $leadId, 'notes' => $v['notes'] ?? null,
            'created_at' => now(), 'updated_at' => now(),
        ]);

        $horizon = now()->addDays(Rules::RELEASE_HORIZON_DAYS);
        $rows = [];
        for ($i = 0; $i < $v['length_days']; $i++) {
            $date = Carbon::parse($v['start_date'], Rules::TZ)->addDays($i);
            if (! in_array($date->format('D'), $days, true)) {
                continue;
            }
            [$start, $end] = Rules::window($date->toDateString(), $v['start_time'], $v['hours_per_shift']);
            for ($slot = 1; $slot <= $v['headcount']; $slot++) {
                $rows[] = [
                    'contract_id' => $contractId, 'name' => $v['client_name'], 'site_address' => $v['site_address'],
                    'shift_date_label' => Rules::label($start, $end), 'starts_at' => $start, 'ends_at' => $end, 'slot' => $slot,
                    'tier' => $v['tier'], 'status' => $start->lte($horizon) ? 'open' : 'not_released_yet', 'is_critical' => $critical,
                    'created_at' => now(), 'updated_at' => now(),
                ];
            }
        }
        foreach (array_chunk($rows, 200) as $chunk) {
            DB::table('security_shifts')->insert($chunk);
        }

        return $contractId;
    }

    private function audit(Request $request, string $event, array $meta): void
    {
        AuditLog::record($event, $request->user()?->id, $meta, null);
    }

    private function notFound(string $what): JsonResponse
    {
        return ApiResponse::error('NOT_FOUND', $what.' not found.', 404);
    }
}
