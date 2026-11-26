<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('cancellation_reasons')) {
            Schema::create('cancellation_reasons', function (Blueprint $table) {
                $table->id();
                $table->string('label', 150)->unique();
                $table->boolean('is_active')->default(true);
                $table->unsignedBigInteger('created_by')->nullable();
                $table->timestamps();
            });

            $now = now();
            $defaults = [
                'Client requested cancellation',
                'Flight cancelled or delayed',
                'No chauffeur available',
                'Duplicate booking',
                'Passenger no-show',
                'Weather / operational safety',
            ];

            foreach ($defaults as $label) {
                DB::table('cancellation_reasons')->insert([
                    'label' => $label,
                    'is_active' => true,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }
        }

        if (Schema::hasTable('ride_requests') && ! Schema::hasColumn('ride_requests', 'cancellation_reason')) {
            Schema::table('ride_requests', function (Blueprint $table) {
                $table->string('cancellation_reason', 255)->nullable()->after('cancelled_at');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('ride_requests') && Schema::hasColumn('ride_requests', 'cancellation_reason')) {
            Schema::table('ride_requests', function (Blueprint $table) {
                $table->dropColumn('cancellation_reason');
            });
        }

        Schema::dropIfExists('cancellation_reasons');
    }
};
