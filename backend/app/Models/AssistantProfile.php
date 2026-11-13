<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class AssistantProfile extends Model
{
    use HasUuids;

    protected $fillable = [
        'reference', 'first_name', 'last_name', 'email', 'mobile', 'company',
        'data', 'terms_accepted_at', 'idempotency_key', 'status',
    ];

    protected function casts(): array
    {
        return ['data' => 'array', 'terms_accepted_at' => 'datetime'];
    }
}
