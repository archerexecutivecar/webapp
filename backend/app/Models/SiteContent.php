<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Keyed JSON document for public-site copy (home, service pages, hero slides, settings). */
class SiteContent extends Model
{
    protected $table = 'site_content';

    protected $primaryKey = 'key';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = ['key', 'data'];

    protected $casts = ['data' => 'array'];

    /** Keys Admin may edit. Anything else is rejected. */
    public static function allowedKey(string $key): bool
    {
        return in_array($key, ['home', 'settings', 'fleet', 'tiers'], true) || (bool) preg_match('/^service\.[a-z0-9-]+$/', $key);
    }
}
