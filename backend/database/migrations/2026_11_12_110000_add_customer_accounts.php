<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('phone', 50)->nullable()->after('email');
            // Null = the customer has never chosen a password and signs in with an emailed code.
            $table->timestamp('password_set_at')->nullable()->after('password');
        });

        Schema::table('ride_requests', function (Blueprint $table) {
            // The customer account that owns this request (linked by email at booking time).
            $table->foreignId('customer_id')->nullable()->after('assigned_driver_id')->constrained('users')->nullOnDelete();
        });

        Schema::create('login_codes', function (Blueprint $table) {
            $table->id();
            $table->string('email')->index();
            $table->string('code_hash', 64); // HMAC of the 6-digit code; the code itself is never stored
            $table->timestamp('expires_at');
            $table->unsignedTinyInteger('attempts')->default(0);
            $table->timestamp('consumed_at')->nullable();
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('login_codes');
        Schema::table('ride_requests', function (Blueprint $table) {
            $table->dropConstrainedForeignId('customer_id');
        });
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['phone', 'password_set_at']);
        });
    }
};
