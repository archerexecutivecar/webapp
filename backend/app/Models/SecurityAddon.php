<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SecurityAddon extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'name',
        'form_value',
        'guards_count',
        'description',
        'hourly_rate',
        'sort_order',
        'is_active',
    ];

    protected $casts = [
        'guards_count' => 'integer',
        'hourly_rate' => 'float',
        'sort_order' => 'integer',
        'is_active' => 'boolean',
    ];
}
