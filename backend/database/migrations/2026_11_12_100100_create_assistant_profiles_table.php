<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('assistant_profiles', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('reference')->unique(); // e.g. "AST-7K2M9Q"
            $table->string('first_name');
            $table->string('last_name');
            $table->string('email');
            $table->string('mobile');
            $table->string('company')->nullable();
            // About / company / billing preferences and the people the assistant books for.
            // Never holds card data: cards are entered on Square's page only.
            $table->json('data');
            $table->timestamp('terms_accepted_at');
            $table->string('idempotency_key', 100)->nullable()->unique();
            $table->string('status')->default('active');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('assistant_profiles');
    }
};
