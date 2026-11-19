<?php

namespace Tests\Support;

use App\Models\Vehicle;

/** Cars on Fleet & availability that quotes and bookings can offer. */
trait SeedsOperationalFleet
{
    protected function seedOperationalFleet(): void
    {
        $rows = [
            ['exec', 'sedan', 'MID-SIZE SUV', 'Chevrolet Traverse', 3, 3, 1],
            ['exec', 'suv', 'FULL-SIZE SUV', 'Chevrolet Suburban', 6, 6, 2],
            ['exec', 'van', 'SPRINTER', 'Mercedes-Benz Sprinter', 14, 14, 3],
            ['first', 'sedan', 'MID-SIZE SUV', 'Lincoln Aviator', 3, 4, 4],
            ['first', 'suv', 'FULL-SIZE SUV', 'Cadillac Escalade', 6, 6, 5],
            ['first', 'van', 'SPRINTER', 'Executive Sprinter', 11, 12, 6],
        ];

        foreach ($rows as [$class, $size, $category, $name, $passengers, $bags, $sort]) {
            Vehicle::updateOrCreate(
                ['slug' => str($name)->slug()->toString()],
                [
                    'name' => $name,
                    'class_type' => $class,
                    'category' => $category,
                    'form_value' => $class.'|'.$size,
                    'passengers' => $passengers,
                    'luggage' => $bags,
                    'sort_order' => $sort,
                    'is_active' => true,
                    'is_out_of_service' => false,
                ]
            );
        }
    }
}
