<?php

namespace Tests\Feature\Api;

use App\Models\SiteContent;
use App\Support\PlaceholderScanner;
use Database\Seeders\SiteContentSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Launch gate for editorial placeholders (QA report 2026-11-13, BUG-004/005/010/014–018/026/028).
 * Placeholders still waiting on Archer copy are listed in KNOWN with their QA bug id. Any NEW placeholder fails.
 * When Archer supplies copy, remove the entry; the stale-entry test makes sure the list only shrinks.
 */
class SitePlaceholderTest extends TestCase
{
    use RefreshDatabase;

    /** location => QA bug id */
    private const KNOWN = [
        'fleet.standard.2.1' => 'BUG-018', // Wi-Fi availability
        'service.hourly.intro.panel.4' => 'BUG-018', // Wi-Fi availability
        'service.hourly.faq.3.a' => 'BUG-014', // advance notice period
        'service.airport.faq.3.a' => 'BUG-015', // tolls / fees included
        'service.airport.faq.5.a' => 'BUG-014', // advance notice period
        'service.point-to-point.faq.0.a' => 'BUG-016', // out-of-NJ distance pricing
        'service.client-car.intro.panel.5' => 'BUG-010', // insurance wording
        'service.client-car.faq.2.a' => 'BUG-010', // insurance wording
        'service.client-car.faq.3.a' => 'BUG-026', // vehicle eligibility
        'service.concierge.faq.0.a' => 'BUG-028', // concierge lead time
        'service.assistants.pricing.text' => 'BUG-017', // corporate billing
        'service.assistants.faq.4.a' => 'BUG-017', // corporate billing
    ];

    private function locations(): array
    {
        $this->seed(SiteContentSeeder::class);

        return array_values(array_unique(array_column((new PlaceholderScanner)->scan(), 'location')));
    }

    public function test_scanner_detects_every_placeholder_style(): void
    {
        SiteContent::create(['key' => 'home', 'data' => ['a' => 'Wi-Fi [CONFIRM]', 'b' => ['[#] passengers', 'ok'], 'c' => '[ARCHER TO CONFIRM wording]', 'd' => 'Clean copy']]);

        $hits = (new PlaceholderScanner)->scan();

        $this->assertSame(['home.a', 'home.b.0', 'home.c'], array_column($hits, 'location'));
    }

    public function test_no_new_placeholders_in_seeded_site_content(): void
    {
        $unexpected = array_diff($this->locations(), array_keys(self::KNOWN));

        $this->assertSame([], array_values($unexpected), 'New placeholder text in public content. Replace it, or record it with its QA bug id in KNOWN.');
    }

    public function test_known_placeholder_list_has_no_stale_entries(): void
    {
        $stale = array_diff(array_keys(self::KNOWN), $this->locations());

        $this->assertSame([], array_values($stale), 'These placeholders were resolved — remove them from KNOWN.');
    }

    public function test_artisan_command_fails_while_placeholders_exist(): void
    {
        $this->seed(SiteContentSeeder::class);
        SiteContent::create(['key' => 'service.test', 'data' => ['q' => '[ARCHER TO CONFIRM]']]);

        $this->artisan('site:placeholders')->assertExitCode(1);
    }

    public function test_artisan_command_passes_on_clean_content(): void
    {
        SiteContent::create(['key' => 'home', 'data' => ['title' => 'Archer']]);

        $this->artisan('site:placeholders')->assertExitCode(0);
    }
}
