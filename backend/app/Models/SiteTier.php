<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

/** Public-website tier card (driver or security). Display content only; booking logic uses DriverTier. */
class SiteTier extends Model
{
    use HasUuids;

    protected $table = 'site_tiers';

    protected $fillable = ['kind', 'tier', 'label', 'title', 'call_only', 'credentials', 'suited_for', 'sort_order', 'is_active'];

    protected $casts = [
        'tier' => 'integer', 'call_only' => 'boolean', 'credentials' => 'array', 'suited_for' => 'array',
        'sort_order' => 'integer', 'is_active' => 'boolean',
    ];
}
