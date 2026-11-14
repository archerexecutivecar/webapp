<?php

namespace Database\Seeders;

use App\Models\RateCard;
use App\Models\SiteContent;
use App\Models\SiteTier;
use App\Models\SiteVehicle;
use Illuminate\Database\Seeder;

/**
 * Imports the content currently shown on the public website so Admin owns it from day one.
 * Idempotent: re-running restores seeded rows by natural key and never duplicates.
 * Rates are the figures displayed on the approved website design and must be confirmed against the
 * approved Archer rules package before production use.
 */
class SiteContentSeeder extends Seeder
{
    public function run(): void
    {
        $pages = json_decode(file_get_contents(database_path('seed-data/pages.json')), true);
        $services = json_decode(file_get_contents(database_path('seed-data/services.json')), true);

        foreach ($services as $svc) {
            SiteContent::updateOrCreate(['key' => 'service.'.$svc['slug']], ['data' => $svc]);
        }
        SiteContent::updateOrCreate(['key' => 'home'], ['data' => $pages['home']]);
        SiteContent::updateOrCreate(['key' => 'fleet'], ['data' => $pages['fleet']]);
        SiteContent::updateOrCreate(['key' => 'tiers'], ['data' => $pages['tiers']]);
        SiteContent::updateOrCreate(['key' => 'settings'], ['data' => [
            'phone' => '(848) 231-9997', 'phone_tel' => '+18482319997', 'phone_secondary' => '(732) 757-3232',
            'email' => 'info@archerexecutivecar.com',
            'address' => ['Russel Hall – Fort Monmouth', '1000 Sanger Avenue, Suite #500', 'Oceanport, NJ 07757'],
            'social' => [
                'facebook' => 'https://www.facebook.com/profile.php?id=61588051365237',
                'instagram' => 'https://www.instagram.com/archer.executive.car/',
                'linkedin' => 'https://www.linkedin.com/in/richard-opp-3122bb3a5/',
                'x' => 'https://x.com/archer_car2026',
            ],
            'apps_coming_soon' => true, 'app_store_url' => null, 'play_store_url' => null,
        ]]);

        $driver = [
            [1, 'TIER 1 · ESSENTIAL', 'Professional Chauffeur', false, ['Vetted, professional chauffeur', 'Cleared criminal background check', 'SORA-certified'], ['Airport runs', 'Everyday business travel', 'Nights out and events']],
            [2, 'TIER 2 · EXECUTIVE', 'Military & Law-Enforcement Chauffeur', false, ['Everything in Tier 1', 'Verified military or law-enforcement service', 'NJ SORA security officer registration'], ['Executives and corporate clients', 'Roadshows and multi-stop days', 'Rides needing a security-minded chauffeur']],
            [3, 'TIER 3 · ELITE', 'Executive Protection Specialist', false, ['Everything in Tier 2', 'Certified in personal or executive protection', 'Commendations earned in the line of duty'], ['VIPs and public figures', 'Sensitive itineraries', 'Private aviation and FBO transfers']],
            [4, 'TIER 4 · ARMED', 'Senior Protection Specialist', true, ['Everything in Tier 3', "Archer's highest level of credentials"], ['Dignitaries', 'Elevated-risk details', 'Private aviation']],
        ];
        $security = [
            [1, 'TIER 1 · ESSENTIAL', 'Security Officer', false, ['Licensed, background-checked officer', 'NJ SORA registration'], ['Front desk and access control', 'Office and residential coverage']],
            [2, 'TIER 2 · EXECUTIVE', 'Security Specialist', false, ['Everything in Tier 1', 'Verified military or law-enforcement service'], ['Corporate events', 'Venue and crowd management']],
            [3, 'TIER 3 · ELITE', 'Executive Protection Specialist', false, ['Everything in Tier 2', 'Certified in executive protection'], ['Executive protection details', 'Red carpets, galas and VIP events']],
            [4, 'TIER 4 · ARMED', 'Senior Protection Specialist', true, ['Everything in Tier 3', "Archer's highest level of credentials"], ['Dignitaries', 'Elevated-risk assignments']],
        ];
        foreach (['driver' => $driver, 'security' => $security] as $kind => $rows) {
            foreach ($rows as [$tier, $label, $title, $call, $creds, $suited]) {
                SiteTier::updateOrCreate(['kind' => $kind, 'tier' => $tier], [
                    'label' => $label, 'title' => $title, 'call_only' => $call, 'credentials' => $creds,
                    'suited_for' => $suited, 'sort_order' => $tier, 'is_active' => true,
                ]);
            }
        }

        $vehicles = [
            ['exec', 'sedan', 'MID-SIZE SUV', 'Chevrolet Traverse', 'Solo travelers and small groups.', null, null],
            ['exec', 'suv', 'FULL-SIZE SUV', 'Chevrolet Suburban', 'Room for the team and the luggage.', '1b4961ff296cae8343dcbc40a67cfd31.png', 'Black SUV on a city street at night'],
            ['exec', 'van', 'SPRINTER', 'Mercedes-Benz Sprinter', 'Groups, roadshows and events.', null, null],
            ['first', 'sedan', 'MID-SIZE SUV', 'Lincoln Aviator', 'Refined comfort for one to a few guests.', null, null],
            ['first', 'suv', 'FULL-SIZE SUV', 'Cadillac Escalade', "Archer's signature ride.", '5c3d16f0aa316485e13e25e61f6c0bae.jpg', "Archer's own black Cadillac Escalade"],
            ['first', 'van', 'SPRINTER', 'Executive Sprinter', 'Premium group travel for VIP parties.', null, null],
        ];
        foreach ($vehicles as $i => [$class, $size, $label, $model, $blurb, $img, $alt]) {
            SiteVehicle::updateOrCreate(['vehicle_class' => $class, 'size' => $size], [
                'size_label' => $label, 'model' => $model, 'blurb' => $blurb, 'image_url' => $img, 'image_alt' => $alt,
                'sort_order' => $i + 1, 'is_active' => true,
            ]);
        }

        $rates = [
            ['hourly', 'exec', 'sedan', [70, 90, 130, 215]], ['hourly', 'exec', 'suv', [80, 100, 140, 190]], ['hourly', 'exec', 'van', [175, 195, 235, 390]],
            ['hourly', 'first', 'sedan', [80, 100, 140, 235]], ['hourly', 'first', 'suv', [100, 120, 160, 210]], ['hourly', 'first', 'van', [225, 245, 285, 475]],
            ['point_to_point', 'exec', 'sedan', [145, 170, 215, 270]], ['point_to_point', 'exec', 'suv', [155, 180, 225, 280]],
            ['point_to_point', 'first', 'sedan', [155, 180, 225, 280]], ['point_to_point', 'first', 'suv', [200, 220, 260, 310]],
            ['security_hourly', null, null, [45, 60, 75, 125]],
            ['client_car_hourly', null, null, [45, 60, 75, 125]],
        ];
        foreach ($rates as [$kind, $class, $size, $amounts]) {
            foreach ($amounts as $i => $dollars) {
                RateCard::updateOrCreate(
                    ['kind' => $kind, 'vehicle_class' => $class, 'size' => $size, 'tier' => $i + 1],
                    ['amount_cents' => $dollars * 100, 'is_active' => true]
                );
            }
        }
    }
}
