<?php

namespace App\Providers;

use App\Models\ApiToken;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        // Opaque bearer tokens: only the SHA-256 hash is stored; expired tokens and inactive users are rejected.
        Auth::viaRequest('api-token', function (Request $request) {
            $plain = $request->bearerToken();
            if (! $plain) {
                return null;
            }

            $token = ApiToken::with('user')
                ->where('token_hash', ApiToken::hash($plain))
                ->where('expires_at', '>', now())
                ->first();

            if (! $token || ! $token->user || ! $token->user->isActive()) {
                return null;
            }

            if (! $token->last_used_at || $token->last_used_at->lt(now()->subMinute())) {
                $token->forceFill(['last_used_at' => now()])->saveQuietly();
            }

            return $token->user;
        });

        RateLimiter::for('login', fn (Request $request) => Limit::perMinute(5)
            ->by(strtolower((string) $request->input('email')).'|'.$request->ip()));

        RateLimiter::for('public-submissions', fn (Request $request) => Limit::perMinute(10)->by($request->ip()));

        RateLimiter::for('customer-code', fn (Request $request) => Limit::perMinutes(10, 5)
            ->by(strtolower((string) $request->input('email')).'|'.$request->ip()));

        RateLimiter::for('customer-code-verify', fn (Request $request) => Limit::perMinutes(10, 10)->by($request->ip()));

        RateLimiter::for('password-recovery', fn (Request $request) => Limit::perMinute(3)
            ->by(strtolower((string) $request->input('email')).'|'.$request->ip()));

        ResetPassword::createUrlUsing(fn ($user, string $token) => rtrim(config('app.admin_url'), '/')
            .'/reset-password?token='.$token.'&email='.urlencode($user->getEmailForPasswordReset()));
    }
}
