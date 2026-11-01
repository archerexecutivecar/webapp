<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class CmsPage extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $table = 'cms_pages';

    protected $fillable = [
        'slug',
        'title',
        'meta_title',
        'meta_description',
        'og_image_url',
        'status',
        'published_at',
    ];

    protected $casts = [
        'published_at' => 'datetime',
    ];

    public function sections(): HasMany
    {
        return $this->hasMany(CmsSection::class, 'cms_page_id')->orderBy('sort_order', 'asc');
    }
}
