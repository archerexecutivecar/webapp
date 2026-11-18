<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::dropIfExists('security_announcements');
        Schema::dropIfExists('security_credentials');
        Schema::dropIfExists('security_swaps');
        Schema::dropIfExists('security_shifts');
        Schema::dropIfExists('security_contracts');
        Schema::dropIfExists('security_leads');

        // 1. Security Leads
        Schema::create('security_leads', function (Blueprint $table) {
            $table->id();
            $table->string('client_name');
            $table->string('contact_name');
            $table->string('phone');
            $table->string('status')->default('new'); // new, contacted, in_progress, converted
            $table->string('coverage_type');
            $table->string('protecting');
            $table->string('starts_at');
            $table->integer('hours_per_day')->default(8);
            $table->string('frequency');
            $table->string('venue_type');
            $table->text('instructions')->nullable();
            $table->string('client_estimate_text')->nullable();
            $table->timestamps();
        });

        // 2. Security Contracts
        Schema::create('security_contracts', function (Blueprint $table) {
            $table->id();
            $table->string('client_name');
            $table->string('contact_name')->nullable();
            $table->string('site_address');
            $table->string('tier')->default('T2');
            $table->integer('headcount')->default(1);
            $table->date('start_date');
            $table->integer('length_days')->default(5);
            $table->string('start_time')->default('09:00');
            $table->integer('hours_per_shift')->default(8);
            $table->json('days_of_week')->nullable();
            $table->boolean('is_event_critical')->default(false);
            $table->timestamps();
        });

        // 3. Security Shifts
        Schema::create('security_shifts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('contract_id')->nullable()->constrained('security_contracts')->nullOnDelete();
            $table->string('name');
            $table->string('site_address');
            $table->string('shift_date_label'); // e.g. "Thu, Nov 19, 9:00 AM to 4:00 PM"
            $table->string('tier')->default('T2');
            $table->string('assigned_driver_id')->nullable()->index();
            $table->string('assigned_driver_name')->nullable();
            $table->string('status')->default('open'); // completed, open, not_released_yet, swap_pending
            $table->boolean('is_critical')->default(false);
            $table->timestamps();
        });

        // 4. Security Swaps
        Schema::create('security_swaps', function (Blueprint $table) {
            $table->id();
            $table->foreignId('shift_id')->constrained('security_shifts')->cascadeOnDelete();
            $table->string('shift_name');
            $table->string('shift_time_label');
            $table->string('from_driver_name');
            $table->string('to_driver_name');
            $table->string('to_driver_tier');
            $table->string('status')->default('waiting_admin'); // waiting_admin, approved, denied
            $table->text('admin_notes')->nullable();
            $table->timestamps();
        });

        // 5. Security Credentials
        Schema::create('security_credentials', function (Blueprint $table) {
            $table->id();
            $table->string('driver_id')->nullable()->index();
            $table->string('employee_name');
            $table->string('credential_name');
            $table->string('expires_label'); // e.g. "Mon, Nov 23 (4 days)"
            $table->date('expires_at');
            $table->string('status')->default('valid'); // suspended, renewal_due, valid
            $table->timestamps();
        });

        // 6. Security Announcements
        Schema::create('security_announcements', function (Blueprint $table) {
            $table->id();
            $table->string('author_name')->default('Dispatch');
            $table->text('message');
            $table->timestamps();
        });

        // Populate sample data matching Screenshots 12, 13, 14, 15, 16
        DB::table('security_leads')->insert([
            [
                'client_name' => 'St. Agnes Parish',
                'contact_name' => 'Rev. Thomas Avery',
                'phone' => '(732) 555-0161',
                'status' => 'new',
                'coverage_type' => 'Ongoing Site Coverage',
                'protecting' => 'protecting building',
                'starts_at' => '2026-11-20',
                'hours_per_day' => 5,
                'frequency' => 'Weekly',
                'venue_type' => 'Religious buildings',
                'instructions' => 'Weekend services and Wednesday evening events. Want a visible, calm presence at the main entrance.',
                'client_estimate_text' => '2 × T1 = $450/day (not a quote)',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'client_name' => 'Pike Events Co.',
                'contact_name' => 'Jordan Pike',
                'phone' => '(646) 555-0110',
                'status' => 'contacted',
                'coverage_type' => 'Corporate',
                'protecting' => 'protecting folks',
                'starts_at' => '2026-12-05',
                'hours_per_day' => 8,
                'frequency' => 'Single day',
                'venue_type' => 'Corporate events',
                'instructions' => 'Product launch. 500 guests; one VIP speaker with arrival and departure.',
                'client_estimate_text' => '2 × T1 + 1 × T2 + 1 × T3 + vehicles = $1,840/day (not a quote)',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);

        $contractId = DB::table('security_contracts')->insertGetId([
            'client_name' => 'Shore Day Camp',
            'contact_name' => 'Camp Director',
            'site_address' => '40 Seaview Ave, Monmouth Beach, NJ',
            'tier' => 'T2',
            'headcount' => 1,
            'start_date' => '2026-11-17',
            'length_days' => 14,
            'start_time' => '09:00',
            'hours_per_shift' => 7,
            'days_of_week' => json_encode(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']),
            'is_event_critical' => false,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('security_shifts')->insert([
            [
                'contract_id' => $contractId,
                'name' => 'Shore Day Camp (sample)',
                'site_address' => '40 Seaview Ave, Monmouth Beach, NJ',
                'shift_date_label' => 'Tue, Nov 17, 9:00 AM to 4:00 PM',
                'tier' => 'T2',
                'assigned_driver_id' => null,
                'assigned_driver_name' => null,
                'status' => 'completed',
                'is_critical' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'contract_id' => $contractId,
                'name' => 'Shore Day Camp (sample)',
                'site_address' => '40 Seaview Ave, Monmouth Beach, NJ',
                'shift_date_label' => 'Wed, Nov 18, 9:00 AM to 4:00 PM',
                'tier' => 'T2',
                'assigned_driver_id' => null,
                'assigned_driver_name' => null,
                'status' => 'completed',
                'is_critical' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'contract_id' => $contractId,
                'name' => 'Shore Day Camp (sample)',
                'site_address' => '40 Seaview Ave, Monmouth Beach, NJ',
                'shift_date_label' => 'Thu, Nov 19, 9:00 AM to 4:00 PM',
                'tier' => 'T2',
                'assigned_driver_id' => null,
                'assigned_driver_name' => null,
                'status' => 'open',
                'is_critical' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'contract_id' => null,
                'name' => 'Gala door coverage',
                'site_address' => 'Navesink Country Club, Red Bank, NJ',
                'shift_date_label' => 'Fri, Nov 20, 7:17 PM to 1:17 AM',
                'tier' => 'T3',
                'assigned_driver_id' => null,
                'assigned_driver_name' => null,
                'status' => 'open',
                'is_critical' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'contract_id' => $contractId,
                'name' => 'Shore Day Camp (sample)',
                'site_address' => '40 Seaview Ave, Monmouth Beach, NJ',
                'shift_date_label' => 'Fri, Nov 20, 9:00 AM to 4:00 PM',
                'tier' => 'T2',
                'assigned_driver_id' => null,
                'assigned_driver_name' => 'Chris Jaeger',
                'status' => 'assigned',
                'is_critical' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'contract_id' => $contractId,
                'name' => 'Shore Day Camp (sample)',
                'site_address' => '40 Seaview Ave, Monmouth Beach, NJ',
                'shift_date_label' => 'Mon, Nov 23, 9:00 AM to 4:30 PM',
                'tier' => 'T2',
                'assigned_driver_id' => null,
                'assigned_driver_name' => 'Paul Malesky · swap',
                'status' => 'swap_pending',
                'is_critical' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'contract_id' => $contractId,
                'name' => 'Shore Day Camp (sample)',
                'site_address' => '40 Seaview Ave, Monmouth Beach, NJ',
                'shift_date_label' => 'Tue, Nov 24, 9:00 AM to 4:00 PM',
                'tier' => 'T2',
                'assigned_driver_id' => null,
                'assigned_driver_name' => null,
                'status' => 'open',
                'is_critical' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);

        $swapShift = DB::table('security_shifts')->where('status', 'swap_pending')->first();
        if ($swapShift) {
            DB::table('security_swaps')->insert([
                'shift_id' => $swapShift->id,
                'shift_name' => 'Shore Day Camp (sample)',
                'shift_time_label' => 'Mon, Nov 23, 9:00 AM – 4:30 PM · needs T2',
                'from_driver_name' => 'Paul Malesky',
                'to_driver_name' => 'Joseph Klein',
                'to_driver_tier' => 'T1',
                'status' => 'waiting_admin',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        DB::table('security_credentials')->insert([
            [
                'driver_id' => null,
                'employee_name' => 'Chris Jaeger',
                'credential_name' => 'SOAR certification',
                'expires_label' => 'Mon, Nov 23 (4 days)',
                'expires_at' => '2026-11-23',
                'status' => 'suspended',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'driver_id' => null,
                'employee_name' => 'Paul Malesky',
                'credential_name' => 'Carry permit',
                'expires_label' => 'Thu, Dec 10 (21 days)',
                'expires_at' => '2026-12-10',
                'status' => 'renewal_due',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);

        DB::table('security_announcements')->insert([
            [
                'author_name' => 'Dispatch',
                'message' => 'Reminder: SOAR renewals are due before the end of the month. Upload your new card in the app.',
                'created_at' => '2026-11-17 09:11:00',
                'updated_at' => '2026-11-17 09:11:00',
            ],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('security_announcements');
        Schema::dropIfExists('security_credentials');
        Schema::dropIfExists('security_swaps');
        Schema::dropIfExists('security_shifts');
        Schema::dropIfExists('security_contracts');
        Schema::dropIfExists('security_leads');
    }
};
