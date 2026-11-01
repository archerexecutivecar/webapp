<?php

namespace App\Http\Controllers;

use App\Http\Requests\Auth\ForgotPasswordRequest;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\ResetPasswordRequest;
use App\Models\ApiToken;
use App\Models\AuditLog;
use App\Models\User;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    public function login(LoginRequest $request): JsonResponse
    {
        $user = User::where('email', $request->input('email'))->first();

        // Compare against a dummy hash for unknown users to keep timing uniform.
        $hash = $user?->password ?? '$2y$12$usesomesillystringfore7hnbRJHxXVLeakoG8K30oukPsA.ztMG';
        $passwordOk = Hash::check($request->input('password'), $hash);

        if (! $user || ! $passwordOk || ! $user->isActive()) {
            AuditLog::record('auth.login_failed', $user?->getKey(), [
                'email_hash' => hash('sha256', Str::lower($request->input('email'))),
                'reason' => ! $user ? 'unknown_user' : (! $passwordOk ? 'bad_password' : 'inactive'),
            ]);

            return ApiResponse::error('INVALID_CREDENTIALS', 'The provided credentials are incorrect.', 401);
        }

        [$plain, $expires] = ApiToken::issueFor($user);
        $user->forceFill(['last_login_at' => now()])->save();
        AuditLog::record('auth.login', $user->getKey());

        return ApiResponse::data([
            'token' => $plain,
            'token_type' => 'Bearer',
            'expires_at' => $expires->toIso8601String(),
            'user' => $this->userPayload($user),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();
        ApiToken::where('token_hash', ApiToken::hash($request->bearerToken()))->delete();
        AuditLog::record('auth.logout', $user->getKey());

        return ApiResponse::data(['message' => 'Logged out.']);
    }

    public function me(Request $request): JsonResponse
    {
        return ApiResponse::data($this->userPayload($request->user()));
    }

    public function forgotPassword(ForgotPasswordRequest $request): JsonResponse
    {
        $status = Password::sendResetLink($request->only('email'));
        AuditLog::record('auth.password_reset_requested', null, [
            'email_hash' => hash('sha256', Str::lower($request->input('email'))),
            'sent' => $status === Password::RESET_LINK_SENT,
        ]);

        // Identical response whether or not the account exists (no enumeration).
        return ApiResponse::data(['message' => 'If the account exists, a reset link has been sent.'], 202);
    }

    public function resetPassword(ResetPasswordRequest $request): JsonResponse
    {
        $resetUser = null;
        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function (User $user, string $password) use (&$resetUser) {
                $user->forceFill(['password' => $password, 'remember_token' => Str::random(60)])->save();
                $user->apiTokens()->delete(); // revoke every session
                $resetUser = $user;
            }
        );

        if ($status !== Password::PASSWORD_RESET) {
            AuditLog::record('auth.password_reset_failed');

            return ApiResponse::error('INVALID_RESET_TOKEN', 'The reset link is invalid or has expired.', 422);
        }

        AuditLog::record('auth.password_reset', $resetUser->getKey());

        return ApiResponse::data(['message' => 'Password has been reset.']);
    }

    private function userPayload(User $user): array
    {
        return [
            'id' => $user->getKey(),
            'name' => $user->name,
            'email' => $user->email,
            'roles' => $user->roleKeys(),
            'permissions' => $user->permissionKeys(),
        ];
    }
}
