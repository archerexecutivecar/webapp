<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Corrects Tier 4 hourly rates for Sedan vs SUV (BUG-009 / Archer Pricing Logic for Developers, Nov 15, 2026):
 * Compact/Mid-size SUVs ("sedan" size key: Traverse, Aviator) are $190 and $210 at Tier 4.
 * Full-size SUVs ("suv" size key: Suburban, Escalade) are $215 and $235 at Tier 4.
 */
return new class extends Migration
{
    public function up(): void
    {
        $now = now();

        $corrections = [
            // Executive Class
            ['kind' => 'hourly', 'vehicle_class' => 'exec', 'size' => 'sedan', 'tier' => 4, 'amount_cents' => 19000],
            ['kind' => 'hourly', 'vehicle_class' => 'exec', 'size' => 'suv', 'tier' => 4, 'amount_cents' => 21500],

            // 1st Class
            ['kind' => 'hourly', 'vehicle_class' => 'first', 'size' => 'sedan', 'tier' => 4, 'amount_cents' => 21000],
            ['kind' => 'hourly', 'vehicle_class' => 'first', 'size' => 'suv', 'tier' => 4, 'amount_cents' => 23500],
        ];

        foreach ($corrections as $row) {
            DB::table('rate_cards')->where([
                'kind' => $row['kind'],
                'vehicle_class' => $row['vehicle_class'],
                'size' => $row['size'],
                'tier' => $row['tier'],
            ])->update([
                'amount_cents' => $row['amount_cents'],
                'updated_at' => $now,
            ]);
        }
    }

    public function down(): void
    {
        $now = now();

        $revert = [
            ['kind' => 'hourly', 'vehicle_class' => 'exec', 'size' => 'sedan', 'tier' => 4, 'amount_cents' => 21500],
            ['kind' => 'hourly', 'vehicle_class' => 'exec', 'size' => 'suv', 'tier' => 4, 'amount_cents' => 19000],
            ['kind' => 'hourly', 'vehicle_class' => 'first', 'size' => 'sedan', 'tier' => 4, 'amount_cents' => 23500],
            ['kind' => 'hourly', 'vehicle_class' => 'first', 'size' => 'suv', 'tier' => 4, 'amount_cents' => 21000],
        ];

        foreach ($revert as $row) {
            DB::table('rate_cards')->where([
                'kind' => $row['kind'],
                'vehicle_class' => $row['vehicle_class'],
                'size' => $row['size'],
                'tier' => $row['tier'],
            ])->update([
                'amount_cents' => $row['amount_cents'],
                'updated_at' => $now,
            ]);
        }
    }
};
