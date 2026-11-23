<?php

use App\Http\Controllers\Admin\AdminNotificationController;
use App\Http\Controllers\Admin\CmsPageController;
use App\Http\Controllers\Admin\CustomerController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\DriverController;
use App\Http\Controllers\Admin\NavigationController;
use App\Http\Controllers\Admin\RideDispatchController;
use App\Http\Controllers\Admin\RateCardController;
use App\Http\Controllers\Admin\SiteContentController;
use App\Http\Controllers\Admin\SiteTierController;
use App\Http\Controllers\Admin\SiteVehicleController;
use App\Http\Controllers\Admin\TestimonialController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\Customer\CustomerAuthController;
use App\Http\Controllers\Customer\CustomerPortalController;
use App\Http\Controllers\Driver\DriverPortalController;
use App\Http\Controllers\PublicBookingController;
use App\Http\Controllers\PublicBrandController;
use App\Http\Controllers\PublicContentController;
use App\Http\Controllers\PublicSiteController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function (): void {
    Route::get('/health', static fn () => response()->json([
        'data' => [
            'service' => 'archer-api',
            'status' => 'ok',
        ],
    ]));

    // Public CMS & Service Type Endpoints
    Route::get('/booking-options', [PublicContentController::class, 'bookingOptions']);
    Route::post('/quotes', [\App\Http\Controllers\QuoteController::class, 'store'])->middleware('throttle:60,1');
    Route::post('/ride-requests', [PublicContentController::class, 'submitRideRequest']);
    Route::post('/booking-requests', [PublicBookingController::class, 'store'])->middleware('throttle:public-submissions');
    Route::post('/assistant-profiles', [PublicBookingController::class, 'storeAssistantProfile'])->middleware('throttle:public-submissions');
    Route::get('/pages/{slug}', [PublicContentController::class, 'page']);
    Route::get('/testimonials', [PublicContentController::class, 'testimonials']);
    Route::get('/site', [PublicSiteController::class, 'show']);
    Route::get('/fleet-availability', [PublicSiteController::class, 'availability'])->middleware('throttle:60,1');
    Route::get('/brand', [PublicBrandController::class, 'show']);
    Route::get('/faqs', [PublicContentController::class, 'faqs']);

    // Public Careers Endpoints
    Route::get('/careers/status', [\App\Http\Controllers\PublicCareerController::class, 'status']);
    Route::get('/careers/tiers', [\App\Http\Controllers\PublicCareerController::class, 'tiers']);
    Route::get('/careers/jobs', [\App\Http\Controllers\PublicCareerController::class, 'index']);
    Route::get('/careers/jobs/{slug}', [\App\Http\Controllers\PublicCareerController::class, 'show']);
    Route::post('/careers/jobs/{id}/apply', [\App\Http\Controllers\PublicCareerController::class, 'apply'])->middleware('throttle:public-submissions');
    Route::post('/careers/track', [\App\Http\Controllers\PublicCareerController::class, 'track'])->middleware('throttle:60,1');

    // Customer account: register directly, sign in with an emailed code (no password), or with email + password via /auth/login.
    Route::prefix('customer')->group(function (): void {
        Route::post('/auth/register', [CustomerAuthController::class, 'register'])->middleware('throttle:customer-code');
        Route::post('/auth/code', [CustomerAuthController::class, 'requestCode'])->middleware('throttle:customer-code');
        Route::post('/auth/code/verify', [CustomerAuthController::class, 'verifyCode'])->middleware('throttle:customer-code-verify');

        Route::middleware(['auth:api', 'permission:self.profile'])->group(function (): void {
            Route::get('/me', [CustomerPortalController::class, 'me']);
            Route::put('/profile', [CustomerPortalController::class, 'updateProfile']);
            Route::get('/rides', [CustomerPortalController::class, 'rides']);
            Route::get('/rides/{id}', [CustomerPortalController::class, 'show']);
            Route::get('/rides/{id}/tracking', [CustomerPortalController::class, 'tracking']);
            Route::get('/assistant-profiles', [CustomerPortalController::class, 'assistantProfiles']);
            Route::put('/assistant-profiles/{reference}', [CustomerPortalController::class, 'updateAssistantProfile']);
            Route::put('/password', [CustomerAuthController::class, 'setPassword']);
        });
    });

    Route::prefix('auth')->group(function (): void {
        Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:login');
        Route::post('/password/forgot', [AuthController::class, 'forgotPassword'])->middleware('throttle:password-recovery');
        Route::post('/password/reset', [AuthController::class, 'resetPassword'])->middleware('throttle:password-recovery');

        Route::middleware('auth:api')->group(function (): void {
            Route::post('/logout', [AuthController::class, 'logout']);
            Route::get('/me', [AuthController::class, 'me']);
        });
    });

    Route::prefix('admin')->middleware('auth:api')->group(function (): void {
        Route::get('/navigation', [NavigationController::class, 'show']);
        Route::get('/dashboard', [DashboardController::class, 'show'])->middleware('permission:dashboard.view');

        // Admin Real-Time Notifications
        Route::get('/notifications', [AdminNotificationController::class, 'index']);
        Route::put('/notifications/{id}/read', [AdminNotificationController::class, 'markAsRead']);

        // Rides & Dispatch Management
        Route::middleware('permission:rides.view')->group(function (): void {
            Route::get('/rides', [RideDispatchController::class, 'index']);
            Route::post('/rides', [RideDispatchController::class, 'store']);
            Route::get('/rides/{id}', [RideDispatchController::class, 'show']);
            Route::put('/rides/{id}', [RideDispatchController::class, 'update']);
            Route::post('/rides/{id}/broadcast', [RideDispatchController::class, 'broadcast']);
            Route::post('/rides/{id}/record-agreement', [RideDispatchController::class, 'recordAgreement']);

            // Customer directory (read-only; opening a customer is audited)
            Route::get('/customers', [CustomerController::class, 'index']);
            Route::post('/customers', [CustomerController::class, 'store']);
            Route::get('/customers/{id}', [CustomerController::class, 'show'])->whereNumber('id');
            Route::put('/customers/{id}', [CustomerController::class, 'update'])->whereNumber('id');
            Route::get('/notices', [\App\Http\Controllers\Admin\CustomerNoticeController::class, 'index']);
            Route::post('/notices', [\App\Http\Controllers\Admin\CustomerNoticeController::class, 'store']);
        });

        Route::post('/customers/{id}/reset-credentials', [CustomerController::class, 'resetCredentials'])
            ->whereNumber('id')->middleware(['permission:rides.manage', 'throttle:30,1']);

        // CMS & Services Management (Protected by content.edit / content.publish permissions)
        Route::middleware('permission:content.edit')->group(function (): void {
            // Service Types

            // Security Add-ons

            // Client testimonials (website shows the section only when an active one exists)
            Route::get('/testimonials', [TestimonialController::class, 'index']);
            Route::post('/testimonials', [TestimonialController::class, 'store']);
            Route::put('/testimonials/{id}', [TestimonialController::class, 'update']);
            Route::delete('/testimonials/{id}', [TestimonialController::class, 'destroy']);

            // CMS Pages & Sections
            Route::get('/cms-pages', [CmsPageController::class, 'index']);
            Route::post('/cms-pages', [CmsPageController::class, 'store']);
            Route::get('/cms-pages/{id}', [CmsPageController::class, 'show']);
            Route::put('/cms-pages/{id}', [CmsPageController::class, 'update']);
            Route::post('/cms-pages/{id}/sections', [CmsPageController::class, 'saveSection']);
        });

        // Public-website content owned by Admin
        Route::middleware('permission:content.edit')->group(function (): void {
            Route::get('/site-content', [SiteContentController::class, 'index']);
            Route::get('/site-content/{key}', [SiteContentController::class, 'show']);
            Route::put('/site-content/{key}', [SiteContentController::class, 'update']);
        });
        Route::middleware('permission:tiers.manage')->group(function (): void {
            Route::get('/site-tiers', [SiteTierController::class, 'index']);
            Route::post('/site-tiers', [SiteTierController::class, 'store']);
            Route::put('/site-tiers/{id}', [SiteTierController::class, 'update']);
            Route::delete('/site-tiers/{id}', [SiteTierController::class, 'destroy']);
        });
        Route::middleware('permission:fleet.manage')->group(function (): void {
            Route::get('/site-vehicles', [SiteVehicleController::class, 'index']);
            Route::post('/site-vehicles', [SiteVehicleController::class, 'store']);
            Route::put('/site-vehicles/{id}', [SiteVehicleController::class, 'update']);
            Route::delete('/site-vehicles/{id}', [SiteVehicleController::class, 'destroy']);
            Route::get('/fleet/schedule', [\App\Http\Controllers\Admin\FleetScheduleController::class, 'index']);
            Route::post('/fleet/blockout', [\App\Http\Controllers\Admin\FleetScheduleController::class, 'blockout']);
            Route::post('/fleet/vehicles', [\App\Http\Controllers\Admin\FleetScheduleController::class, 'storeVehicle']);
            Route::put('/fleet/vehicles/{id}', [\App\Http\Controllers\Admin\FleetScheduleController::class, 'updateVehicle']);
            Route::delete('/fleet/vehicles/{id}', [\App\Http\Controllers\Admin\FleetScheduleController::class, 'destroyVehicle']);
        });
        Route::middleware('permission:pricing.manage')->group(function (): void {
            Route::get('/rates', [RateCardController::class, 'index']);
            Route::put('/rates', [RateCardController::class, 'update']);
            Route::get('/site-rates/matrix', [RateCardController::class, 'matrix']);
            Route::put('/site-rates/matrix', [RateCardController::class, 'updateMatrix']);
            Route::post('/site-rates/classes', [RateCardController::class, 'storeClass']);
            Route::post('/site-rates/sizes', [RateCardController::class, 'storeSize']);
            Route::post('/site-rates/tiers', [RateCardController::class, 'storeTier']);
            Route::post('/site-rates/classes/{key}/retire', [RateCardController::class, 'retireClass']);
            Route::post('/site-rates/classes/{key}/activate', [RateCardController::class, 'activateClass']);
            Route::delete('/site-rates/classes/{key}', [RateCardController::class, 'destroyClass']);
            Route::post('/site-rates/sizes/{key}/retire', [RateCardController::class, 'retireSize']);
            Route::post('/site-rates/sizes/{key}/activate', [RateCardController::class, 'activateSize']);
            Route::delete('/site-rates/sizes/{key}', [RateCardController::class, 'destroySize']);
            Route::post('/site-rates/tiers/{tier}/retire', [RateCardController::class, 'retireTier']);
            Route::post('/site-rates/tiers/{tier}/activate', [RateCardController::class, 'activateTier']);
            Route::delete('/site-rates/tiers/{tier}', [RateCardController::class, 'destroyTier']);
            Route::get('/pricing-settings', [\App\Http\Controllers\Admin\PricingSettingController::class, 'index']);
            Route::put('/pricing-settings/{service}', [\App\Http\Controllers\Admin\PricingSettingController::class, 'update']);
            Route::post('/pricing/simulate', [\App\Http\Controllers\QuoteController::class, 'store']);
        });

        Route::middleware('permission:payments.view')->group(function (): void {
            Route::get('/payments-earnings', [\App\Http\Controllers\Admin\PaymentsEarningsController::class, 'index']);
        });
        Route::post('/payments/stripe/intent', [\App\Http\Controllers\Admin\StripePaymentController::class, 'createIntent'])
            ->middleware('permission:payments.manage');

        Route::middleware('permission:payroll.view')->group(function (): void {
            Route::get('/payroll', [\App\Http\Controllers\Admin\PayrollController::class, 'index']);
            Route::get('/payroll/export', [\App\Http\Controllers\Admin\PayrollController::class, 'export']);
        });
        Route::post('/payroll/disbursements', [\App\Http\Controllers\Admin\PayrollController::class, 'recordDisbursement'])
            ->middleware('permission:payroll.manage');

        Route::middleware('permission:settings.manage')->group(function (): void {
            Route::get('/platform-settings', [\App\Http\Controllers\Admin\PlatformSettingsController::class, 'show']);
            Route::put('/platform-settings', [\App\Http\Controllers\Admin\PlatformSettingsController::class, 'update']);
            Route::post('/platform-settings/reset', [\App\Http\Controllers\Admin\PlatformSettingsController::class, 'reset']);
            Route::get('/integrations', [\App\Http\Controllers\Admin\IntegrationSettingsController::class, 'show']);
            Route::put('/integrations', [\App\Http\Controllers\Admin\IntegrationSettingsController::class, 'update']);
            Route::get('/brand-settings', [\App\Http\Controllers\Admin\BrandSettingsController::class, 'show']);
            Route::put('/brand-settings', [\App\Http\Controllers\Admin\BrandSettingsController::class, 'update']);

            // Dedicated Single-Touchpoint Careers Toggle Endpoint: /settings/careers
            Route::get('/careers/toggle', [\App\Http\Controllers\Admin\AdminCareerToggleController::class, 'show']);
            Route::put('/careers/toggle', [\App\Http\Controllers\Admin\AdminCareerToggleController::class, 'update']);
        });

        // Careers Jobs & Applications Management
        Route::middleware('permission:careers.manage,settings.manage')->group(function (): void {
            Route::get('/careers/jobs', [\App\Http\Controllers\Admin\AdminCareerJobController::class, 'index']);
            Route::post('/careers/jobs', [\App\Http\Controllers\Admin\AdminCareerJobController::class, 'store']);
            Route::get('/careers/jobs/{id}', [\App\Http\Controllers\Admin\AdminCareerJobController::class, 'show']);
            Route::put('/careers/jobs/{id}', [\App\Http\Controllers\Admin\AdminCareerJobController::class, 'update']);
            Route::patch('/careers/jobs/{id}/status', [\App\Http\Controllers\Admin\AdminCareerJobController::class, 'updateStatus']);
            Route::delete('/careers/jobs/{id}', [\App\Http\Controllers\Admin\AdminCareerJobController::class, 'destroy']);

            Route::get('/careers/applications', [\App\Http\Controllers\Admin\AdminCareerApplicationController::class, 'index']);
            Route::get('/careers/applications/{id}', [\App\Http\Controllers\Admin\AdminCareerApplicationController::class, 'show']);
            Route::patch('/careers/applications/{id}/status', [\App\Http\Controllers\Admin\AdminCareerApplicationController::class, 'updateStatus']);
            Route::patch('/careers/applications/{id}/notes', [\App\Http\Controllers\Admin\AdminCareerApplicationController::class, 'updateNotes']);
            Route::post('/careers/applications/{id}/convert-to-driver', [\App\Http\Controllers\Admin\AdminCareerApplicationController::class, 'convertToDriver']);
        });

        Route::get('/drivers', [DriverController::class, 'index'])->middleware('permission:drivers.view');
        Route::get('/drivers/{id}', [DriverController::class, 'show'])->middleware('permission:drivers.view');
        Route::middleware('permission:drivers.manage')->group(function (): void {
            Route::post('/drivers', [DriverController::class, 'store']);
            Route::put('/drivers/{id}', [DriverController::class, 'update']);
            Route::delete('/drivers/{id}', [DriverController::class, 'destroy']);
        });

        Route::prefix('security')->middleware('permission:security.view')->group(function (): void {
            Route::get('/leads', [\App\Http\Controllers\Admin\SecuritySuiteController::class, 'leads']);
            Route::get('/contracts', [\App\Http\Controllers\Admin\SecuritySuiteController::class, 'contractsAndShifts']);
            Route::get('/swaps', [\App\Http\Controllers\Admin\SecuritySuiteController::class, 'swaps']);
            Route::get('/credentials', [\App\Http\Controllers\Admin\SecuritySuiteController::class, 'credentials']);
            Route::get('/announcements', [\App\Http\Controllers\Admin\SecuritySuiteController::class, 'announcements']);
            Route::get('/leads/{id}', [\App\Http\Controllers\Admin\SecuritySuiteController::class, 'showLead']);
            Route::get('/contracts/{id}', [\App\Http\Controllers\Admin\SecuritySuiteController::class, 'showContract']);
        });
        Route::prefix('security')->middleware('permission:security.manage')->group(function (): void {
            Route::put('/leads/{id}/status', [\App\Http\Controllers\Admin\SecuritySuiteController::class, 'updateLeadStatus']);
            Route::post('/contracts', [\App\Http\Controllers\Admin\SecuritySuiteController::class, 'storeContract']);
            Route::put('/shifts/{id}/assign', [\App\Http\Controllers\Admin\SecuritySuiteController::class, 'assignShift']);
            Route::post('/swaps/{id}/decision', [\App\Http\Controllers\Admin\SecuritySuiteController::class, 'swapDecision']);
            Route::post('/credentials', [\App\Http\Controllers\Admin\SecuritySuiteController::class, 'storeCredential']);
            Route::put('/credentials/{id}', [\App\Http\Controllers\Admin\SecuritySuiteController::class, 'updateCredential']);
            Route::post('/announcements', [\App\Http\Controllers\Admin\SecuritySuiteController::class, 'storeAnnouncement']);
            Route::post('/leads', [\App\Http\Controllers\Admin\SecuritySuiteController::class, 'storeLead']);
            Route::put('/leads/{id}', [\App\Http\Controllers\Admin\SecuritySuiteController::class, 'updateLead']);
            Route::delete('/leads/{id}', [\App\Http\Controllers\Admin\SecuritySuiteController::class, 'destroyLead']);
            Route::post('/leads/{id}/convert', [\App\Http\Controllers\Admin\SecuritySuiteController::class, 'convertLead']);
            Route::put('/contracts/{id}', [\App\Http\Controllers\Admin\SecuritySuiteController::class, 'updateContract']);
            Route::post('/contracts/{id}/cancel', [\App\Http\Controllers\Admin\SecuritySuiteController::class, 'cancelContract']);
            Route::delete('/contracts/{id}', [\App\Http\Controllers\Admin\SecuritySuiteController::class, 'destroyContract']);
            Route::post('/shifts', [\App\Http\Controllers\Admin\SecuritySuiteController::class, 'storeShift']);
            Route::put('/shifts/{id}', [\App\Http\Controllers\Admin\SecuritySuiteController::class, 'updateShift']);
            Route::delete('/shifts/{id}', [\App\Http\Controllers\Admin\SecuritySuiteController::class, 'destroyShift']);
            Route::post('/shifts/{id}/unassign', [\App\Http\Controllers\Admin\SecuritySuiteController::class, 'unassignShift']);
            Route::post('/swaps', [\App\Http\Controllers\Admin\SecuritySuiteController::class, 'storeSwap']);
            Route::post('/swaps/{id}/withdraw', [\App\Http\Controllers\Admin\SecuritySuiteController::class, 'withdrawSwap']);
            Route::delete('/credentials/{id}', [\App\Http\Controllers\Admin\SecuritySuiteController::class, 'destroyCredential']);
            Route::put('/announcements/{id}', [\App\Http\Controllers\Admin\SecuritySuiteController::class, 'updateAnnouncement']);
            Route::delete('/announcements/{id}', [\App\Http\Controllers\Admin\SecuritySuiteController::class, 'destroyAnnouncement']);
        });

    });

    // Public publishable config for Maps / Stripe (never returns secrets)
    Route::get('/integrations/public', [\App\Http\Controllers\Admin\IntegrationSettingsController::class, 'publicConfig']);

    // Stripe webhooks (signature-verified; no auth middleware)
    Route::post('/webhooks/stripe', [\App\Http\Controllers\StripeWebhookController::class, 'handle'])
        ->middleware('throttle:120,1');

    // Support both /api/v1/security/* and /api/v1/admin/security/* aliases
    Route::prefix('security')->middleware(['auth:api', 'permission:security.view'])->group(function (): void {
        Route::get('/leads', [\App\Http\Controllers\Admin\SecuritySuiteController::class, 'leads']);
        Route::get('/contracts', [\App\Http\Controllers\Admin\SecuritySuiteController::class, 'contractsAndShifts']);
        Route::get('/swaps', [\App\Http\Controllers\Admin\SecuritySuiteController::class, 'swaps']);
        Route::get('/credentials', [\App\Http\Controllers\Admin\SecuritySuiteController::class, 'credentials']);
        Route::get('/announcements', [\App\Http\Controllers\Admin\SecuritySuiteController::class, 'announcements']);
    });
    Route::prefix('security')->middleware(['auth:api', 'permission:security.manage'])->group(function (): void {
        Route::put('/leads/{id}/status', [\App\Http\Controllers\Admin\SecuritySuiteController::class, 'updateLeadStatus']);
        Route::post('/contracts', [\App\Http\Controllers\Admin\SecuritySuiteController::class, 'storeContract']);
        Route::put('/shifts/{id}/assign', [\App\Http\Controllers\Admin\SecuritySuiteController::class, 'assignShift']);
        Route::post('/swaps/{id}/decision', [\App\Http\Controllers\Admin\SecuritySuiteController::class, 'swapDecision']);
        Route::post('/announcements', [\App\Http\Controllers\Admin\SecuritySuiteController::class, 'storeAnnouncement']);
    });

    // Driver Portal APIs
    Route::prefix('driver')->middleware(['auth:api', 'permission:driver.portal'])->group(function (): void {
        Route::get('/profile', [DriverPortalController::class, 'profile']);
        Route::put('/presence', [DriverPortalController::class, 'updatePresence']);
        Route::post('/location', [DriverPortalController::class, 'updateLocation'])->middleware('throttle:60,1');
        Route::get('/offers', [DriverPortalController::class, 'offers']);
        Route::post('/offers/{rideId}/accept', [DriverPortalController::class, 'acceptOffer']);
        Route::get('/rides', [DriverPortalController::class, 'myRides']);
        Route::get('/earnings', [DriverPortalController::class, 'earnings']);
        Route::get('/security-shifts', [DriverPortalController::class, 'mySecurityShifts']);
        Route::put('/rides/{rideId}/status', [DriverPortalController::class, 'updateRideStatus']);
        Route::get('/notifications', [DriverPortalController::class, 'notifications']);
        Route::put('/notifications/{id}/read', [DriverPortalController::class, 'markNotificationRead']);
    });
});
