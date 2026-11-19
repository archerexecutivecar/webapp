<?php

namespace Tests\Feature\Api;

use App\Models\RateCard;
use App\Models\Vehicle;
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
        $this->assertCount(0, $d['vehicles']);
        $this->assertCount(0, $d['rate_fleet']);
        $this->assertSame('EWR', $d['settings']['airports'][0]['code']);
        $this->assertNotEmpty($d['settings']['security_venues']);
        $this->assertCount(48, $d['rates']);
        $this->assertTrue($d['settings']['apps_coming_soon']);
        $rate = collect($d['rates'])->first(fn ($r) => $r['kind'] === 'hourly' && $r['vehicle_class'] === 'exec' && $r['size'] === 'sedan' && $r['tier'] === 1);
        $this->assertSame(7000, $rate['amount_cents']);
    }

    public function test_public_fleet_lists_active_operational_vehicles_without_plates(): void
    {
        $this->seed(SiteContentSeeder::class);
        $this->fleetCar('Chevrolet Traverse', 'exec', 'Compact SUV', 'exec|sedan', 'NJ TRV-301', true, 3, 2);
        $this->fleetCar('Hidden Suburban', 'exec', 'SUV', 'exec|suv', 'NJ SUB-201', false, 6, 6);

        $vehicles = $this->getJson('/api/v1/site')->assertOk()->json('data.vehicles');

        $this->assertCount(1, $vehicles);
        $this->assertSame('Chevrolet Traverse', $vehicles[0]['model']);
        $this->assertSame('exec', $vehicles[0]['vehicle_class']);
        $this->assertSame('Executive Class', $vehicles[0]['class_label']);
        $this->assertSame('sedan', $vehicles[0]['size']);
        $this->assertSame('Compact SUV', $vehicles[0]['size_label']);
        $this->assertSame([3, 2], [$vehicles[0]['passengers'], $vehicles[0]['bags']]);
        $fleet = collect($this->getJson('/api/v1/site')->json('data.rate_fleet'));
        $this->assertSame('Chevrolet Traverse', $fleet->firstWhere('size', 'sedan')['model']);
        $this->assertNull($fleet->firstWhere('model', 'Hidden Suburban'));
        $this->assertArrayNotHasKey('plate', $vehicles[0]);
        $this->assertStringNotContainsString('NJ TRV-301', json_encode($vehicles));
    }

    public function test_vehicle_capacity_is_optional_and_validated(): void
    {
        $this->seed(SiteContentSeeder::class);
        [, $h] = $this->actingAsRole('super_admin');
        $id = $this->getJson('/api/v1/admin/site-vehicles', $h)->json('data.vehicles.0.id');
        $this->putJson("/api/v1/admin/site-vehicles/{$id}", ['passengers' => 0], $h)->assertUnprocessable();
        $this->putJson("/api/v1/admin/site-vehicles/{$id}", ['bags' => -1], $h)->assertUnprocessable();
        $this->putJson("/api/v1/admin/site-vehicles/{$id}", ['passengers' => 6, 'bags' => 4], $h)->assertOk();

        $this->assertDatabaseHas('audit_logs', ['event' => 'site.vehicle.updated']);
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

        $this->putJson('/api/v1/admin/rates', ['rates' => [['id' => $card->id, 'amount_cents' => 9900, 'is_active' => false]]], $ops)->assertOk();
        $this->assertFalse($card->fresh()->is_active);
        $this->assertCount(47, $this->getJson('/api/v1/site')->json('data.rates'));
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

    private function fleetCar(string $name, string $class, string $category, string $form, string $plate, bool $active, int $passengers, int $bags): void
    {
        Vehicle::create([
            'name' => $name,
            'slug' => str($name)->slug()->toString(),
            'class_type' => $class,
            'category' => $category,
            'form_value' => $form,
            'plate' => $plate,
            'passengers' => $passengers,
            'luggage' => $bags,
            'is_active' => $active,
        ]);
    }
}
