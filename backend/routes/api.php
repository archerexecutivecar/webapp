<?php

use App\Http\Controllers\Admin\CmsPageController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\NavigationController;
use App\Http\Controllers\Admin\ServiceTypeController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\PublicContentController;
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
    Route::get('/pages/{slug}', [PublicContentController::class, 'page']);
    Route::get('/testimonials', [PublicContentController::class, 'testimonials']);
    Route::get('/faqs', [PublicContentController::class, 'faqs']);

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

        // CMS & Services Management (Protected by content.edit / content.publish permissions)
        Route::middleware('permission:content.edit')->group(function (): void {
            // Service Types
            Route::get('/services', [ServiceTypeController::class, 'index']);
            Route::post('/services', [ServiceTypeController::class, 'store']);
            Route::get('/services/{id}', [ServiceTypeController::class, 'show']);
            Route::put('/services/{id}', [ServiceTypeController::class, 'update']);
            Route::delete('/services/{id}', [ServiceTypeController::class, 'destroy']);
            Route::post('/services/reorder', [ServiceTypeController::class, 'reorder']);

            // CMS Pages & Sections
            Route::get('/cms-pages', [CmsPageController::class, 'index']);
            Route::post('/cms-pages', [CmsPageController::class, 'store']);
            Route::get('/cms-pages/{id}', [CmsPageController::class, 'show']);
            Route::put('/cms-pages/{id}', [CmsPageController::class, 'update']);
            Route::post('/cms-pages/{id}/sections', [CmsPageController::class, 'saveSection']);
        });
    });
});
