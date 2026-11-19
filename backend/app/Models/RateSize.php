<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RateSize extends Model
{
    protected $table = 'rate_sizes';

    protected $primaryKey = 'key';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = ['key', 'name', 'sort_order', 'is_active'];

    protected $casts = ['sort_order' => 'integer', 'is_active' => 'boolean'];
}
