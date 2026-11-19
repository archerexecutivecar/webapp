<?php

namespace Tests\Feature\Api;

use App\Models\Driver;
use App\Models\DriverNotification;
use Database\Seeders\SiteContentSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Tests\Support\CreatesStaff;
use Tests\Support\SeedsOperationalFleet;
use Tests\TestCase;

/** Rules under test: docs/SECURITY_OPERATIONS_RULES.md */
class SecuritySuiteTest extends TestCase
{
    use RefreshDatabase, CreatesStaff, SeedsOperationalFleet;

    private const BASE = '/api/v1/admin/security';

    private array $h = [];

    protected function setUp(): void
    {
        parent::setUp();
        [, $this->h] = $this->actingAsRole('super_admin');
    }

    private function api(string $method, string $path, array $data = [])
    {
        return $this->withHeaders($this->h)->json($method, self::BASE.$path, $data);
    }

    private function driver(string $name = 'Alex Guard', int $tier = 3, bool $active = true): Driver
    {
        return Driver::create(['name' => $name, 'bio' => 'x', 'service_tier' => $tier, 'is_active' => $active]);
    }

    private function lead(array $over = []): int
    {
        return DB::table('security_leads')->insertGetId($over + [
            'client_name' => 'Acme Corp', 'contact_name' => 'Pat Doe', 'phone' => '5550100', 'status' => 'new', 'source' => 'admin',
            'created_at' => now(), 'updated_at' => now(),
        ]);
    }

    private function contract(array $over = []): int
    {
        return $this->api('POST', '/contracts', $over + [
            'client_name' => 'Highland Manor', 'contact_name' => 'D. Stern', 'site_address' => '100 Manor Ln, Rumson, NJ',
            'tier' => 'T2', 'headcount' => 1, 'start_date' => now()->addDays(3)->toDateString(), 'length_days' => 1,
            'start_time' => '09:00', 'hours_per_shift' => 7, 'days_of_week' => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        ])->assertCreated()->json('data.contract_id');
    }

    private function firstShift(int $contractId): object
    {
        return DB::table('security_shifts')->where('contract_id', $contractId)->orderBy('id')->first();
    }

    // ── baseline / authorization ──
    public function test_fresh_install_has_no_sample_data_and_pages_do_not_reseed(): void
    {
        foreach (['leads', 'contracts', 'swaps', 'credentials', 'announcements'] as $page) {
            $this->api('GET', '/'.$page)->assertOk();
        }
        foreach (['security_leads', 'security_contracts', 'security_shifts', 'security_swaps', 'security_credentials', 'security_announcements'] as $t) {
            $this->assertSame(0, DB::table($t)->count(), "$t should start empty");
        }
        $this->api('GET', '/contracts')->assertJsonPath('data.alert_message', null);
    }

    public function test_view_only_role_can_read_but_not_mutate(): void
    {
        [, $this->h] = $this->actingAsRole('dispatcher');
        $this->api('GET', '/leads')->assertOk();
        $this->api('POST', '/leads', ['client_name' => 'x', 'contact_name' => 'y', 'phone' => '1'])->assertForbidden();
        $this->api('POST', '/announcements', ['message' => 'x'])->assertForbidden();
    }

    // ── leads ──
    public function test_lead_crud_and_status_rules(): void
    {
        $id = $this->api('POST', '/leads', ['client_name' => 'Parish', 'contact_name' => 'Rev', 'phone' => '555', 'email' => 'a@b.co'])
            ->assertCreated()->json('data.lead.id');
        $this->api('PUT', "/leads/$id", ['contact_name' => 'Reverend'])->assertOk();
        $this->assertSame('Reverend', DB::table('security_leads')->where('id', $id)->value('contact_name'));

        $this->api('PUT', "/leads/$id/status", ['status' => 'contacted'])->assertOk();
        $this->api('PUT', "/leads/$id/status", ['status' => 'converted'])->assertStatus(422);
        $this->api('PUT', '/leads/99999/status', ['status' => 'lost'])->assertNotFound();
        $this->api('GET', "/leads/$id")->assertOk()->assertJsonPath('data.lead.client_name', 'Parish');
        $this->api('DELETE', "/leads/$id")->assertOk();
        $this->assertSame(0, DB::table('security_leads')->count());
    }

