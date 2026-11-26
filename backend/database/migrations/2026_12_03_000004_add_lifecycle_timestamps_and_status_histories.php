<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('ride_requests')) {
            Schema::table('ride_requests', function (Blueprint $table) {
                if (! Schema::hasColumn('ride_requests', 'accepted_at')) {
                    $table->timestamp('accepted_at')->nullable()->index()->after('status');
                }
                if (! Schema::hasColumn('ride_requests', 'scheduled_at')) {
                    $table->timestamp('scheduled_at')->nullable()->index()->after('accepted_at');
                }
                if (! Schema::hasColumn('ride_requests', 'completed_at')) {
                    $table->timestamp('completed_at')->nullable()->index()->after('scheduled_at');
                }
                if (! Schema::hasColumn('ride_requests', 'cancelled_at')) {
                    $table->timestamp('cancelled_at')->nullable()->index()->after('completed_at');
                }
            });

            // Backfill lifecycle timestamps for existing rides
            DB::table('ride_requests')->orderBy('created_at')->chunk(100, function ($rides) {
                foreach ($rides as $ride) {
                    $updates = [];
                    if (! $ride->scheduled_at && $ride->ride_date) {
                        try {
                            $dt = trim($ride->ride_date.' '.($ride->ride_time ?: '00:00'));
                            $updates['scheduled_at'] = Carbon::parse($dt);
                        } catch (\Throwable) {
                            // Ignore unparseable legacy date strings
                        }
                    }

                    $status = strtolower((string) $ride->status);
                    if (! $ride->accepted_at && in_array($status, ['accepted', 'dispatched', 'driver_assigned', 'on_my_way', 'at_doorstep', 'ride_started', 'in_progress', 'ride_ended', 'close_out', 'completed'], true)) {
                        $updates['accepted_at'] = $ride->updated_at ?? $ride->created_at;
                    }
                    if (! $ride->completed_at && $status === 'completed') {
                        $updates['completed_at'] = $ride->updated_at ?? $ride->created_at;
                    }
                    if (! $ride->cancelled_at && $status === 'cancelled') {
                        $updates['cancelled_at'] = $ride->updated_at ?? $ride->created_at;
                    }

                    if ($updates !== []) {
                        DB::table('ride_requests')->where('id', $ride->id)->update($updates);
                    }
                }
            });
        }

        if (! Schema::hasTable('ride_status_histories')) {
            Schema::create('ride_status_histories', function (Blueprint $table) {
                $table->id();
                $table->uuid('ride_request_id')->index();
                $table->string('from_status', 40)->nullable();
                $table->string('to_status', 40)->index();
                $table->unsignedBigInteger('changed_by_user_id')->nullable()->index();
                $table->text('notes')->nullable();
                $table->timestamp('created_at')->useCurrent()->index();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('ride_status_histories');

        if (Schema::hasTable('ride_requests')) {
            Schema::table('ride_requests', function (Blueprint $table) {
                $cols = array_values(array_filter([
                    Schema::hasColumn('ride_requests', 'accepted_at') ? 'accepted_at' : null,
                    Schema::hasColumn('ride_requests', 'scheduled_at') ? 'scheduled_at' : null,
                    Schema::hasColumn('ride_requests', 'completed_at') ? 'completed_at' : null,
                    Schema::hasColumn('ride_requests', 'cancelled_at') ? 'cancelled_at' : null,
                ]));
                if ($cols !== []) {
                    $table->dropColumn($cols);
                }
            });
        }
    }
};
