<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\CmsTestimonial;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TestimonialController extends Controller
{
    private const RULES = [
        'client_name' => 'required|string|max:255',
        'client_title' => 'nullable|string|max:255',
        'service_tag' => 'nullable|string|max:255',
        'quote' => 'required|string|max:2000',
        'rating' => 'nullable|integer|min:1|max:5',
        'sort_order' => 'nullable|integer|min:0',
        'is_active' => 'nullable|boolean',
    ];

    public function index(): JsonResponse
    {
        return ApiResponse::data(['testimonials' => CmsTestimonial::orderBy('sort_order')->orderBy('created_at')->get()]);
    }

    public function store(Request $request): JsonResponse
    {
        $testimonial = CmsTestimonial::create($request->validate(self::RULES));

        return ApiResponse::data(['testimonial' => $testimonial], 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $testimonial = CmsTestimonial::findOrFail($id);
        $rules = array_map(fn ($r) => str_starts_with($r, 'required') ? 'sometimes|' . $r : $r, self::RULES);
        $testimonial->update($request->validate($rules));

        return ApiResponse::data(['testimonial' => $testimonial->fresh()]);
    }

    public function destroy(string $id): JsonResponse
    {
        CmsTestimonial::findOrFail($id)->delete();

        return ApiResponse::data(['message' => 'Testimonial deleted successfully']);
    }
}
