<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class CmsTestimonial extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $table = 'cms_testimonials';

    protected $fillable = [
        'client_name',
        'client_title',
        'service_tag',
        'quote',
        'rating',
        'avatar_url',
        'sort_order',
        'is_active',
    ];

    protected $casts = [
        'rating' => 'integer',
        'sort_order' => 'integer',
        'is_active' => 'boolean',
    ];
}
