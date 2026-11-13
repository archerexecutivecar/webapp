<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use App\Models\ApiToken;
use App\Models\AuditLog;
use App\Models\LoginCode;
use App\Models\User;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;

/**
 * Customer sign-in. Two ways in, both producing the same Bearer token:
 *  - emailed one-time code (no password), handled here
 *  - email + password, handled by the shared POST /v1/auth/login
 */
class CustomerAuthController extends Controller
{
    /** POST /v1/customer/auth/code — always answers the same, so accounts cannot be discovered. */
    public function requestCode(Request $request): JsonResponse
    {
        $email = Str::lower($request->validate(['email' => ['required', 'email', 'max:150']])['email']);

        $user = User::where('email', $email)->first();
        if ($user && $user->isActive() && in_array('customer', $user->roleKeys(), true)) {
            LoginCode::where('email', $email)->whereNull('consumed_at')->update(['consumed_at' => now()]);

            $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
            LoginCode::create([
                'email' => $email,
                'code_hash' => LoginCode::hashCode($email, $code),
                'expires_at' => now()->addMinutes(LoginCode::TTL_MINUTES),
            ]);

            Mail::raw(
                "Your Archer sign-in code is {$code}.\n\nIt expires in ".LoginCode::TTL_MINUTES." minutes. If you didn't ask for it, you can ignore this email.",
                fn ($m) => $m->to($email)->subject('Your Archer sign-in code')
            );
            AuditLog::record('customer.code_requested', $user->getKey());
        }

        return ApiResponse::data(['message' => 'If an Archer account exists for that email, a sign-in code has been sent.'], 202);
    }

    /** POST /v1/customer/auth/code/verify */
    public function verifyCode(Request $request): JsonResponse
    {
        // `password` is optional: when sent, the emailed code (proof of email ownership) also lets the customer
        // choose a password in the same step. It is validated first so a weak password never burns the code.
        $data = $request->validate([
            'email' => ['required', 'email', 'max:150'],
            'code' => ['required', 'digits:6'],
            'password' => ['nullable', 'confirmed', Password::min(10)->letters()->numbers()],
        ]);
        $email = Str::lower($data['email']);
        $invalid = fn () => ApiResponse::error('INVALID_CODE', 'That code is incorrect or has expired. Request a new one.', 422);

        $row = LoginCode::where('email', $email)->whereNull('consumed_at')->where('expires_at', '>', now())->latest('id')->first();
        if (! $row || $row->attempts >= LoginCode::MAX_ATTEMPTS) {
            return $invalid();
        }

        if (! hash_equals($row->code_hash, LoginCode::hashCode($email, $data['code']))) {
            $row->increment('attempts');
            AuditLog::record('customer.code_failed', null, ['email_hash' => hash('sha256', $email)]);

            return $invalid();
        }

        $user = User::where('email', $email)->first();
        if (! $user || ! $user->isActive()) {
            return $invalid();
        }

        $row->forceFill(['consumed_at' => now()])->save();
        $user->forceFill(['email_verified_at' => $user->email_verified_at ?? now(), 'last_login_at' => now()]);
        if (! empty($data['password'])) {
            $user->forceFill(['password' => $data['password'], 'password_set_at' => now()]);
            $user->apiTokens()->delete(); // choosing a new password signs out every other device
            AuditLog::record('customer.password_set', $user->getKey(), ['via' => 'email_code']);
        }
        $user->save();
        [$plain, $expires] = ApiToken::issueFor($user);
        AuditLog::record('customer.login_code', $user->getKey());

        return ApiResponse::data([
            'token' => $plain,
            'token_type' => 'Bearer',
            'expires_at' => $expires->toIso8601String(),
            'user' => $this->payload($user),
        ]);
    }

    /** PUT /v1/customer/password — set or change a password (optional; the emailed code always works). */
    public function setPassword(Request $request): JsonResponse
    {
        $user = $request->user();
        $rules = ['password' => ['required', 'confirmed', Password::min(10)->letters()->numbers()]];
        if ($user->password_set_at) {
            $rules['current_password'] = ['required', 'string'];
        }
        $data = $request->validate($rules);

        if ($user->password_set_at && ! Hash::check($data['current_password'], $user->password)) {
            return ApiResponse::error('INVALID_CREDENTIALS', 'The current password is incorrect.', 422);
        }

        $user->forceFill(['password' => $data['password'], 'password_set_at' => now()])->save();
        // Sign out every other session; keep this one.
        $current = ApiToken::hash((string) $request->bearerToken());
        $user->apiTokens()->where('token_hash', '!=', $current)->delete();
        AuditLog::record('customer.password_set', $user->getKey());

        return ApiResponse::data(['message' => 'Password saved.', 'has_password' => true]);
    }

    public static function payload(User $user): array
    {
        return [
            'id' => $user->getKey(),
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'has_password' => $user->password_set_at !== null,
            'roles' => $user->roleKeys(),
        ];
    }
}
