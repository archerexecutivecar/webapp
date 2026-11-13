<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LoginCode extends Model
{
    public const UPDATED_AT = null;

    public const MAX_ATTEMPTS = 5;

    public const TTL_MINUTES = 10;

    protected $fillable = ['email', 'code_hash', 'expires_at', 'attempts', 'consumed_at'];

    protected function casts(): array
    {
        return ['expires_at' => 'datetime', 'consumed_at' => 'datetime'];
    }

    /** Keyed hash so a database leak does not reveal usable codes. */
    public static function hashCode(string $email, string $code): string
    {
        return hash_hmac('sha256', strtolower($email).'|'.$code, (string) config('app.key'));
    }
}