    public function test_lead_converts_to_contract_with_one_shift_per_guard_and_is_then_locked(): void
    {
        $lead = $this->lead();
        $res = $this->api('POST', "/leads/$lead/convert", [
            'site_address' => '1 Main St', 'tier' => 'T2', 'headcount' => 2, 'start_date' => now()->addDays(2)->toDateString(),
            'length_days' => 1, 'start_time' => '08:00', 'hours_per_shift' => 8, 'days_of_week' => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        ])->assertCreated();
        $contractId = $res->json('data.contract_id');

        $this->assertSame(2, DB::table('security_shifts')->where('contract_id', $contractId)->count());
        $this->assertSame(['Acme Corp'], DB::table('security_contracts')->pluck('client_name')->all());
        $row = DB::table('security_leads')->find($lead);
        $this->assertSame('converted', $row->status);
        $this->assertSame($contractId, (int) $row->contract_id);

        $this->api('POST', "/leads/$lead/convert", ['site_address' => 'x', 'tier' => 'T1', 'headcount' => 1, 'start_date' => now()->addDay()->toDateString(), 'length_days' => 1, 'start_time' => '08:00', 'hours_per_shift' => 4])->assertStatus(409);
        $this->api('PUT', "/leads/$lead", ['phone' => '1'])->assertStatus(409);
        $this->api('PUT', "/leads/$lead/status", ['status' => 'new'])->assertStatus(409);
        $this->api('DELETE', "/leads/$lead")->assertStatus(409);

        // Deleting the (unworked) contract releases the lead back to the pipeline.
        $this->api('DELETE', "/contracts/$contractId")->assertOk();
        $row = DB::table('security_leads')->find($lead);
        $this->assertSame('in_progress', $row->status);
        $this->assertNull($row->contract_id);
    }

    public function test_website_security_booking_creates_one_linked_lead_and_other_bookings_do_not(): void
    {
        $this->seed(SiteContentSeeder::class);
        $this->seedOperationalFleet();
        $contact = ['first_name' => 'Ada', 'last_name' => 'Lovelace', 'email' => 'ada@example.com', 'phone' => '(732) 555-0100', 'terms_accepted' => true];
        $date = now()->addDays(5)->format('Y-m-d');

        $this->postJson('/api/v1/booking-requests', $contact + [
            'request_type' => 'general', 'service' => 'security', 'pickup_address' => '1 Main St', 'date' => $date, 'time' => '09:30',
            'passengers' => 1, 'tier' => 2, 'guards' => 2,
        ])->assertStatus(201);
        $this->postJson('/api/v1/booking-requests', $contact + [
            'request_type' => 'point_to_point', 'way' => 'one', 'pickup_address' => 'A', 'dropoff_address' => 'B', 'date' => $date,
            'time' => '09:30', 'passengers' => 1, 'tier' => 1, 'vehicle_class' => 'exec', 'vehicle_size' => 'suv',
        ])->assertStatus(201);

        $leads = DB::table('security_leads')->get();
        $this->assertCount(1, $leads);
        $this->assertSame('website', $leads[0]->source);
        $this->assertNotNull($leads[0]->ride_request_id);
        $this->assertNotNull($this->api('GET', '/leads')->json('data.leads.0.ride_reference'));
    }

    // ── contracts ──
    public function test_contract_generation_release_horizon_and_daily_release_command(): void
    {
        $id = $this->contract(['start_date' => now()->addDays(20)->toDateString(), 'length_days' => 1]);
        $shift = $this->firstShift($id);
        $this->assertSame('not_released_yet', $shift->status);
        $this->assertNotNull($shift->starts_at);
        $this->assertSame(7, (int) round(Carbon::parse($shift->starts_at)->diffInMinutes($shift->ends_at) / 60));

        Carbon::setTestNow(now()->addDays(10));
        $this->artisan('security:release-shifts')->assertSuccessful();
        Carbon::setTestNow();
        $this->assertSame('open', DB::table('security_shifts')->where('id', $shift->id)->value('status'));
    }

