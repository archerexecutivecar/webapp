<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('platform_settings', function (Blueprint $table) {
            $table->id();
            $table->integer('min_booking_notice_hours')->default(48);
            $table->integer('unaccepted_alert_hours')->default(24);
            $table->integer('cancellation_window_hours')->default(24);
            $table->string('customer_notice_channel')->default('SMS + email');
            $table->string('driver_btn_step1')->default('On my way');
            $table->string('driver_btn_step2')->default('At your doorstep');
            $table->string('driver_btn_step3')->default('Ride started');
            $table->string('driver_btn_step4')->default('Ride ends');
            $table->timestamps();
        });

        // Insert default production row
        DB::table('platform_settings')->insert([
            'min_booking_notice_hours' => 48,
            'unaccepted_alert_hours' => 24,
            'cancellation_window_hours' => 24,
            'customer_notice_channel' => 'SMS + email',
            'driver_btn_step1' => 'On my way',
            'driver_btn_step2' => 'At your doorstep',
            'driver_btn_step3' => 'Ride started',
            'driver_btn_step4' => 'Ride ends',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('platform_settings');
    }
};
