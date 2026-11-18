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
        'plate',
        'slug',
        'class_type',
        'category',
        'form_value',
        'passengers',
        'luggage',
        'image_url',
        'availability',
        'availability_label',
        'available_from',
        'available_until',
        'available_days',
        'is_out_of_service',
        'sort_order',
        'is_active',
    ];

    protected $casts = [
        'passengers' => 'integer',
        'luggage' => 'integer',
        'sort_order' => 'integer',
        'is_active' => 'boolean',
        'is_out_of_service' => 'boolean',
        'available_days' => 'array',
    ];

    public function blockouts()
    {
        return $this->hasMany(VehicleBlockout::class, 'vehicle_id');
    }
}
