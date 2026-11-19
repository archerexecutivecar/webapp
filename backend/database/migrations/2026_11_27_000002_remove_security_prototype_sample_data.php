<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/*
 * The security phase 2 migration and SecuritySuiteController once inserted prototype sample rows
 * (invented clients, drivers and credentials). This removes exactly those rows by their full seeded
 * signature, so any real data entered by staff is left untouched. Irreversible for the sample rows only.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('security_swaps')) {
            DB::table('security_swaps')
                ->where('shift_name', 'Shore Day Camp (sample)')
                ->where('from_driver_name', 'Paul Malesky')
                ->where('to_driver_name', 'Joseph Klein')
                ->delete();
        }

        if (Schema::hasTable('security_shifts')) {
            $contractIds = Schema::hasTable('security_contracts')
                ? DB::table('security_contracts')
                    ->where('client_name', 'Shore Day Camp')
                    ->where('contact_name', 'Camp Director')
                    ->where('site_address', '40 Seaview Ave, Monmouth Beach, NJ')
                    ->pluck('id')->all()
                : [];

            DB::table('security_shifts')
                ->where(function ($q) use ($contractIds) {
                    $q->where('name', 'Shore Day Camp (sample)')
                        ->where('site_address', '40 Seaview Ave, Monmouth Beach, NJ');
                    if ($contractIds) {
                        $q->orWhereIn('contract_id', $contractIds);
                    }
                })
                ->orWhere(fn ($q) => $q->where('name', 'Gala door coverage')
                    ->where('site_address', 'Navesink Country Club, Red Bank, NJ')
                    ->whereNull('contract_id'))
                ->delete();

            if ($contractIds) {
                DB::table('security_contracts')->whereIn('id', $contractIds)->delete();
            }
        }

        if (Schema::hasTable('security_leads')) {
            DB::table('security_leads')->where(fn ($q) => $q->where('client_name', 'St. Agnes Parish')
                ->where('contact_name', 'Rev. Thomas Avery')->where('phone', '(732) 555-0161'))
                ->orWhere(fn ($q) => $q->where('client_name', 'Pike Events Co.')
                    ->where('contact_name', 'Jordan Pike')->where('phone', '(646) 555-0110'))
                ->delete();
        }

        if (Schema::hasTable('security_credentials')) {
            DB::table('security_credentials')->where(fn ($q) => $q->where('employee_name', 'Chris Jaeger')
                ->where('credential_name', 'SOAR certification')->whereNull('driver_id'))
                ->orWhere(fn ($q) => $q->where('employee_name', 'Paul Malesky')
                    ->where('credential_name', 'Carry permit')->whereNull('driver_id'))
                ->delete();
        }

        if (Schema::hasTable('security_announcements')) {
            DB::table('security_announcements')
                ->where('author_name', 'Dispatch')
                ->where('message', 'Reminder: SOAR renewals are due before the end of the month. Upload your new card in the app.')
                ->delete();
        }
    }

    public function down(): void
    {
        // Intentionally empty: sample data is not restored.
    }
};
