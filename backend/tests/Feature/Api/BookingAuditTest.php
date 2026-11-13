<?php

namespace Tests\Feature\Api;

use App\Models\AuditLog;
use App\Models\RideRequest;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BookingAuditTest extends TestCase
{
    use RefreshDatabase;

    public function test_booking_audit_row_keeps_the_full_uuid_subject_id(): void
    {
        $ref = $this->postJson('/api/v1/booking-requests', [
            'request_type' => 'general', 'service' => 'hourly', 'pickup_address' => 'A', 'dropoff_address' => 'B',
            'date' => now()->addDay()->format('Y-m-d'), 'time' => '09:00', 'passengers' => 1, 'tier' => 1,
            'vehicle_class' => 'exec', 'vehicle_size' => 'suv', 'first_name' => 'Ada', 'last_name' => 'L',
            'phone' => '7325550100', 'email' => 'audit@example.com', 'terms_accepted' => true,
        ])->assertCreated()->json('data.reference');

        $ride = RideRequest::where('reference', $ref)->firstOrFail();
        $this->assertSame((string) $ride->id, (string) AuditLog::where('event', 'booking_request.created')->firstOrFail()->subject_id);
    }
}
