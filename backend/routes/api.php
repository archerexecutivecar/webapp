<?php

use App\Http\Controllers\Admin\AdminNotificationController;
use App\Http\Controllers\Admin\CmsPageController;
use App\Http\Controllers\Admin\CustomerController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\DriverController;
use App\Http\Controllers\Admin\DriverTierController;
use App\Http\Controllers\Admin\NavigationController;
use App\Http\Controllers\Admin\RideDispatchController;
use App\Http\Controllers\Admin\SecurityAddonController;
use App\Http\Controllers\Admin\ServiceTypeController;
use App\Http\Controllers\Admin\RateCardController;
use App\Http\Controllers\Admin\SiteContentController;
use App\Http\Controllers\Admin\SiteTierController;
use App\Http\Controllers\Admin\SiteVehicleController;
use App\Http\Controllers\Admin\TestimonialController;
use App\Http\Controllers\Admin\VehicleController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\Customer\CustomerAuthController;
use App\Http\Controllers\Customer\CustomerPortalController;
use App\Http\Controllers\Driver\DriverPortalController;
use App\Http\Controllers\PublicBookingController;
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
    Route::get('/services', [PublicContentController::class, 'services']);
    Route::get('/booking-options', [PublicContentController::class, 'bookingOptions']);
    Route::post('/ride-requests', [PublicContentController::class, 'submitRideRequest']);
    Route::post('/booking-requests', [PublicBookingController::class, 'store'])->middleware('throttle:public-submissions');
    Route::post('/assistant-profiles', [PublicBookingController::class, 'storeAssistantProfile'])->middleware('throttle:public-submissions');
    Route::get('/pages/{slug}', [PublicContentController::class, 'page']);
    Route::get('/testimonials', [PublicContentController::class, 'testimonials']);
    Route::get('/site', [PublicSiteController::class, 'show']);
    Route::get('/faqs', [PublicContentController::class, 'faqs']);

    // Customer account: register directly, sign in with an emailed code (no password), or with email + password via /auth/login.
    Route::prefix('customer')->group(function (): void {
        Route::post('/auth/register', [CustomerAuthController::class, 'register'])->middleware('throttle:customer-code');
        Route::post('/auth/code', [CustomerAuthController::class, 'requestCode'])->middleware('throttle:customer-code');
        Route::post('/auth/code/verify', [CustomerAuthController::class, 'verifyCode'])->middleware('throttle:customer-code-verify');

        Route::middleware(['auth:api', 'permission:self.profile'])->group(function (): void {
            Route::get('/me', [CustomerPortalController::class, 'me']);
            Route::get('/rides', [CustomerPortalController::class, 'rides']);
            Route::get('/rides/{id}', [CustomerPortalController::class, 'show']);
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
            Route::get('/rides/{id}', [RideDispatchController::class, 'show']);
            Route::put('/rides/{id}', [RideDispatchController::class, 'update']);

            // Customer directory (read-only; opening a customer is audited)
            Route::get('/customers', [CustomerController::class, 'index']);
            Route::get('/customers/{id}', [CustomerController::class, 'show'])->whereNumber('id');
        });

        Route::post('/customers/{id}/reset-credentials', [CustomerController::class, 'resetCredentials'])
            ->whereNumber('id')->middleware(['permission:rides.manage', 'throttle:30,1']);

        // CMS & Services Management (Protected by content.edit / content.publish permissions)
        Route::middleware('permission:content.edit')->group(function (): void {
            // Service Types
            Route::get('/services', [ServiceTypeController::class, 'index']);
            Route::post('/services', [ServiceTypeController::class, 'store']);
            Route::get('/services/{id}', [ServiceTypeController::class, 'show']);
            Route::put('/services/{id}', [ServiceTypeController::class, 'update']);
            Route::delete('/services/{id}', [ServiceTypeController::class, 'destroy']);
            Route::post('/services/reorder', [ServiceTypeController::class, 'reorder']);

            // Security Add-ons
            Route::get('/security-addons', [SecurityAddonController::class, 'index']);
            Route::post('/security-addons', [SecurityAddonController::class, 'store']);
            Route::get('/security-addons/{id}', [SecurityAddonController::class, 'show']);
            Route::put('/security-addons/{id}', [SecurityAddonController::class, 'update']);
            Route::delete('/security-addons/{id}', [SecurityAddonController::class, 'destroy']);

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
        });
        Route::middleware('permission:pricing.manage')->group(function (): void {
            Route::get('/rates', [RateCardController::class, 'index']);
            Route::put('/rates', [RateCardController::class, 'update']);
        });

        // Driver Tiers & Drivers (Protected by tiers.manage & drivers.manage permissions)
        Route::middleware('permission:tiers.manage')->group(function (): void {
            Route::get('/tiers', [DriverTierController::class, 'index']);
            Route::post('/tiers', [DriverTierController::class, 'store']);
            Route::get('/tiers/{id}', [DriverTierController::class, 'show']);
            Route::put('/tiers/{id}', [DriverTierController::class, 'update']);
            Route::delete('/tiers/{id}', [DriverTierController::class, 'destroy']);
        });

        Route::middleware('permission:drivers.manage')->group(function (): void {
            Route::get('/drivers', [DriverController::class, 'index']);
            Route::post('/drivers', [DriverController::class, 'store']);
            Route::get('/drivers/{id}', [DriverController::class, 'show']);
            Route::put('/drivers/{id}', [DriverController::class, 'update']);
            Route::delete('/drivers/{id}', [DriverController::class, 'destroy']);
        });

        // Fleet / Vehicles (Protected by fleet.manage permission)
        Route::middleware('permission:fleet.manage')->group(function (): void {
            Route::get('/vehicles', [VehicleController::class, 'index']);
            Route::post('/vehicles', [VehicleController::class, 'store']);
            Route::get('/vehicles/{id}', [VehicleController::class, 'show']);
            Route::put('/vehicles/{id}', [VehicleController::class, 'update']);
            Route::delete('/vehicles/{id}', [VehicleController::class, 'destroy']);
        });
    });

    // Driver Portal APIs (Authenticated Driver)
    Route::prefix('driver')->middleware('auth:api')->group(function (): void {
        Route::get('/profile', [DriverPortalController::class, 'profile']);
        Route::get('/rides', [DriverPortalController::class, 'myRides']);
        Route::put('/rides/{rideId}/status', [DriverPortalController::class, 'updateRideStatus']);
        Route::get('/notifications', [DriverPortalController::class, 'notifications']);
        Route::put('/notifications/{id}/read', [DriverPortalController::class, 'markNotificationRead']);
    });
});
