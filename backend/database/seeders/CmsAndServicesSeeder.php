<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CmsAndServicesSeeder extends Seeder
{
    public function run(): void
    {
        $now = now();

        // 1. Seed Initial Service Types
        $services = [
            [
                'id' => (string) Str::uuid(),
                'slug' => 'airport-transfer',
                'name' => 'Airport Transfer',
                'tagline' => 'Seamless commercial & private FBO meet-and-greet.',
                'description' => 'Precision pickup with real-time flight monitoring, baggage assistance, and expedited curbside departures across major NYC/NJ airports and regional FBOs.',
                'badge' => 'Most Requested',
                'icon' => 'plane',
                'image_url' => '/images/services/airport-transfer.jpg',
                'features' => json_encode([
                    'Real-time FAA flight and tail-number tracking',
                    'FBO & private terminal access (Signature, Atlantic)',
                    '45-min complimentary international wait time',
                    'Curbside or inside baggage hall greeting',
                ]),
                'min_hours' => 0,
                'sort_order' => 1,
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'id' => (string) Str::uuid(),
                'slug' => 'hourly-chauffeur',
                'name' => 'Hourly Chauffeur',
                'tagline' => 'Dedicated vehicle and chauffeur at your command.',
                'description' => 'Unrestricted flexibility for multi-stop roadshows, high-profile meetings, evenings out, and VIP itinerary coordination.',
                'badge' => 'Flexible',
                'icon' => 'clock',
                'image_url' => '/images/services/hourly-chauffeur.jpg',
                'features' => json_encode([
                    'Dedicated chauffeur on standby throughout booking',
                    'Unlimited stops within reservation window',
                    'Confidential & NDA-trained drivers',
                    'Onboard Wi-Fi and executive amenities',
                ]),
                'min_hours' => 4,
                'sort_order' => 2,
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'id' => (string) Str::uuid(),
                'slug' => 'client-car',
                'name' => 'Client Car Service',
                'tagline' => 'Professional chauffeur driving your personal vehicle.',
                'description' => 'Experience the supreme comfort of your own luxury or exotic vehicle with a fully vetted, background-checked professional behind the wheel.',
                'badge' => 'Exclusive',
                'icon' => 'car',
                'image_url' => '/images/services/client-car.jpg',
                'features' => json_encode([
                    'Comprehensive 16-point digital vehicle walk-around',
                    'Driver experienced across Rolls-Royce, Bentley & exotic platforms',
                    'End-to-end commercial liability facilitation',
                    '3-hour minimum reservation',
                ]),
                'min_hours' => 3,
                'sort_order' => 3,
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'id' => (string) Str::uuid(),
                'slug' => 'intercity-point-to-point',
                'name' => 'Intercity & Long Distance',
                'tagline' => 'Door-to-door regional executive travel.',
                'description' => 'A serene, productive alternative to regional rail and short-haul flights between NYC, Philadelphia, Washington D.C., Boston, and the Hamptons.',
                'badge' => null,
                'icon' => 'navigation',
                'image_url' => '/images/services/intercity.jpg',
                'features' => json_encode([
                    'Direct door-to-door transfer without airport delays',
                    'Quiet cabin workspace with power ports',
                    'Complimentary refreshments & privacy partition',
                ]),
                'min_hours' => 0,
                'sort_order' => 4,
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ];

        DB::table('service_types')->insert($services);

        // 2. Seed Home CMS Page
        $homePageId = (string) Str::uuid();
        DB::table('cms_pages')->insert([
            'id' => $homePageId,
            'slug' => 'home',
            'title' => 'Home - Archer Executive Services',
            'meta_title' => 'Archer Executive Services | Private Chauffeured Luxury Transportation',
            'meta_description' => 'Uncompromising chauffeured service, airport transfers, and private car solutions for discerning executives, family offices, and VIPs in the Tri-State area.',
            'status' => 'published',
            'published_at' => $now,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        // 3. Seed Dynamic Sections for Home Page
        DB::table('cms_sections')->insert([
            [
                'id' => (string) Str::uuid(),
                'cms_page_id' => $homePageId,
                'section_key' => 'hero',
                'title' => 'Executive Mobility, Perfected.',
                'subtitle' => 'Chauffeured luxury for corporate leaders, private aviation travelers, and discerning clients across the New York & New Jersey metro.',
                'content' => json_encode([
                    'badge' => 'The Archer Standard',
                    'primary_cta_label' => 'Reserve Chauffeur',
                    'primary_cta_link' => '/reserve',
                    'secondary_cta_label' => 'Explore Fleet',
                    'secondary_cta_link' => '/fleet',
                    'background_type' => 'image',
                    'background_url' => '/images/hero/archer-black-sedan.jpg',
                ]),
                'sort_order' => 1,
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'id' => (string) Str::uuid(),
                'cms_page_id' => $homePageId,
                'section_key' => 'stats_strip',
                'title' => 'Operational Excellence in Numbers',
                'subtitle' => null,
                'content' => json_encode([
                    'stats' => [
                        ['label' => 'On-Time Performance', 'value' => '99.8%', 'sub' => 'Audited arrival timestamps'],
                        ['label' => 'Background Checked', 'value' => '100%', 'sub' => 'Vetted, fingerprinted chauffeurs'],
                        ['label' => 'Flight Tracking Buffer', 'value' => '15+ min', 'sub' => 'Proactive delay compensation'],
                        ['label' => 'Executive Fleet', 'value' => 'Current Gen', 'sub' => 'Maintained to factory specs'],
                    ],
                ]),
                'sort_order' => 2,
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ]);

        // 4. Client testimonials are intentionally NOT seeded: only real reviews entered in Admin are shown on the website.

        // 5. Seed Initial FAQs
        DB::table('cms_faqs')->insert([
            [
                'id' => (string) Str::uuid(),
                'category' => 'Reservations',
                'question' => 'How much notice is required to book a chauffeur?',
                'answer' => 'While we recommend a 48-hour booking window for guaranteed vehicle class selection, our dispatch operations accommodate short-notice requests subject to fleet availability.',
                'sort_order' => 1,
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'id' => (string) Str::uuid(),
                'category' => 'Airports',
                'question' => 'How does Archer handle flight delays for airport pickups?',
                'answer' => 'We monitor commercial flights and private FBO tail numbers in real time. Chauffeur staging is automatically adjusted based on actual runway touchdown, including complimentary wait times.',
                'sort_order' => 2,
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'id' => (string) Str::uuid(),
                'category' => 'Client Car',
                'question' => 'What is required for the Client Car service?',
                'answer' => 'Your vehicle must have valid registration and state-compliant insurance. Before departure, our chauffeur completes a digital 16-point condition walk-around recorded in your trip file.',
                'sort_order' => 3,
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ]);
    }
}
