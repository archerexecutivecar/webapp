<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PayrollDisbursement extends Model
{
    use HasFactory;

    protected $fillable = [
        'driver_id',
        'pay_week_start',
        'pay_week_end',
        'gross_earnings',
        'cash_deductions',
        'carried_balance',
        'net_amount',
        'payment_method',
        'reference_number',
        'disbursed_at',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'gross_earnings' => 'float',
        'cash_deductions' => 'float',
        'carried_balance' => 'float',
        'net_amount' => 'float',
        'disbursed_at' => 'datetime',
    ];

    public function driver(): BelongsTo
    {
        return $this->belongsTo(Driver::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
