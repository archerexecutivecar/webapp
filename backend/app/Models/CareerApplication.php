<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class CareerApplication extends Model
{
    use HasFactory;

    protected $table = 'career_applications';

    protected $fillable = [
        'career_job_id',
        'reference_code',
        'full_name',
        'email',
        'phone',
        'city',
        'selected_tier',
        'license_number',
        'years_experience',
        'cover_note',
        'details',
        'status',
        'internal_notes',
        'rejection_reason',
    ];

    protected $casts = [
        'years_experience' => 'integer',
        'details' => 'array',
    ];

    public const STATUS_NEW = 'new';
    public const STATUS_SCREENING = 'screening';
    public const STATUS_INTERVIEW = 'interview';
    public const STATUS_OFFER = 'offer';
    public const STATUS_HIRED = 'hired';
    public const STATUS_REJECTED = 'rejected';
    public const STATUS_WITHDRAWN = 'withdrawn';

    public const VALID_STATUSES = [
        self::STATUS_NEW,
        self::STATUS_SCREENING,
        self::STATUS_INTERVIEW,
        self::STATUS_OFFER,
        self::STATUS_HIRED,
        self::STATUS_REJECTED,
        self::STATUS_WITHDRAWN,
    ];

    protected static function booted(): void
    {
        static::creating(function (CareerApplication $app) {
            if (empty($app->reference_code)) {
                $app->reference_code = 'APP-' . strtoupper(Str::random(8));
            }
        });
    }

    public function job(): BelongsTo
    {
        return $this->belongsTo(CareerJob::class, 'career_job_id');
    }

    public function documents(): HasMany
    {
        return $this->hasMany(CareerApplicationDocument::class, 'career_application_id');
    }
}
