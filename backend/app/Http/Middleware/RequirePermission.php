<?php

namespace App\Http\Middleware;

use App\Models\AuditLog;
use App\Support\ApiResponse;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** Usage: ->middleware('permission:dashboard.view'). Any one listed permission grants access. */
class RequirePermission
{
    public function handle(Request $request, Closure $next, string ...$permissions): Response
    {
        $user = $request->user();

        if (! $user) {
            return ApiResponse::error('UNAUTHENTICATED', 'Authentication is required.', 401);
        }

        $held = $user->permissionKeys();
        if (! array_intersect($permissions, $held)) {
            AuditLog::record('access.denied', $user->getKey(), [
                'path' => $request->path(),
                'required' => $permissions,
            ]);

            return ApiResponse::error('FORBIDDEN', 'You do not have permission to perform this action.', 403);
        }

        return $next($request);
    }
}