    public function test_contract_update_propagates_cancel_notifies_and_lifecycle_guards(): void
    {
        $driver = $this->driver();
        $id = $this->contract();
        $shift = $this->firstShift($id);
        $this->api('PUT', "/shifts/{$shift->id}/assign", ['driver_id' => $driver->id])->assertOk();

        $this->api('PUT', "/contracts/$id", ['client_name' => 'Renamed Co', 'site_address' => '9 New Rd'])->assertOk();
        $this->assertSame('Renamed Co', DB::table('security_shifts')->where('id', $shift->id)->value('name'));
        $this->api('DELETE', "/contracts/$id")->assertStatus(409); // has an assigned shift
        $this->api('GET', "/contracts/$id")->assertOk()->assertJsonCount(1, 'data.shifts');

        $this->api('POST', "/contracts/$id/cancel")->assertOk();
        $this->assertSame('cancelled', DB::table('security_shifts')->where('id', $shift->id)->value('status'));
        $this->assertSame('cancelled', DB::table('security_contracts')->where('id', $id)->value('status'));
        $this->assertTrue(DriverNotification::where('driver_id', $driver->id)->where('title', 'Shift cancelled')->exists());
        $this->api('POST', "/contracts/$id/cancel")->assertStatus(409);
        $this->api('PUT', "/contracts/$id", ['notes' => 'x'])->assertStatus(409);
        $this->api('PUT', "/shifts/{$shift->id}/assign", ['driver_id' => $driver->id])->assertStatus(409);
    }

    // ── shifts & assignment eligibility ──
    public function test_assignment_enforces_tier_active_credentials_and_overlap_then_notifies(): void
    {
        $id = $this->contract(['tier' => 'T3']);
        $shift = $this->firstShift($id);
        $path = "/shifts/{$shift->id}/assign";

        $low = $this->driver('Low Tier', 2);
        $this->api('PUT', $path, ['driver_id' => $low->id])->assertStatus(422);

        $off = $this->driver('Inactive', 4, false);
        $this->api('PUT', $path, ['driver_id' => $off->id])->assertStatus(422);
        $this->api('PUT', $path, ['driver_id' => 'not-a-driver'])->assertStatus(422);

        $susp = $this->driver('Suspended', 4);
        $cred = $this->api('POST', '/credentials', ['driver_id' => $susp->id, 'credential_name' => 'SORA', 'expires_at' => now()->addYear()->toDateString(), 'status' => 'suspended'])->assertCreated()->json('data.credential.id');
        $this->api('PUT', $path, ['driver_id' => $susp->id])->assertStatus(422);
        $this->api('PUT', "/credentials/$cred", ['status' => 'valid'])->assertOk();
        $this->api('PUT', $path, ['driver_id' => $susp->id])->assertOk();

        // expired before the shift is also ineligible
        $stale = $this->driver('Stale Card', 4);
        $this->api('POST', '/credentials', ['driver_id' => $stale->id, 'credential_name' => 'Carry permit', 'expires_at' => now()->addDay()->toDateString()])->assertCreated();
        $this->api('PUT', $path, ['driver_id' => $stale->id])->assertStatus(422);

        // overlapping shift for the same driver
        $other = $this->contract(['tier' => 'T3', 'start_date' => Carbon::parse($shift->starts_at)->toDateString()]);
        $clash = $this->firstShift($other);
        $this->api('PUT', "/shifts/{$clash->id}/assign", ['driver_id' => $susp->id])->assertStatus(422);

        $this->assertTrue(DriverNotification::where('driver_id', $susp->id)->where('title', 'New security shift')->exists());
        $this->assertSame($susp->id, DB::table('security_shifts')->where('id', $shift->id)->value('assigned_driver_id'));

        $this->api('POST', "/shifts/{$shift->id}/unassign")->assertOk();
        $row = DB::table('security_shifts')->find($shift->id);
        $this->assertSame('open', $row->status);
        $this->assertNull($row->assigned_driver_id);
        $this->api('POST', "/shifts/{$shift->id}/unassign")->assertStatus(409);
    }

    public function test_adhoc_shift_crud_and_guards(): void
    {
        $driver = $this->driver();
        $sid = $this->api('POST', '/shifts', [
            'name' => 'Gala door coverage', 'site_address' => 'Club, Red Bank', 'date' => now()->addDays(4)->toDateString(),
            'start_time' => '19:00', 'hours' => 6, 'tier' => 'T3', 'is_critical' => true,
        ])->assertCreated()->json('data.shift.id');

        $this->api('PUT', "/shifts/$sid", ['hours' => 8, 'tier' => 'T2'])->assertOk();
        $this->assertSame('T2', DB::table('security_shifts')->where('id', $sid)->value('tier'));

        $this->api('PUT', "/shifts/$sid/assign", ['driver_id' => $driver->id])->assertOk();
        $this->api('PUT', "/shifts/$sid", ['tier' => 'T4'])->assertStatus(422); // assigned driver is tier 3
        $this->api('DELETE', "/shifts/$sid")->assertStatus(409);
        $this->api('POST', "/shifts/$sid/unassign")->assertOk();
        $this->api('DELETE', "/shifts/$sid")->assertOk();
        $this->api('DELETE', "/shifts/$sid")->assertNotFound();
    }

