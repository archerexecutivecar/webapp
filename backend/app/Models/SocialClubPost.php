<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class SocialClubPost extends Model
{
    protected $table = 'social_club_posts';

    protected $fillable = [
        'title',
        'slug',
        'post_type',
        'category',
        'body',
        'image_url',
        'external_social_url',
        'event_date',
        'event_location',
        'booking_service_type',
        'is_published',
        'published_at',
        'likes_count',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'event_date' => 'date:Y-m-d',
            'is_published' => 'boolean',
            'published_at' => 'datetime',
            'likes_count' => 'integer',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (SocialClubPost $post) {
            if (empty($post->slug)) {
                $post->slug = Str::slug($post->title) . '-' . strtolower(Str::random(5));
            }
            if ($post->is_published && empty($post->published_at)) {
                $post->published_at = now();
            }
        });
    }

    public function comments(): HasMany
    {
        return $this->hasMany(SocialClubComment::class, 'post_id')->orderByDesc('created_at');
    }

    public function approvedComments(): HasMany
    {
        return $this->hasMany(SocialClubComment::class, 'post_id')
            ->where('status', 'approved')
            ->orderByDesc('created_at');
    }
}
