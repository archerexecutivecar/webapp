<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SocialClubComment extends Model
{
    public $timestamps = false;

    protected $table = 'social_club_comments';

    protected $fillable = [
        'post_id',
        'author_name',
        'body',
        'status',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
        ];
    }
}
