<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ServiceType extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $table = 'service_types';

    protected $fillable = [
        'slug',
        'name',
        'tagline',
        'description',
        'badge',
        'icon',
        'image_url',
        'features',
        'min_hours',
        'sort_order',
        'is_active',
        'meta',
    ];

    protected $casts = [
        'features' => 'array',
        'meta' => 'array',
        'is_active' => 'boolean',
        'min_hours' => 'integer',
        'sort_order' => 'integer',
    ];

    public function scopeActive($query)
    {
        return $query->where('is_active', true)->orderBy('sort_order', 'asc');
    }
}
