<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class RateCard extends Model
{
    use HasUuids;

    protected $table = 'rate_cards';

    protected $fillable = ['kind', 'vehicle_class', 'size', 'tier', 'amount_cents', 'is_active'];

    protected $casts = ['tier' => 'integer', 'amount_cents' => 'integer', 'is_active' => 'boolean'];
}
