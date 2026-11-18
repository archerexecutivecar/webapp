<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('integration_settings', function (Blueprint $table) {
            $table->id();
            $table->string('google_maps_browser_key')->nullable();
            $table->text('google_maps_server_key')->nullable();
            $table->string('stripe_publishable_key')->nullable();
            $table->text('stripe_secret_key')->nullable();
            $table->text('stripe_webhook_secret')->nullable();
            $table->string('sms_provider')->nullable();
            $table->text('sms_api_key')->nullable();
            $table->string('docusign_integration_key')->nullable();
            $table->text('docusign_secret')->nullable();
            $table->string('docusign_account_id')->nullable();
            $table->string('payment_provider')->default('stripe');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('integration_settings');
    }
};