    // ── swaps ──
    public function test_swap_lifecycle_approve_deny_withdraw_and_guards(): void
    {
        $from = $this->driver('From Driver', 3);
        $to = $this->driver('To Driver', 3);
        $low = $this->driver('Too Junior', 1);
        $shift = $this->firstShift($this->contract(['tier' => 'T3']));
        $this->api('POST', '/swaps', ['shift_id' => $shift->id, 'to_driver_id' => $to->id])->assertStatus(409); // not assigned yet
        $this->api('PUT', "/shifts/{$shift->id}/assign", ['driver_id' => $from->id])->assertOk();

        $this->api('POST', '/swaps', ['shift_id' => $shift->id, 'to_driver_id' => $from->id])->assertStatus(422);
        $this->api('POST', '/swaps', ['shift_id' => $shift->id, 'to_driver_id' => $low->id])->assertStatus(422);
        $swap = $this->api('POST', '/swaps', ['shift_id' => $shift->id, 'to_driver_id' => $to->id, 'reason' => 'Dentist'])->assertCreated()->json('data.swap.id');
        $this->assertSame('swap_pending', DB::table('security_shifts')->where('id', $shift->id)->value('status'));
        $this->api('POST', '/swaps', ['shift_id' => $shift->id, 'to_driver_id' => $to->id])->assertStatus(409); // one pending swap per shift
        $this->api('GET', '/swaps')->assertJsonPath('data.pending_count', 1);

        $this->api('POST', "/swaps/$swap/decision", ['decision' => 'approve', 'notes' => 'ok'])->assertOk();
        $row = DB::table('security_shifts')->find($shift->id);
        $this->assertSame($to->id, $row->assigned_driver_id);
        $this->assertSame('assigned', $row->status);
        $this->assertSame('approved', DB::table('security_swaps')->where('id', $swap)->value('status'));
        $this->assertTrue(DriverNotification::where('driver_id', $to->id)->where('title', 'Swap approved')->exists());
        $this->api('POST', "/swaps/$swap/decision", ['decision' => 'deny'])->assertStatus(409);
        $this->api('POST', '/swaps/99999/decision', ['decision' => 'deny'])->assertNotFound();

        // deny keeps the original driver; withdraw also restores the shift
        $swap2 = $this->api('POST', '/swaps', ['shift_id' => $shift->id, 'to_driver_id' => $from->id])->assertCreated()->json('data.swap.id');
        $this->api('POST', "/swaps/$swap2/decision", ['decision' => 'deny'])->assertOk();
        $this->assertSame($to->id, DB::table('security_shifts')->where('id', $shift->id)->value('assigned_driver_id'));
        $swap3 = $this->api('POST', '/swaps', ['shift_id' => $shift->id, 'to_driver_id' => $from->id])->assertCreated()->json('data.swap.id');
        $this->api('POST', "/swaps/$swap3/withdraw")->assertOk();
        $this->assertSame('assigned', DB::table('security_shifts')->where('id', $shift->id)->value('status'));
        $this->api('POST', "/swaps/$swap3/withdraw")->assertStatus(409);
    }

    public function test_swap_approval_rechecks_eligibility(): void
    {
        $from = $this->driver('From', 3);
        $to = $this->driver('To', 3);
        $shift = $this->firstShift($this->contract(['tier' => 'T3']));
        $this->api('PUT', "/shifts/{$shift->id}/assign", ['driver_id' => $from->id])->assertOk();
        $swap = $this->api('POST', '/swaps', ['shift_id' => $shift->id, 'to_driver_id' => $to->id])->assertCreated()->json('data.swap.id');

        $to->update(['is_active' => false]); // became ineligible after the request was logged
        $this->api('POST', "/swaps/$swap/decision", ['decision' => 'approve'])->assertStatus(422);
        $this->assertSame('waiting_admin', DB::table('security_swaps')->where('id', $swap)->value('status'));
        $this->assertSame($from->id, DB::table('security_shifts')->where('id', $shift->id)->value('assigned_driver_id'));
    }

