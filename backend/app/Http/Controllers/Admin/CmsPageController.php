<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\CmsPage;
use App\Models\CmsSection;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class CmsPageController extends Controller
{
    /** List all CMS pages */
    public function index(): JsonResponse
    {
        $pages = CmsPage::withCount('sections')->orderBy('slug')->get();

        return ApiResponse::data(['pages' => $pages]);
    }

    /** Store new CMS page */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255', 'unique:cms_pages,slug'],
            'meta_title' => ['nullable', 'string', 'max:255'],
            'meta_description' => ['nullable', 'string'],
            'og_image_url' => ['nullable', 'string', 'max:500'],
            'status' => ['nullable', 'in:draft,published'],
        ]);

        $validated['slug'] = !empty($validated['slug'])
            ? Str::slug($validated['slug'])
            : Str::slug($validated['title']);

        if (($validated['status'] ?? 'draft') === 'published') {
            $validated['published_at'] = now();
        }

        $page = CmsPage::create($validated);

        return ApiResponse::created(['page' => $page]);
    }

    /** Show single page with sections */
    public function show(string $id): JsonResponse
    {
        $page = CmsPage::with('sections')->findOrFail($id);

        return ApiResponse::data(['page' => $page]);
    }

    /** Update CMS page details */
    public function update(Request $request, string $id): JsonResponse
    {
        $page = CmsPage::findOrFail($id);

        $validated = $request->validate([
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'slug' => ['sometimes', 'required', 'string', 'max:255', Rule::unique('cms_pages', 'slug')->ignore($page->id)],
            'meta_title' => ['nullable', 'string', 'max:255'],
            'meta_description' => ['nullable', 'string'],
            'og_image_url' => ['nullable', 'string', 'max:500'],
            'status' => ['nullable', 'in:draft,published'],
        ]);

        if (isset($validated['slug'])) {
            $validated['slug'] = Str::slug($validated['slug']);
        }

        if (isset($validated['status']) && $validated['status'] === 'published' && !$page->published_at) {
            $validated['published_at'] = now();
        }

        $page->update($validated);

        return ApiResponse::data(['page' => $page]);
    }

    /** Upsert or update a section inside a page */
    public function saveSection(Request $request, string $pageId): JsonResponse
    {
        $page = CmsPage::findOrFail($pageId);

        $validated = $request->validate([
            'id' => ['nullable', 'uuid', 'exists:cms_sections,id'],
            'section_key' => ['required', 'string', 'max:100'],
            'title' => ['nullable', 'string', 'max:255'],
            'subtitle' => ['nullable', 'string', 'max:255'],
            'content' => ['required', 'array'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        if (!empty($validated['id'])) {
            $section = CmsSection::where('cms_page_id', $page->id)->findOrFail($validated['id']);
            $section->update($validated);
        } else {
            $validated['cms_page_id'] = $page->id;
            $section = CmsSection::create($validated);
        }

        return ApiResponse::data(['section' => $section]);
    }
}
