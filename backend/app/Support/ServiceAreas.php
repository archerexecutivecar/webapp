<?php

namespace App\Support;

use App\Models\SiteContent;

/** Airports and security venues the customer app offers. Admin stores them on site settings; these defaults apply until then. */
class ServiceAreas
{
    /** @var list<array{code: string, region: string}> */
    public const DEFAULT_AIRPORTS = [
        ['code' => 'EWR', 'region' => 'nj'],
        ['code' => 'ACY', 'region' => 'nj'],
        ['code' => 'TEB', 'region' => 'nj'],
        ['code' => 'MMU', 'region' => 'nj'],
        ['code' => 'JFK', 'region' => 'ny_pa'],
        ['code' => 'LGA', 'region' => 'ny_pa'],
        ['code' => 'PHL', 'region' => 'ny_pa'],
        ['code' => 'OTHER', 'region' => 'other'],
    ];

    /** @var list<string> */
    public const DEFAULT_VENUES = [
        'Religious buildings',
        'Office / corporate',
        'Corporate events',
        'Private events',
        'Daycares & camps',
        'Schools',
        'Production sets',
        'Retail / commercial',
    ];

    /** @param  array<string, mixed>|null  $settings */
    public static function withDefaults(?array $settings): array
    {
        $settings ??= [];
        $settings['airports'] = self::airportsFrom($settings);
        $settings['security_venues'] = self::venuesFrom($settings);

        return $settings;
    }

    /** @return list<array{code: string, region: string}> */
    public static function airports(): array
    {
        $stored = SiteContent::query()->where('key', 'settings')->first()?->data;

        return self::airportsFrom(is_array($stored) ? $stored : null);
    }

    /** @return list<string> */
    public static function codes(): array
    {
        return array_map(fn (array $row) => $row['code'], self::airports());
    }

    public static function region(string $code): ?string
    {
        $code = strtoupper(trim($code));
        foreach (self::airports() as $row) {
            if ($row['code'] === $code) {
                return $row['region'];
            }
        }

        return null;
    }

    /** @return list<string> */
    public static function venues(): array
    {
        $stored = SiteContent::query()->where('key', 'settings')->first()?->data;

        return self::venuesFrom(is_array($stored) ? $stored : null);
    }

    /** @param  array<string, mixed>|null  $settings
     * @return list<array{code: string, region: string}>
     */
    private static function airportsFrom(?array $settings): array
    {
        $rows = $settings['airports'] ?? null;
        if (! is_array($rows) || $rows === []) {
            return self::DEFAULT_AIRPORTS;
        }

        $out = [];
        foreach ($rows as $row) {
            if (! is_array($row)) {
                continue;
            }
            $code = strtoupper(trim((string) ($row['code'] ?? '')));
            $region = (string) ($row['region'] ?? '');
            if ($code === '' || ! in_array($region, ['nj', 'ny_pa', 'other'], true)) {
                continue;
            }
            $out[] = ['code' => $code, 'region' => $region];
        }

        return $out !== [] ? $out : self::DEFAULT_AIRPORTS;
    }

    /** @param  array<string, mixed>|null  $settings
     * @return list<string>
     */
    private static function venuesFrom(?array $settings): array
    {
        $rows = $settings['security_venues'] ?? null;
        if (! is_array($rows) || $rows === []) {
            return self::DEFAULT_VENUES;
        }

        $out = [];
        foreach ($rows as $row) {
            if (is_string($row) && trim($row) !== '') {
                $out[] = trim($row);
            }
        }

        return $out !== [] ? $out : self::DEFAULT_VENUES;
    }
}
