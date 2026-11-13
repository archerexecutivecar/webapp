<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DriverTier extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'name',
        'slug',
        'tier_code',
        'subtitle',
        'description',
        'multiplier',
        'sort_order',
        'is_active',
    ];

    protected $casts = [
        'multiplier' => 'float',
        'sort_order' => 'integer',
        'is_active' => 'boolean',
    ];

    public function drivers()
    {
        return $this->hasMany(Driver::class, 'tier_id');
    }
}
