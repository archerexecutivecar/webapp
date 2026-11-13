<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('driver_notifications', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->char('driver_id', 36);
            $table->char('ride_request_id', 36)->nullable();
            $table->string('title');
            $table->text('message');
            $table->string('type')->default('assignment'); // assignment, status_change, broadcast
            $table->boolean('is_read')->default(false);
            $table->timestamps();

            $table->foreign('driver_id')->references('id')->on('drivers')->cascadeOnDelete();
            $table->foreign('ride_request_id')->references('id')->on('ride_requests')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('driver_notifications');
    }
};
