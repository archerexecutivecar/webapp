<?php

namespace App\Support;

/**
 * Public brand identity stored on the site settings document.
 * Missing keys keep the current Archer defaults. A saved null stays null.
 */
class BrandSettings
{
    public const KEYS = [
        'brand_name',
        'legal_name',
        'tagline',
        'logo_url',
        'phone',
        'phone_tel',
        'phone_secondary',
        'email',
        'address',
    ];

    public static function defaults(): array
    {
        return [
            'brand_name' => 'ARCHER EXECUTIVE',
            'legal_name' => 'Archer Enterprises LLC',
            'tagline' => 'TRANSPORTATION & SECURITY SPECIALISTS',
            'logo_url' => null,
            'phone' => '(848) 231-9997',
            'phone_tel' => '+18482319997',
            'phone_secondary' => '(732) 757-3232',
            'email' => 'info@archerexecutivecar.com',
            'address' => ['Russel Hall – Fort Monmouth', '1000 Sanger Avenue, Suite #500', 'Oceanport, NJ 07757'],
        ];
    }

    public static function present(?array $settings): array
    {
        $settings ??= [];
        $out = self::defaults();
        foreach (self::KEYS as $key) {
            if (! array_key_exists($key, $settings)) {
                continue;
            }
            $out[$key] = $settings[$key];
        }

        return $out;
    }
}
