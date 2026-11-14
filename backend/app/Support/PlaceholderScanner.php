<?php

namespace App\Support;

use App\Models\SiteContent;
use App\Models\SiteTier;
use App\Models\SiteVehicle;

/**
 * Finds editorial placeholders (e.g. "[ARCHER TO CONFIRM ...]", "[CONFIRM]", "[#]") in public website content.
 * These must never reach production (QA report 2026-11-13). Used by `site:placeholders` and the launch-gate test.
 */
class PlaceholderScanner
{
    public const PATTERN = '/\[(?:ARCHER TO CONFIRM[^\]]*|CONFIRM[^\]]*|#|TBD|TODO)\]/i';

    /** @return list<array{location: string, text: string}> */
    public function scan(): array
    {
        $hits = [];

        foreach (SiteContent::orderBy('key')->get() as $doc) {
            $this->walk($doc->data ?? [], $doc->key, $hits);
        }
        foreach (SiteTier::where('is_active', true)->orderBy('kind')->orderBy('sort_order')->get() as $t) {
            $this->walk($t->only(['label', 'title', 'credentials', 'suited_for']), "tier.{$t->kind}.{$t->tier}", $hits);
        }
        foreach (SiteVehicle::where('is_active', true)->orderBy('sort_order')->get() as $v) {
            $this->walk($v->only(['size_label', 'model', 'blurb', 'image_alt']), "vehicle.{$v->vehicle_class}.{$v->size}", $hits);
        }

        return $hits;
    }

    /** @param  list<array{location: string, text: string}>  $hits */
    private function walk(mixed $value, string $path, array &$hits): void
    {
        if (is_array($value)) {
            foreach ($value as $k => $v) {
                $this->walk($v, "{$path}.{$k}", $hits);
            }

            return;
        }
        if (is_string($value) && preg_match_all(self::PATTERN, $value, $m)) {
            foreach ($m[0] as $match) {
                $hits[] = ['location' => $path, 'text' => $match];
            }
        }
    }
}
