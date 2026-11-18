<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Sprinter trip-fare rows (Rates · Point to point) did not exist, so unticking "Sprinters priced hourly" left
 * Sprinter trips with no rate and no way to add one in Admin. The rows are created inactive at $0, like the
 * per-mile rows: nothing is charged or quoted from them until Admin enters a real amount and switches them on.
 */
return new class extends Migration
{
    public function up(): void
    {
        $now = now();
        foreach (['exec', 'first'] as $class) {
            foreach ([1, 2, 3, 4] as $tier) {
                DB::table('rate_cards')->insertOrIgnore([
                    'id' => (string) Str::uuid(), 'kind' => 'point_to_point', 'vehicle_class' => $class, 'size' => 'van',
                    'tier' => $tier, 'amount_cents' => 0, 'is_active' => false, 'created_at' => $now, 'updated_at' => $now,
                ]);
            }
        }
    }

    public function down(): void
    {
        // Only the placeholder rows are removed; a row Admin has priced or switched on is kept.
        DB::table('rate_cards')->where('kind', 'point_to_point')->where('size', 'van')
            ->where('amount_cents', 0)->where('is_active', false)->delete();
    }
};
