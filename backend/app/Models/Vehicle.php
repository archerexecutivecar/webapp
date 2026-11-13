<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Vehicle extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'name',
        'slug',
        'class_type',
        'category',
        'form_value',
        'passengers',
        'luggage',
        'image_url',
        'availability',
        'availability_label',
        'sort_order',
        'is_active',
    ];

    protected $casts = [
        'passengers' => 'integer',
        'luggage' => 'integer',
        'sort_order' => 'integer',
        'is_active' => 'boolean',
    ];
}
