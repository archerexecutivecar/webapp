<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    public const STATUS_ACTIVE = 'active';

    public const STATUS_SUSPENDED = 'suspended';

    protected $attributes = ['status' => self::STATUS_ACTIVE];

    /** status/last_login_at are deliberately not mass assignable. */
    protected $fillable = [
        'name',
        'email',
        'password',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'last_login_at' => 'datetime',
            'password_set_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Role::class);
    }

    public function rideRequests(): HasMany
    {
        return $this->hasMany(RideRequest::class, 'customer_id');
    }

    public function apiTokens(): HasMany
    {
        return $this->hasMany(ApiToken::class);
    }

    public function isActive(): bool
    {
        return $this->status === self::STATUS_ACTIVE;
    }

    /** @return list<string> */
    public function roleKeys(): array
    {
        return $this->roles()->pluck('key')->all();
    }

    /** Union of permissions across all roles; an inactive user has none. */
    public function permissionKeys(): array
    {
        if (! $this->isActive()) {
            return [];
        }

        return Permission::query()
            ->whereHas('roles.users', fn ($q) => $q->whereKey($this->getKey()))
            ->pluck('key')
            ->unique()
            ->values()
            ->all();
    }

    public function hasPermission(string $key): bool
    {
        return in_array($key, $this->permissionKeys(), true);
    }
}
