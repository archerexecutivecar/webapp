<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SocialClubMember extends Model
{
    protected $table = 'social_club_members';

    protected $fillable = [
        'first_name',
        'last_name',
        'email',
        'mobile',
        'town_zip',
        'interests',
        'reach_preference',
        'consent_accepted',
    ];

    protected function casts(): array
    {
        return [
            'interests' => 'array',
            'consent_accepted' => 'boolean',
        ];
    }
}