    // ── credentials ──
    public function test_credentials_crud_effective_status_and_impacted_shifts(): void
    {
        $this->api('POST', '/credentials', ['driver_id' => 'nope', 'credential_name' => 'X', 'expires_at' => now()->addYear()->toDateString()])->assertStatus(422);

        $driver = $this->driver();
        $shift = $this->firstShift($this->contract(['start_date' => now()->addDays(10)->toDateString()]));
        $this->api('PUT', "/shifts/{$shift->id}/assign", ['driver_id' => $driver->id])->assertOk();

        $cred = $this->api('POST', '/credentials', ['driver_id' => $driver->id, 'credential_name' => 'SORA', 'expires_at' => now()->addDays(20)->toDateString()])
            ->assertCreated()->json('data.credential.id');
        $list = $this->api('GET', '/credentials')->assertOk();
        $list->assertJsonPath('data.credentials.0.effective_status', 'renewal_due')
            ->assertJsonPath('data.credentials.0.employee_name', 'Alex Guard')
            ->assertJsonPath('data.expiring_count', 1)
            ->assertJsonPath('data.impacted_shifts_count', 0); // card outlives the shift 10 days out
    }

    public function test_credential_lapsing_before_an_assigned_shift_flags_it_without_unassigning(): void
    {
        $driver = $this->driver();
        $shift = $this->firstShift($this->contract(['start_date' => now()->addDays(10)->toDateString()]));
        $this->api('POST', '/credentials', ['driver_id' => $driver->id, 'credential_name' => 'SORA', 'expires_at' => now()->addDays(60)->toDateString()])->assertCreated();
        $this->api('PUT', "/shifts/{$shift->id}/assign", ['driver_id' => $driver->id])->assertOk();

        $cred = DB::table('security_credentials')->value('id');
        $this->api('GET', '/credentials')->assertJsonPath('data.impacted_shifts_count', 0)->assertJsonPath('data.credentials.0.effective_status', 'valid');

        $this->api('PUT', "/credentials/$cred", ['expires_at' => now()->addDays(5)->toDateString()])->assertOk(); // lapses before the shift
        $this->api('GET', '/credentials')->assertJsonPath('data.impacted_shifts_count', 1)->assertJsonPath('data.credentials.0.effective_status', 'renewal_due');
        $this->assertSame($driver->id, DB::table('security_shifts')->where('id', $shift->id)->value('assigned_driver_id'));

        $this->api('PUT', "/credentials/$cred", ['status' => 'suspended'])->assertOk();
        $this->api('GET', '/credentials')->assertJsonPath('data.credentials.0.effective_status', 'suspended');
        $this->api('DELETE', "/credentials/$cred")->assertOk();
        $this->api('DELETE', "/credentials/$cred")->assertNotFound();
    }

    // ── announcements ──
    public function test_announcement_uses_signed_in_author_notifies_active_drivers_and_supports_edit_delete(): void
    {
        $a = $this->driver('Active One');
        $b = $this->driver('Active Two');
        $off = $this->driver('Inactive', 3, false);

        $id = $this->api('POST', '/announcements', ['message' => 'Winter storm protocol: Ensure tire chains are mounted.'])->assertCreated()->json('data.announcement.id');
        $row = DB::table('security_announcements')->find($id);
        $this->assertNotSame('Dispatch', $row->author_name);
        $this->assertNotNull($row->author_id);
        $this->assertTrue(DriverNotification::where('driver_id', $a->id)->where('type', 'security')->exists());
        $this->assertTrue(DriverNotification::where('driver_id', $b->id)->exists());
        $this->assertFalse(DriverNotification::where('driver_id', $off->id)->exists());

        $this->api('PUT', "/announcements/$id", ['message' => 'Corrected text'])->assertOk();
        $this->assertSame('Corrected text', DB::table('security_announcements')->where('id', $id)->value('message'));
        $this->api('DELETE', "/announcements/$id")->assertOk();
        $this->api('DELETE', "/announcements/$id")->assertNotFound();
    }

