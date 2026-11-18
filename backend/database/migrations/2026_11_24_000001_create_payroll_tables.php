<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::dropIfExists('payroll_disbursements');
        Schema::create('payroll_disbursements', function (Blueprint $table) {
            $table->id();
            $table->string('driver_id')->index();
            $table->string('pay_week_start'); // e.g. 2026-11-16
            $table->string('pay_week_end');   // e.g. 2026-11-22
            $table->decimal('gross_earnings', 10, 2);
            $table->decimal('cash_deductions', 10, 2)->default(0.00);
            $table->decimal('carried_balance', 10, 2)->default(0.00);
            $table->decimal('net_amount', 10, 2);
            $table->string('payment_method')->default('check'); // check, ach
            $table->string('reference_number')->nullable();
            $table->timestamp('disbursed_at')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payroll_disbursements');
    }
};
