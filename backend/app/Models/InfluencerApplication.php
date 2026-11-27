<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class InfluencerApplication extends Model
{
    use HasFactory;

    protected $table = 'influencer_applications';

    protected $fillable = [
        'reference_code',
        'full_name',
        'email',
        'phone',
        'city',
        'instagram_handle',
        'tiktok_handle',
        'youtube_handle',
        'follower_count',
        'portfolio_url',
        'resume_path',
        'resume_name',
        'cover_note',
        'details',
        'status',
        'internal_notes',
    ];

    protected function casts(): array
    {
        return [
            'details' => 'array',
        ];
    }

    public const VALID_STATUSES = [
        'new',
        'screening',
        'interview',
        'offer',
        'hired',
        'rejected',
        'withdrawn',
    ];

    protected static function booted(): void
    {
        static::creating(function (InfluencerApplication $app) {
            if (empty($app->reference_code)) {
                $app->reference_code = 'INF-' . strtoupper(Str::random(8));
            }
        });
    }
}
