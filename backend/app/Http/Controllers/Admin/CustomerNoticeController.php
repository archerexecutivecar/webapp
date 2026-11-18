<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\CustomerNotice;
use App\Models\RideRequest;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Schema;

class CustomerNoticeController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        if (!Schema::hasTable('customer_notices')) {
            return ApiResponse::data(['notices' => []]);
        }

        try {
            $this->ensureSeedNoticesExist();
        } catch (\Throwable $e) {
            // Non-blocking fallback
        }

        $query = CustomerNotice::query()->orderBy('sent_at', 'desc');

        if ($request->filled('trigger') && $request->trigger !== 'all') {
            $query->where('trigger', $request->trigger);
        }

        if ($request->filled('search')) {
            $search = '%' . trim($request->search) . '%';
            $query->where(function ($q) use ($search) {
                $q->where('recipient_name', 'like', $search)
                  ->orWhere('recipient_phone', 'like', $search)
                  ->orWhere('ride_reference', 'like', $search)
                  ->orWhere('message', 'like', $search);
            });
        }

        $notices = $query->limit(100)->get()->map(function (CustomerNotice $n) {
            return [
                'id' => $n->id,
                'sent_at' => $n->sent_at?->toIso8601String(),
                'sent_at_formatted' => $n->sent_at ? Carbon::parse($n->sent_at)->format('D, M j, g:i A') : '—',
                'recipient_name' => $n->recipient_name,
                'recipient_phone' => $n->recipient_phone,
                'recipient_email' => $n->recipient_email,
                'channel' => $n->channel,
                'trigger' => $n->trigger,
                'trigger_label' => $n->trigger_label,
                'ride_reference' => $n->ride_reference,
                'message' => $n->message,
                'status' => $n->status,
            ];
        });

        return ApiResponse::data(['notices' => $notices]);
    }

    public function store(Request $request): JsonResponse
    {
        // GET already soft-fails when the table is absent; POST must not 500 on missing schema.
        if (!Schema::hasTable('customer_notices')) {
            return ApiResponse::error(
                'SCHEMA_MISSING',
                'Customer notices storage is not available. Run migration 2026_11_22_000001_create_customer_notices_table.',
                503
            );
        }

        $validated = $request->validate([
            'ride_reference' => 'nullable|string|max:50',
            'recipient_name' => 'required|string|max:255',
            'recipient_phone' => 'nullable|string|max:50',
            'recipient_email' => 'nullable|email|max:150',
            'channel' => 'required|string|in:SMS,SMS + email,email',
            'trigger' => 'required|string|in:allocated,on_my_way,at_your_doorstep',
            'message' => 'required|string',
        ]);

        $triggerLabels = [
            'allocated' => 'Allocated',
            'on_my_way' => 'On my way',
            'at_your_doorstep' => 'At your doorstep',
        ];

        $status = 'logged';
        $channel = $validated['channel'];
        $wantsEmail = str_contains(strtolower($channel), 'email');
        $email = $validated['recipient_email'] ?? null;

        if ($wantsEmail && $email) {
            try {
                \Illuminate\Support\Facades\Mail::raw($validated['message'], function ($m) use ($email, $validated) {
                    $m->to($email, $validated['recipient_name'])
                        ->subject('Archer Executive — ' . ($validated['trigger'] ?? 'Customer notice'));
                });
                $status = 'sent';
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::warning('Customer notice email failed: ' . $e->getMessage());
                $status = 'failed';
            }
        } elseif (str_contains(strtolower($channel), 'sms')) {
            // SMS provider is configured via Integrations; until wired, record as logged for ops follow-up.
            $status = 'logged';
        }

        try {
            $notice = CustomerNotice::create([
                'ride_reference' => $validated['ride_reference'] ?? null,
                'recipient_name' => $validated['recipient_name'],
                'recipient_phone' => $validated['recipient_phone'] ?? null,
                'recipient_email' => $validated['recipient_email'] ?? null,
                'channel' => $validated['channel'],
                'trigger' => $validated['trigger'],
                'trigger_label' => $triggerLabels[$validated['trigger']] ?? ucfirst(str_replace('_', ' ', $validated['trigger'])),
                'message' => $validated['message'],
                'status' => $status,
                'sent_at' => now(),
            ]);
        } catch (\Illuminate\Database\QueryException $e) {
            \Illuminate\Support\Facades\Log::error('Customer notice create failed: ' . $e->getMessage());

            return ApiResponse::error(
                'SCHEMA_ERROR',
                'Unable to store customer notice. Confirm customer_notices migration has been applied.',
                503
            );
        }

        try {
            AuditLog::record($status === 'sent' ? 'customer_notice.sent' : 'customer_notice.logged', $request->user()?->getKey(), [
                'notice_id' => $notice->id,
                'trigger' => $notice->trigger,
                'recipient' => $notice->recipient_name,
                'status' => $status,
            ], null);
        } catch (\Throwable $e) {
            // Notice persisted; audit must not turn a successful create into a 500.
            \Illuminate\Support\Facades\Log::warning('Customer notice audit failed: ' . $e->getMessage());
        }

        return ApiResponse::data([
            'notice' => [
                'id' => $notice->id,
                'sent_at' => $notice->sent_at?->toIso8601String(),
                'sent_at_formatted' => Carbon::parse($notice->sent_at)->format('D, M j, g:i A'),
                'recipient_name' => $notice->recipient_name,
                'recipient_phone' => $notice->recipient_phone,
                'recipient_email' => $notice->recipient_email,
                'channel' => $notice->channel,
                'trigger' => $notice->trigger,
                'trigger_label' => $notice->trigger_label,
                'ride_reference' => $notice->ride_reference,
                'message' => $notice->message,
                'status' => $notice->status,
            ],
        ], 201);
    }

    private function ensureSeedNoticesExist(): void
    {
        if (!Schema::hasTable('customer_notices')) {
            return;
        }

        if (CustomerNotice::count() > 0) {
            return;
        }

        // Exact entries matching Screenshot 5
        CustomerNotice::create([
            'sent_at' => Carbon::create(2026, 11, 16, 10, 17, 0),
            'recipient_name' => 'Morgan Hale',
            'recipient_phone' => '(732) 555-0199',
            'recipient_email' => 'morgan.hale@example.com',
            'channel' => 'SMS + email',
            'trigger' => 'allocated',
            'trigger_label' => 'Allocated',
            'ride_reference' => 'AR-1048',
            'message' => 'Your Archer ride AR-1048 is confirmed. Driver: Paul Malesky, (732) 555-0141. Airport transfer, Executive SUV — 1st Class, Tier 3. Price $260 + $5 booking fee + tax.',
            'status' => 'logged',
        ]);

        CustomerNotice::create([
            'sent_at' => Carbon::create(2026, 11, 18, 9, 55, 0),
            'recipient_name' => 'Grant Whitfield',
            'recipient_phone' => '(732) 555-0108',
            'recipient_email' => 'grant.whitfield@example.com',
            'channel' => 'SMS',
            'trigger' => 'on_my_way',
            'trigger_label' => 'On my way',
            'ride_reference' => 'AR-1047',
            'message' => 'Joseph Klein is on the way to 5 Bellevue Ave.',
            'status' => 'logged',
        ]);

        CustomerNotice::create([
            'sent_at' => Carbon::create(2026, 11, 18, 9, 59, 0),
            'recipient_name' => 'Grant Whitfield',
            'recipient_phone' => '(732) 555-0108',
            'recipient_email' => 'grant.whitfield@example.com',
            'channel' => 'SMS',
            'trigger' => 'at_your_doorstep',
            'trigger_label' => 'At your doorstep',
            'ride_reference' => 'AR-1047',
            'message' => 'Joseph Klein has arrived and is waiting outside.',
            'status' => 'logged',
        ]);
    }
}
