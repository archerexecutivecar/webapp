<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // 1. Add careers_enabled feature flag to platform_settings if missing
        if (Schema::hasTable('platform_settings') && !Schema::hasColumn('platform_settings', 'careers_enabled')) {
            Schema::table('platform_settings', function (Blueprint $table) {
                $table->boolean('careers_enabled')->default(true)->after('id');
            });
        }

        // 2. Create career_jobs table
        Schema::create('career_jobs', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('slug')->unique();
            $table->string('department');
            $table->string('location');
            $table->string('employment_type'); // Full-Time, Part-Time, Contract
            $table->string('salary_range')->nullable();
            $table->string('tier_recommendation')->nullable();
            $table->text('summary')->nullable();
            $table->longText('description');
            $table->json('requirements')->nullable();
            $table->json('benefits')->nullable();
            $table->string('status')->default('published'); // draft, published, paused, closed
            $table->integer('sort_order')->default(0);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->index(['status', 'sort_order']);
        });

        // 3. Create career_applications table
        Schema::create('career_applications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('career_job_id')->constrained('career_jobs')->cascadeOnDelete();
            $table->string('reference_code', 32)->unique();
            $table->string('full_name');
            $table->string('email');
            $table->string('phone');
            $table->string('city')->nullable();
            $table->string('selected_tier')->nullable(); // Tier selected by applicant
            $table->string('license_number')->nullable(); // TLC, CDL, or Security License
            $table->integer('years_experience')->nullable();
            $table->text('cover_note')->nullable();
            $table->string('status')->default('new'); // new, screening, interview, offer, hired, rejected, withdrawn
            $table->text('internal_notes')->nullable();
            $table->string('rejection_reason')->nullable();
            $table->timestamps();
            $table->index(['status', 'career_job_id']);
        });

        // 4. Create career_application_documents table
        Schema::create('career_application_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('career_application_id')->constrained('career_applications')->cascadeOnDelete();
            $table->string('document_type'); // resume, drivers_license, tlc_license, security_license, certification, other
            $table->string('title')->nullable();
            $table->string('file_name');
            $table->string('file_path');
            $table->unsignedBigInteger('file_size')->nullable();
            $table->string('mime_type')->nullable();
            $table->timestamps();
        });

        // Seed initial high-standard Archer roles
        DB::table('career_jobs')->insert([
            [
                'title' => 'Executive Chauffeur',
                'slug' => 'executive-chauffeur',
                'department' => 'Chauffeur Operations',
                'location' => 'New York, NY (Tri-State)',
                'employment_type' => 'Full-Time / Flexible Shifts',
                'salary_range' => '$35 - $48 / hr + Gratuities',
                'tier_recommendation' => 'Tier 2 · Executive',
                'summary' => 'Deliver white-glove executive transit across the Tri-State area for Archer C-suite and VIP clientele.',
                'description' => "Archer Executive Services is seeking distinguished Executive Chauffeurs to operate our pristine black car fleet. You will provide punctual, confidential, and comfortable transport to executive clients, diplomats, and VIP travelers.",
                'requirements' => json_encode([
                    'Valid TLC or commercial chauffeur license in good standing',
                    'Minimum 3 years professional passenger transit experience',
                    'Impeccable driving record (zero major moving violations)',
                    'Executive decorum, discretion, and fluent English communication',
                    'Expert knowledge of New York metropolitan routes and airport hubs',
                ]),
                'benefits' => json_encode([
                    'Competitive hourly compensation plus full gratuities',
                    'Late-model luxury vehicles provided and maintained by Archer',
                    'Flexible dispatch scheduling via Archer Driver App',
                    'Comprehensive commercial vehicle insurance',
                ]),
                'status' => 'published',
                'sort_order' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'title' => 'Executive Protection Specialist & Armed Driver',
                'slug' => 'executive-protection-specialist',
                'department' => 'Security Detail',
                'location' => 'New York / Global Transit',
                'employment_type' => 'Contract / On-Demand',
                'salary_range' => '$65 - $95 / hr',
                'tier_recommendation' => 'Tier 4 · Close Protection',
                'summary' => 'Provide close personal protection and tactical mobile security for high-threat clients and family offices.',
                'description' => "Join Archer's elite Protective Services Division. Responsible for low-profile physical protection, advance route reconnaissance, emergency motorcade maneuvers, and threat avoidance during client movement.",
                'requirements' => json_encode([
                    'Active state armed security / guard license and carry permit',
                    'Prior law enforcement, military protection, or accredited EP academy credentials',
                    'Evasive / tactical driving certification',
                    'First Aid / CPR / AED certified',
                ]),
                'benefits' => json_encode([
                    'Industry-leading compensation with minimum shift guarantees',
                    'Armored and tactical luxury fleet access',
                    'Direct collaboration with Archer Security Command Center',
                ]),
                'status' => 'published',
                'sort_order' => 2,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'title' => 'Operations & Dispatch Coordinator',
                'slug' => 'dispatch-coordinator',
                'department' => 'Dispatch & Logistics',
                'location' => 'Headquarters / Hybrid',
                'employment_type' => 'Full-Time',
                'salary_range' => '$70,000 - $85,000 / year',
                'tier_recommendation' => null,
                'summary' => 'Orchestrate real-time fleet movement, mission-critical flight tracking, and chauffeur assignments.',
                'description' => "Ensure every Archer mission runs strictly on time and with zero defects. As Dispatch Coordinator, you manage driver telematics, flight monitoring, client itinerary changes, and proactive operational rerouting.",
                'requirements' => json_encode([
                    '2+ years in high-volume luxury fleet or aviation dispatch',
                    'Calm demeanor under pressure with exceptional problem-solving acumen',
                    'Proficiency with CAD/dispatch software and flight tracking tools',
                ]),
                'benefits' => json_encode([
                    'Full healthcare benefits package and paid time off',
                    'Annual performance bonus',
                    'Hybrid remote schedule with HQ ops center shifts',
                ]),
                'status' => 'published',
                'sort_order' => 3,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('career_application_documents');
        Schema::dropIfExists('career_applications');
        Schema::dropIfExists('career_jobs');

        if (Schema::hasTable('platform_settings') && Schema::hasColumn('platform_settings', 'careers_enabled')) {
            Schema::table('platform_settings', function (Blueprint $table) {
                $table->dropColumn('careers_enabled');
            });
        }
    }
};
