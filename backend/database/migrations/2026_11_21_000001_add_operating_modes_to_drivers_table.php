<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('drivers', function (Blueprint $table) {
            // The 3 Server-Authoritative Operating Switches (Screenshot 4)
            $table->boolean('is_fleet_operator')->default(true)->after('is_active');
            $table->boolean('is_client_car_operator')->default(true)->after('is_fleet_operator');
            $table->boolean('is_owner_operator')->default(false)->after('is_client_car_operator');

            // Owner-operator vehicle registry
            $table->string('owner_vehicle_model')->nullable()->after('is_owner_operator');
            $table->string('owner_vehicle_class')->nullable()->after('owner_vehicle_model'); // e.g. "Executive Class · SUV"
            $table->string('owner_vehicle_plate')->nullable()->after('owner_vehicle_class');
            $table->date('owner_vehicle_reg_expires')->nullable()->after('owner_vehicle_plate');
            $table->date('owner_vehicle_ins_expires')->nullable()->after('owner_vehicle_reg_expires');
            $table->boolean('owner_vehicle_inspected')->default(false)->after('owner_vehicle_ins_expires');

            // Compliance radar & scheduling
            $table->json('compliance_credentials')->nullable()->after('owner_vehicle_inspected');
            $table->string('availability_schedule')->nullable()->after('compliance_credentials');
        });
    }

    public function down(): void
    {
        Schema::table('drivers', function (Blueprint $table) {
            $table->dropColumn([
                'is_fleet_operator',
                'is_client_car_operator',
                'is_owner_operator',
                'owner_vehicle_model',
                'owner_vehicle_class',
                'owner_vehicle_plate',
                'owner_vehicle_reg_expires',
                'owner_vehicle_ins_expires',
                'owner_vehicle_inspected',
                'compliance_credentials',
                'availability_schedule',
            ]);
        });
    }
};
