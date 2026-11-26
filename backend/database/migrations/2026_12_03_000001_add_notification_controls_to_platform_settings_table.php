<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (! Schema::hasTable('platform_settings')) {
            return;
        }

        Schema::table('platform_settings', function (Blueprint $table) {
            if (! Schema::hasColumn('platform_settings', 'email_notifications_enabled')) {
                // Disabled by default during testing so no test emails reach actual customers.
                $table->boolean('email_notifications_enabled')->default(false)->after('customer_notice_channel');
            }
            if (! Schema::hasColumn('platform_settings', 'phone_notifications_enabled')) {
                $table->boolean('phone_notifications_enabled')->default(true)->after('email_notifications_enabled');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('platform_settings')) {
            return;
        }

        Schema::table('platform_settings', function (Blueprint $table) {
            $cols = array_values(array_filter([
                Schema::hasColumn('platform_settings', 'email_notifications_enabled') ? 'email_notifications_enabled' : null,
                Schema::hasColumn('platform_settings', 'phone_notifications_enabled') ? 'phone_notifications_enabled' : null,
            ]));
            if ($cols !== []) {
                $table->dropColumn($cols);
            }
        });
    }
};
