<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Role;
use App\Models\User;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    /**
     * v1 metrics are limited to tables that exist (users, roles, audit logs).
     * Ride/driver/payment metrics arrive with their modules (RBAC_PROPOSAL decision 7).
     */
    public function show(Request $request): JsonResponse
    {
        $user = $request->user();

        $data = [
            'staff_users' => [
                'total' => User::count(),
                'active' => User::where('status', User::STATUS_ACTIVE)->count(),
                'suspended' => User::where('status', User::STATUS_SUSPENDED)->count(),
            ],
            'users_by_role' => Role::withCount('users')->orderBy('key')->get()
                ->map(fn (Role $r) => ['role' => $r->key, 'name' => $r->name, 'users' => $r->users_count])
                ->all(),
            'security' => [
                'failed_logins_24h' => AuditLog::where('event', 'auth.login_failed')
                    ->where('created_at', '>=', now()->subDay())->count(),
                'successful_logins_24h' => AuditLog::where('event', 'auth.login')
                    ->where('created_at', '>=', now()->subDay())->count(),
            ],
        ];

        if ($user->hasPermission('audit.view')) {
            $data['recent_audit_events'] = $this->recentEvents($user)->map(fn (AuditLog $a) => [
                'id' => $a->id,
                'event' => $a->event,
                'actor_id' => $a->actor_id,
                'created_at' => $a->created_at->toIso8601String(),
            ])->all();
        }

        return ApiResponse::data($data, 200, ['generated_at' => now()->toIso8601String()]);
    }

    private function recentEvents(User $user)
    {
        $query = AuditLog::query()->latest('id')->limit(10);

        // Financial-only applies when every audit-capable role the user holds is restricted.
        $auditRoles = Role::whereIn('key', $user->roleKeys())
            ->whereHas('permissions', fn ($q) => $q->where('key', 'audit.view'))
            ->pluck('key')->all();

        if (! array_diff($auditRoles, config('rbac.audit_financial_only_roles'))) {
            $query->where(function ($q) {
                foreach (config('rbac.financial_event_prefixes') as $prefix) {
                    $q->orWhere('event', 'like', $prefix.'%');
                }
            });
        }

        return $query->get();
    }
}
