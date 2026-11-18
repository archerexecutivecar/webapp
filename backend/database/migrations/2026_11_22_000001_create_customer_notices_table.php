<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('customer_notices', function (Blueprint $table) {
            $table->id();
            $table->uuid('ride_id')->nullable();
            $table->string('ride_reference')->nullable()->index();
            $table->string('recipient_name');
            $table->string('recipient_phone')->nullable();
            $table->string('recipient_email')->nullable();
            $table->string('channel')->default('SMS'); // "SMS + email", "SMS", "email"
            $table->string('trigger'); // "allocated", "on_my_way", "at_your_doorstep"
            $table->string('trigger_label'); // "Allocated", "On my way", "At your doorstep"
            $table->text('message');
            $table->string('status')->default('logged'); // "logged", "sent"
            $table->timestamp('sent_at')->useCurrent();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customer_notices');
    }
};
