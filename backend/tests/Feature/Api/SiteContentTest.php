<?php

namespace Tests\Feature\Api;

use App\Models\RateCard;
use Database\Seeders\SiteContentSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\CreatesStaff;
use Tests\TestCase;

class SiteContentTest extends TestCase
{
    use CreatesStaff, RefreshDatabase;

    public function test_seeder_imports_current_site_content_and_is_idempotent(): void
    {
        $this->seed(SiteContentSeeder::class);
        $this->seed(SiteContentSeeder::class);

        $d = $this->getJson('/api/v1/site')->assertOk()->json('data');
        $this->assertCount(6, $d['services']);
        $this->assertCount(8, $d['tier_list']);
        $this->assertCount(6, $d['vehicles']);
        $this->assertCount(44, $d["rates"]);
        $this->assertTrue($d['settings']['apps_coming_soon']);
        $rate = collect($d['rates'])->first(fn ($r) => $r['kind'] === 'hourly' && $r['vehicle_class'] === 'exec' && $r['size'] === 'sedan' && $r['tier'] === 1);
        $this->assertSame(7000, $rate['amount_cents']);
    }

    public function test_hidden_items_are_not_public(): void
    {
        $this->seed(SiteContentSeeder::class);
        [, $h] = $this->actingAsRole('super_admin');
        $id = $this->getJson('/api/v1/admin/site-vehicles', $h)->json('data.vehicles.0.id');
        $this->putJson("/api/v1/admin/site-vehicles/{$id}", ['is_active' => false], $h)->assertOk();

        $this->assertCount(5, $this->getJson('/api/v1/site')->json('data.vehicles'));
    }

    public function test_rate_changes_need_pricing_permission_and_are_audited(): void
    {
        $this->seed(SiteContentSeeder::class);
        $card = RateCard::where('kind', 'hourly')->first();

        [, $editor] = $this->actingAsRole('content_editor');
        $this->putJson('/api/v1/admin/rates', ['rates' => [['id' => $card->id, 'amount_cents' => 9900]]], $editor)->assertForbidden();

        [, $ops] = $this->actingAsRole('operations_manager');
        $this->putJson('/api/v1/admin/rates', ['rates' => [['id' => $card->id, 'amount_cents' => 9900]]], $ops)->assertOk();
        $this->putJson('/api/v1/admin/rates', ['rates' => [['id' => $card->id, 'amount_cents' => -5]]], $ops)->assertUnprocessable();

        $this->assertSame(9900, $card->fresh()->amount_cents);
        $this->assertDatabaseHas('audit_logs', ['event' => 'site.rate.updated']);
    }

    public function test_content_documents_validate_and_reject_unknown_keys(): void
    {
        $this->seed(SiteContentSeeder::class);
        [, $h] = $this->actingAsRole('content_editor');

        $this->getJson('/api/v1/admin/site-content/not-allowed', $h)->assertNotFound();
        $this->putJson('/api/v1/admin/site-content/settings', ['data' => ['phone' => '1']], $h)->assertUnprocessable();

        $settings = $this->getJson('/api/v1/admin/site-content/settings', $h)->json('data.data');
        $settings['phone'] = '(848) 000-0000';
        $this->putJson('/api/v1/admin/site-content/settings', ['data' => $settings], $h)->assertOk();
        $this->assertSame('(848) 000-0000', $this->getJson('/api/v1/site')->json('data.settings.phone'));
    }
}
