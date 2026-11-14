<?php

namespace Database\Seeders;

use App\Models\Driver;
use App\Models\DriverTier;
use App\Models\SecurityAddon;
use Illuminate\Database\Seeder;

class BookingEntitiesSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Driver Tiers
        $t1 = DriverTier::updateOrCreate(
            ['slug' => 'tier-1-essential'],
            [
                'name' => 'Tier 1 · Essential',
                'tier_code' => '1',
                'subtitle' => 'Professional & Vetted',
                'description' => 'Discreet, highly capable chauffeurs with extensive regional knowledge and standard defensive driving qualifications.',
                'multiplier' => 1.00,
                'sort_order' => 1,
                'is_active' => true,
            ]
        );

        $t2 = DriverTier::updateOrCreate(
            ['slug' => 'tier-2-executive'],
            [
                'name' => 'Tier 2 · Executive',
                'tier_code' => '2',
                'subtitle' => 'Close Protection Background',
                'description' => 'Law enforcement or military background with specialized evasive handling, motorcade tactics, and medical first-response certification.',
                'multiplier' => 1.25,
                'sort_order' => 2,
                'is_active' => true,
            ]
        );

        $t3 = DriverTier::updateOrCreate(
            ['slug' => 'tier-3-elite'],
            [
                'name' => 'Tier 3 · Elite',
                'tier_code' => '3',
                'subtitle' => 'Executive & Dignitary Protection',
                'description' => 'Elite operators specializing in high-threat protection, counter-surveillance, confidential route planning, and dedicated security coordination.',
                'multiplier' => 1.50,
                'sort_order' => 3,
                'is_active' => true,
            ]
        );

        // 2. Vehicles / Fleet
        $vehicles = [
            [
                'name' => 'Executive Class · Chevrolet Traverse',
                'slug' => 'chevrolet-traverse',
                'class_type' => 'exec',
                'category' => 'Compact SUV',
                'form_value' => 'exec|sedan',
                'passengers' => 3,
                'luggage' => 3,
                'image_url' => '/images/archer/fleet-traverse.png',
                'availability' => 'request',
                'availability_label' => 'Subject to availability',
                'sort_order' => 1,
                'is_active' => true,
            ],
            [
                'name' => 'Executive Class · Chevrolet Suburban',
                'slug' => 'chevrolet-suburban-exec',
                'class_type' => 'exec',
                'category' => 'Full-Size SUV',
                'form_value' => 'exec|suv',
                'passengers' => 6,
                'luggage' => 6,
                'image_url' => '/images/archer/fleet-suburban.png',
                'availability' => 'confirmed',
                'availability_label' => 'Available by request',
                'sort_order' => 2,
                'is_active' => true,
            ],
            [
                'name' => 'Executive Class · Mercedes-Benz Sprinter (15)',
                'slug' => 'sprinter-15-exec',
                'class_type' => 'exec',
                'category' => 'Group Van',
                'form_value' => 'exec|sprinter',
                'passengers' => 15,
                'luggage' => 15,
                'image_url' => '/images/archer/fleet-sprinter.png',
                'availability' => 'request',
                'availability_label' => 'Special request',
                'sort_order' => 3,
                'is_active' => true,
            ],
            [
                'name' => '1st Class · Lincoln Aviator',
                'slug' => 'lincoln-aviator',
                'class_type' => 'first',
                'category' => 'Luxury SUV',
                'form_value' => 'first|sedan',
                'passengers' => 3,
                'luggage' => 4,
                'image_url' => '/images/archer/fleet-aviator.png',
                'availability' => 'request',
                'availability_label' => 'Special request',
                'sort_order' => 4,
                'is_active' => true,
            ],
            [
                'name' => '1st Class · Cadillac Escalade',
                'slug' => 'cadillac-escalade',
                'class_type' => 'first',
                'category' => 'Full-Size SUV',
                'form_value' => 'first|suv',
                'passengers' => 6,
                'luggage' => 5,
                'image_url' => '/images/archer/fleet-escalade.png',
                'availability' => 'confirmed',
                'availability_label' => 'Available by request',
                'sort_order' => 5,
                'is_active' => true,
            ],
            [
                'name' => '1st Class · Mercedes-Benz Sprinter (11)',
                'slug' => 'sprinter-11-first',
                'class_type' => 'first',
                'category' => 'Executive Van',
                'form_value' => 'first|sprinter',
                'passengers' => 11,
                'luggage' => 12,
                'image_url' => '/images/archer/fleet-sprinter.png',
                'availability' => 'request',
                'availability_label' => 'Special request',
                'sort_order' => 6,
                'is_active' => true,
            ],
            [
                'name' => 'Client Car · your own vehicle',
                'slug' => 'client-car-service',
                'class_type' => 'exec',
                'category' => 'Personal Vehicle',
                'form_value' => 'exec|client',
                'passengers' => 4,
                'luggage' => 4,
                'image_url' => '/images/services/client-car.jpg',
                'availability' => 'confirmed',
                'availability_label' => 'Client-supplied vehicle',
                'sort_order' => 7,
                'is_active' => true,
            ],
        ];

        // Retired 2026-11-14: Website Fleet (site_vehicles) is the only fleet list. Rows are no longer seeded.
        unset($vehicles);

        // 3. Security Add-ons
        $securityAddons = [
            [
                'name' => 'None',
                'form_value' => '0',
                'guards_count' => 0,
                'description' => 'Driver only, no additional security personnel',
                'hourly_rate' => 0.00,
                'sort_order' => 1,
                'is_active' => true,
            ],
            [
                'name' => '1 guard, same tier',
                'form_value' => '1',
                'guards_count' => 1,
                'description' => '1 dedicated protection officer matching selected driver tier',
                'hourly_rate' => 150.00,
                'sort_order' => 2,
                'is_active' => true,
            ],
            [
                'name' => '2 guards, same tier',
                'form_value' => '2',
                'guards_count' => 2,
                'description' => '2 dedicated protection officers matching selected driver tier',
                'hourly_rate' => 300.00,
                'sort_order' => 3,
                'is_active' => true,
            ],
        ];

        foreach ($securityAddons as $sa) {
            SecurityAddon::updateOrCreate(['form_value' => $sa['form_value']], $sa);
        }

        // 4. Drivers
        $drivers = [
            [
                'name' => 'Paul Malesky',
                'email' => 'paul.malesky@archerexecutive.com',
                'phone' => '+1 (848) 231-9997',
                'tier_id' => $t3->id,
                'bio' => 'Senior Executive Protection Specialist with over 15 years in dignitary transport.',
                'sort_order' => 1,
                'is_active' => true,
            ],
            [
                'name' => 'Chris Jaeger',
                'email' => 'chris.jaeger@archerexecutive.com',
                'phone' => '+1 (848) 231-9997',
                'tier_id' => $t2->id,
                'bio' => 'Specialized in defensive driving, precision motorcades, and regional airport routes.',
                'sort_order' => 2,
                'is_active' => true,
            ],
            [
                'name' => 'Joseph Klein',
                'email' => 'joseph.klein@archerexecutive.com',
                'phone' => '+1 (848) 231-9997',
                'tier_id' => $t2->id,
                'bio' => 'Corporate and financial roadshow specialist across NYC, Philadelphia, and NJ corridors.',
                'sort_order' => 3,
                'is_active' => true,
            ],
            [
                'name' => 'Matthew Vance',
                'email' => 'matthew.vance@archerexecutive.com',
                'phone' => '+1 (848) 231-9997',
                'tier_id' => $t1->id,
                'bio' => 'Hospitality-focused executive chauffeur with exemplary safety and discretion records.',
                'sort_order' => 4,
                'is_active' => true,
            ],
        ];

        foreach ($drivers as $d) {
            Driver::updateOrCreate(['name' => $d['name']], $d);
        }
    }
}
