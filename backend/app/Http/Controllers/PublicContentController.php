<?php

namespace App\Http\Controllers;

use App\Models\CmsFaq;
use App\Models\AdminNotification;
use App\Models\CmsPage;
use App\Models\CmsTestimonial;
use App\Models\Driver;
use App\Models\DriverTier;
use App\Models\RideRequest;
use App\Models\SecurityAddon;
use App\Models\ServiceType;
use App\Support\ApiResponse;
use App\Support\CustomerMailer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PublicContentController extends Controller
{
    /** Returns public active services for website & client apps */
    public function services(): JsonResponse
    {
        $services = ServiceType::active()->get();

        return ApiResponse::data(['services' => $services]);
    }

    /** Returns public options for the request ride form */
    public function bookingOptions(): JsonResponse
    {
        $services = ServiceType::active()->get(['id', 'slug', 'name', 'tagline', 'badge', 'min_hours']);
        $tiers = DriverTier::where('is_active', true)->orderBy('sort_order', 'asc')->get();
        $securityAddons = SecurityAddon::where('is_active', true)->orderBy('sort_order', 'asc')->get();
        $drivers = Driver::where('is_active', true)->orderBy('sort_order', 'asc')->get(['id', 'name', 'avatar_url', 'bio']);

        return ApiResponse::data([
            'services' => $services,
            'tiers' => $tiers,
            'security_addons' => $securityAddons,
            'drivers' => $drivers,
        ]);
    }

    /** Creates a new ride request from the public form */
    public function submitRideRequest(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'first_name' => 'required|string|max:100',
            'last_name' => 'nullable|string|max:100',
            'email' => 'nullable|email|max:150',
            'phone' => 'required|string|max:50',
            'pickup_location' => 'nullable|string|max:255',
            'dropoff_location' => 'nullable|string|max:255',
            'service_type' => 'required|string|max:100',
            'driver_tier' => 'required|string|max:50',
            'ride_date' => 'required|string|max:50',
            'ride_time' => 'required|string|max:50',
            'vehicle' => 'required|string|max:100',
            'security_addon' => 'nullable|string|max:50',
            'driver_preference' => 'nullable|string|max:150',
        ]);

        $reference = 'AR-' . mt_rand(1000, 9999);
        while (RideRequest::where('reference', $reference)->exists()) {
            $reference = 'AR-' . mt_rand(1000, 9999);
        }

        $validated['reference'] = $reference;
        $validated['status'] = 'pending';

        $ride = RideRequest::create($validated);

        CustomerMailer::sendBookingConfirmation($ride);

        // Notify Admin & Dispatch team in real-time
        AdminNotification::create([
            'ride_request_id' => $ride->id,
            'title' => 'New Ride Booking (' . $ride->reference . ')',
            'message' => 'Passenger ' . $ride->first_name . ' ' . $ride->last_name . ' requested ' . ($ride->service_type ?? 'travel') . ' for ' . $ride->ride_date . ' at ' . $ride->ride_time . ($ride->pickup_location ? ' from ' . $ride->pickup_location : '') . '.',
            'type' => 'ride_request',
            'is_read' => false,
        ]);

        return ApiResponse::data([
            'reference' => $ride->reference,
            'status' => $ride->status,
            'message' => 'Ride request successfully registered with dispatch.',
        ], 201);
    }

    /** Returns public page content & sections by slug */
    public function page(string $slug): JsonResponse
    {
        $page = CmsPage::where('slug', $slug)
            ->where('status', 'published')
            ->with(['sections' => fn ($query) => $query->where('is_active', true)->orderBy('sort_order', 'asc')])
            ->firstOrFail();

        return ApiResponse::data(['page' => $page]);
    }

    /** Returns active testimonials */
    public function testimonials(): JsonResponse
    {
        $testimonials = CmsTestimonial::where('is_active', true)
            ->orderBy('sort_order', 'asc')
            ->get();

        return ApiResponse::data(['testimonials' => $testimonials]);
    }

    /** Returns active FAQs */
    public function faqs(): JsonResponse
    {
        $faqs = CmsFaq::where('is_active', true)
            ->orderBy('sort_order', 'asc')
            ->get();

        return ApiResponse::data(['faqs' => $faqs]);
    }
}
