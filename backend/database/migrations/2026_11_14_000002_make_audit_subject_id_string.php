<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * audit_logs.subject_id was an unsigned bigint, but ride requests, drivers, vehicles and the new site-content
 * tables use UUID primary keys. MySQL (strict mode) rejected the UUID with "Data truncated for column
 * 'subject_id'", so the audit insert threw a 500 AFTER the booking had been saved. Widen it to hold either.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('audit_logs', function (Blueprint $table) {
            $table->string('subject_id', 64)->nullable()->change();
        });
    }

    public function down(): void
    {
        // Intentionally not reversed: narrowing would truncate UUID subjects.
    }
};
