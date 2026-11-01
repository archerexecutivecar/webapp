<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class ApiToken extends Model
{
    protected $fillable = ['user_id', 'token_hash', 'expires_at'];

    protected function casts(): array
    {
        return ['expires_at' => 'datetime', 'last_used_at' => 'datetime'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public static function hash(string $plain): string
    {
        return hash('sha256', $plain);
    }

    /** Issues a token; only the SHA-256 hash is stored. Returns the plain value once. */
    public static function issueFor(User $user): array
    {
        $plain = Str::random(64);
        $expires = now()->addMinutes((int) config('auth.api_token_ttl_minutes'));

        static::create([
            'user_id' => $user->getKey(),
            'token_hash' => static::hash($plain),
            'expires_at' => $expires,
        ]);

        return [$plain, $expires];
    }
}
