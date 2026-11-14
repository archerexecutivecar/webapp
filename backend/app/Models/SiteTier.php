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

    /** Lets driver views show the tier as `name`, e.g. "TIER 2 · EXECUTIVE". */
    protected $appends = ['name'];

    protected $casts = [
        'tier' => 'integer', 'call_only' => 'boolean', 'credentials' => 'array', 'suited_for' => 'array',
        'sort_order' => 'integer', 'is_active' => 'boolean',
    ];

    /** Short display name used where a driver's tier is shown, e.g. "TIER 2 · EXECUTIVE". */
    public function getNameAttribute(): string
    {
        return (string) $this->label;
    }
}
