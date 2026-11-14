<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

/** Public-website fleet card. Display content only; booking logic uses Vehicle. */
class SiteVehicle extends Model
{
    use HasUuids;

    protected $table = 'site_vehicles';

    protected $fillable = ['vehicle_class', 'size', 'size_label', 'model', 'blurb', 'passengers', 'bags', 'image_url', 'image_alt', 'sort_order', 'is_active'];

    protected $casts = ['passengers' => 'integer', 'bags' => 'integer', 'sort_order' => 'integer', 'is_active' => 'boolean'];
}
