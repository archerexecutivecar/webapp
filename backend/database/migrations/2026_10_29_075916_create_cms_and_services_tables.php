<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Service Types Table (Admin can add, edit, reorder, soft delete)
        Schema::create('service_types', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('slug')->unique();
            $table->string('name');
            $table->string('tagline')->nullable();
            $table->text('description')->nullable();
            $table->string('badge')->nullable(); // e.g. "Most Popular", "Tailored"
            $table->string('icon')->nullable(); // Lucide icon identifier or image path
            $table->string('image_url')->nullable();
            $table->jsonb('features')->nullable(); // bullet highlights: ["Flight tracking", "Curbside greeting"]
            $table->unsignedInteger('min_hours')->default(0); // e.g., 4 for hourly, 3 for client car
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true)->index();
            $table->jsonb('meta')->nullable(); // Extensible SEO / booking config
            $table->timestamps();
            $table->softDeletes();
        });

        // 2. CMS Pages Table (e.g. Home, Airport Transfers, About, Terms)
        Schema::create('cms_pages', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('slug')->unique();
            $table->string('title');
            $table->string('meta_title')->nullable();
            $table->text('meta_description')->nullable();
            $table->string('og_image_url')->nullable();
            $table->string('status', 32)->default('published')->index(); // 'draft', 'published'
            $table->timestamp('published_at')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        // 3. CMS Dynamic Sections / Blocks (linked to pages or global)
        Schema::create('cms_sections', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('cms_page_id')->nullable()->constrained('cms_pages')->cascadeOnDelete();
            $table->string('section_key'); // e.g. 'hero', 'stats_strip', 'archer_difference', 'faq'
            $table->string('title')->nullable();
            $table->string('subtitle')->nullable();
            $table->jsonb('content'); // Flexible key-value data specific to block type
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['cms_page_id', 'section_key']);
        });

        // 4. Client Testimonials / "Client Voices"
        Schema::create('cms_testimonials', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('client_name');
            $table->string('client_title')->nullable(); // e.g. "Family Office Principal"
            $table->string('service_tag')->nullable(); // e.g. "Archer Black Member"
            $table->text('quote');
            $table->unsignedTinyInteger('rating')->default(5);
            $table->string('avatar_url')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true)->index();
            $table->timestamps();
            $table->softDeletes();
        });

        // 5. Frequently Asked Questions (FAQs)
        Schema::create('cms_faqs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('category')->default('General'); // e.g., 'Reservations', 'Airports', 'Client Car'
            $table->string('question');
            $table->text('answer');
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true)->index();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cms_faqs');
        Schema::dropIfExists('cms_testimonials');
        Schema::dropIfExists('cms_sections');
        Schema::dropIfExists('cms_pages');
        Schema::dropIfExists('service_types');
    }
};
