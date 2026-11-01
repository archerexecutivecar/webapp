<?php

namespace App\Http\Controllers;

use App\Models\CmsFaq;
use App\Models\CmsPage;
use App\Models\CmsTestimonial;
use App\Models\ServiceType;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;

class PublicContentController extends Controller
{
    /** Returns public active services for website & client apps */
    public function services(): JsonResponse
    {
        $services = ServiceType::active()->get();

        return ApiResponse::data(['services' => $services]);
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
