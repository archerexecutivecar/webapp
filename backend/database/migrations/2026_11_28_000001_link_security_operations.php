<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/* See docs/SECURITY_OPERATIONS_RULES.md (CHG-2026-11-19). Additive: no existing data is removed. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('security_leads', function (Blueprint $table) {
            // Website security requests only know part of what a staff-entered lead captures.
            $table->string('coverage_type')->nullable()->change();
            $table->string('protecting')->nullable()->change();
            $table->string('starts_at')->nullable()->change();
            $table->string('frequency')->nullable()->change();
            $table->string('venue_type')->nullable()->change();
            $table->string('email')->nullable()->after('phone');
            $table->string('source', 20)->default('admin')->after('status'); // admin | website
            $table->uuid('ride_request_id')->nullable()->unique()->after('source');
            $table->unsignedBigInteger('contract_id')->nullable()->index()->after('ride_request_id');
            $table->timestamp('converted_at')->nullable();
        });

        Schema::table('security_contracts', function (Blueprint $table) {
            $table->string('status', 20)->default('active')->after('is_event_critical'); // active | cancelled | completed
            $table->unsignedBigInteger('lead_id')->nullable()->index()->after('status');
            $table->text('notes')->nullable();
        });

        Schema::table('security_shifts', function (Blueprint $table) {
            $table->dateTime('starts_at')->nullable()->index()->after('shift_date_label'); // UTC
            $table->dateTime('ends_at')->nullable()->after('starts_at');
            $table->unsignedSmallInteger('slot')->default(1)->after('ends_at');
        });

        Schema::table('security_swaps', function (Blueprint $table) {
            $table->string('from_driver_id', 36)->nullable()->after('shift_time_label');
            $table->string('to_driver_id', 36)->nullable()->after('from_driver_name');
            $table->text('reason')->nullable();
            $table->unsignedBigInteger('decided_by')->nullable();
            $table->timestamp('decided_at')->nullable();
        });

        Schema::table('security_credentials', function (Blueprint $table) {
            $table->text('notes')->nullable();
        });

        Schema::table('security_announcements', function (Blueprint $table) {
            $table->unsignedBigInteger('author_id')->nullable()->after('author_name');
        });
    }

    public function down(): void
    {
        Schema::table('security_announcements', fn (Blueprint $t) => $t->dropColumn('author_id'));
        Schema::table('security_credentials', fn (Blueprint $t) => $t->dropColumn('notes'));
        Schema::table('security_swaps', fn (Blueprint $t) => $t->dropColumn(['from_driver_id', 'to_driver_id', 'reason', 'decided_by', 'decided_at']));
        Schema::table('security_shifts', fn (Blueprint $t) => $t->dropColumn(['starts_at', 'ends_at', 'slot']));
        Schema::table('security_contracts', fn (Blueprint $t) => $t->dropColumn(['status', 'lead_id', 'notes']));
        Schema::table('security_leads', fn (Blueprint $t) => $t->dropColumn(['email', 'source', 'ride_request_id', 'contract_id', 'converted_at']));
    }
};
