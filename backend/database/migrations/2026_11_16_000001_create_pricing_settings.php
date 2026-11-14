<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/**
 * Admin-configurable pricing rules per bookable service (decisions recorded 2026-11-14 in docs/PRICING_ENGINE_PLAN.md).
 * Money is integer cents; percentages are basis points (1% = 100). Every new charge defaults to 0 so nothing is
 * charged until Admin sets it. Only values already published are carried over: $10 booking fee, 4h hourly minimum,
 * 3h Client Car minimum (current server validation) and the 20% suggested gratuity.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pricing_settings', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('service', 20)->unique(); // hourly | airport | p2p | client | security
            $table->string('pricing_mode', 10)->default('hourly'); // hourly | per_mile
            $table->unsignedSmallInteger('min_hours')->nullable();
            $table->unsignedSmallInteger('min_miles')->nullable();
            $table->unsignedInteger('booking_fee_cents')->default(0);
            $table->unsignedInteger('stop_fee_cents')->default(0);
            $table->unsignedSmallInteger('max_stops')->nullable(); // null = no limit
            $table->unsignedInteger('per_passenger_cents')->default(0);
            $table->unsignedSmallInteger('included_passengers')->default(0);
            $table->unsignedInteger('per_bag_cents')->default(0);
            $table->unsignedSmallInteger('included_bags')->default(0);
            $table->string('guard_hours_mode', 10)->default('ride'); // ride = billed for ride hours | custom = hours entered
            $table->unsignedSmallInteger('guard_min_hours')->nullable();
            $table->unsignedSmallInteger('tax_bp')->default(0);
            $table->boolean('tax_includes_fees')->default(false);
            $table->unsignedSmallInteger('card_fee_bp')->default(0);
            $table->unsignedSmallInteger('gratuity_suggested_bp')->default(0); // shown, never added to the total
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        $now = now();
        $rows = [
            'hourly' => ['min_hours' => 4],
            'airport' => [],
            'p2p' => [],
            'client' => ['min_hours' => 3],
            'security' => [],
        ];
        foreach ($rows as $service => $extra) {
            DB::table('pricing_settings')->insert($extra + [
                'id' => (string) Str::uuid(), 'service' => $service, 'pricing_mode' => 'hourly',
                'booking_fee_cents' => 1000, 'gratuity_suggested_bp' => 2000,
                'created_at' => $now, 'updated_at' => $now,
            ]);
        }

        // Per-mile rate rows (class × size × tier) exist but stay inactive at $0 until Admin enters real rates.
        foreach (['exec', 'first'] as $class) {
            foreach (['sedan', 'suv', 'van'] as $size) {
                foreach ([1, 2, 3, 4] as $tier) {
                    DB::table('rate_cards')->insertOrIgnore([
                        'id' => (string) Str::uuid(), 'kind' => 'per_mile', 'vehicle_class' => $class, 'size' => $size,
                        'tier' => $tier, 'amount_cents' => 0, 'is_active' => false, 'created_at' => $now, 'updated_at' => $now,
                    ]);
                }
            }
        }
    }

    public function down(): void
    {
        DB::table('rate_cards')->where('kind', 'per_mile')->delete();
        Schema::dropIfExists('pricing_settings');
    }
};