    // ── driver visibility & edit semantics ──
    public function test_driver_sees_only_own_assigned_security_shifts_in_portal(): void
    {
        [$user, $driverHeaders] = $this->actingAsRole('driver');
        $mine = Driver::create(['name' => 'Portal Driver', 'bio' => 'x', 'service_tier' => 3, 'is_active' => true, 'user_id' => $user->id]);
        $other = $this->driver('Someone Else', 3);
        $a = $this->firstShift($this->contract(['tier' => 'T2']));
        $b = $this->firstShift($this->contract(['tier' => 'T2', 'start_date' => now()->addDays(4)->toDateString()]));
        $this->api('PUT', "/shifts/{$a->id}/assign", ['driver_id' => $mine->id])->assertOk();
        $this->api('PUT', "/shifts/{$b->id}/assign", ['driver_id' => $other->id])->assertOk();

        $ids = collect($this->withHeaders($driverHeaders)->getJson('/api/v1/driver/security-shifts')->assertOk()->json('data.shifts'))->pluck('id')->all();
        $this->assertSame([$a->id], $ids);
    }

    public function test_resubmitting_unchanged_shift_time_does_not_notify_the_driver(): void
    {
        $driver = $this->driver();
        $shift = $this->firstShift($this->contract());
        $this->api('PUT', "/shifts/{$shift->id}/assign", ['driver_id' => $driver->id])->assertOk();
        $local = Carbon::parse($shift->starts_at, 'UTC')->setTimezone('America/New_York');

        $this->api('PUT', "/shifts/{$shift->id}", ['name' => 'Renamed', 'date' => $local->toDateString(), 'start_time' => $local->format('H:i'), 'hours' => 7])->assertOk();
        $this->assertFalse(DriverNotification::where('driver_id', $driver->id)->where('title', 'Shift updated')->exists());

        $this->api('PUT', "/shifts/{$shift->id}", ['start_time' => '10:00'])->assertOk();
        $this->assertTrue(DriverNotification::where('driver_id', $driver->id)->where('title', 'Shift updated')->exists());
    }

    // ── migrations ──
    public function test_cleanup_migration_removes_only_the_prototype_sample_rows(): void
    {
        $contract = DB::table('security_contracts')->insertGetId([
            'client_name' => 'Shore Day Camp', 'contact_name' => 'Camp Director', 'site_address' => '40 Seaview Ave, Monmouth Beach, NJ',
            'tier' => 'T2', 'headcount' => 1, 'start_date' => '2026-11-17', 'length_days' => 14, 'start_time' => '09:00',
            'hours_per_shift' => 7, 'days_of_week' => '[]', 'is_event_critical' => false, 'created_at' => now(), 'updated_at' => now(),
        ]);
        DB::table('security_shifts')->insert([
            'contract_id' => $contract, 'name' => 'Shore Day Camp (sample)', 'site_address' => '40 Seaview Ave, Monmouth Beach, NJ',
            'shift_date_label' => 'x', 'tier' => 'T2', 'status' => 'open', 'is_critical' => false, 'created_at' => now(), 'updated_at' => now(),
        ]);
        $this->lead(['client_name' => 'St. Agnes Parish', 'contact_name' => 'Rev. Thomas Avery', 'phone' => '(732) 555-0161']);
        DB::table('security_credentials')->insert([
            'driver_id' => null, 'employee_name' => 'Chris Jaeger', 'credential_name' => 'SOAR certification',
            'expires_label' => 'x', 'expires_at' => '2026-11-23', 'status' => 'suspended', 'created_at' => now(), 'updated_at' => now(),
        ]);
        DB::table('security_announcements')->insert([
            'author_name' => 'Dispatch', 'created_at' => now(), 'updated_at' => now(),
            'message' => 'Reminder: SOAR renewals are due before the end of the month. Upload your new card in the app.',
        ]);
        $real = $this->lead(['client_name' => 'Real Client', 'contact_name' => 'Real Person']);
        DB::table('security_announcements')->insert(['author_name' => 'Dispatch', 'message' => 'Real notice', 'created_at' => now(), 'updated_at' => now()]);

        (require database_path('migrations/2026_11_27_000002_remove_security_prototype_sample_data.php'))->up();

        foreach (['security_contracts', 'security_shifts', 'security_credentials'] as $t) {
            $this->assertSame(0, DB::table($t)->count(), "$t samples should be gone");
        }
        $this->assertSame([$real], DB::table('security_leads')->pluck('id')->all());
        $this->assertSame(['Real notice'], DB::table('security_announcements')->pluck('message')->all());
    }
}
