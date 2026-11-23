<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class CareerJob extends Model
{
    use HasFactory;

    protected $table = 'career_jobs';

    protected $fillable = [
        'title',
        'slug',
        'department',
        'location',
        'employment_type',
        'salary_range',
        'tier_recommendation',
        'summary',
        'description',
        'requirements',
        'benefits',
        'status',
        'sort_order',
        'created_by',
    ];

    protected $casts = [
        'requirements' => 'array',
        'benefits' => 'array',
        'sort_order' => 'integer',
    ];

    protected static function booted(): void
    {
        static::creating(function (CareerJob $job) {
            if (empty($job->slug)) {
                $base = Str::slug($job->title);
                $slug = $base;
                $i = 1;
                while (static::where('slug', $slug)->exists()) {
                    $slug = "{$base}-{$i}";
                    $i++;
                }
                $job->slug = $slug;
            }
        });
    }

    public function applications(): HasMany
    {
        return $this->hasMany(CareerApplication::class, 'career_job_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function scopePublished($query)
    {
        return $query->where('status', 'published');
    }
}
