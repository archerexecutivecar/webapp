<?php

use App\Http\Middleware\RequirePermission;
use App\Support\ApiResponse;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\HttpKernel\Exception\TooManyRequestsHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // API-only guest handling: never redirect to a login route.
        $middleware->redirectGuestsTo(fn () => null);
        $middleware->alias(['permission' => RequirePermission::class]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(fn (Request $request) => $request->is('api/*') || $request->expectsJson());

        $exceptions->render(fn (ValidationException $e, Request $r) => $r->is('api/*')
            ? ApiResponse::error('VALIDATION_FAILED', 'The given data was invalid.', 422, $e->errors()) : null);

        $exceptions->render(fn (AuthenticationException $e, Request $r) => $r->is('api/*')
            ? ApiResponse::error('UNAUTHENTICATED', 'Authentication is required.', 401) : null);

        $exceptions->render(fn (ModelNotFoundException|NotFoundHttpException $e, Request $r) => $r->is('api/*')
            ? ApiResponse::error('NOT_FOUND', 'The requested resource was not found.', 404) : null);

        $exceptions->render(fn (TooManyRequestsHttpException $e, Request $r) => $r->is('api/*')
            ? ApiResponse::error('TOO_MANY_REQUESTS', 'Too many attempts. Please try again later.', 429) : null);

        $exceptions->render(function (Throwable $e, Request $r) {
            if (! $r->is('api/*')) {
                return null;
            }
            if ($e instanceof HttpExceptionInterface && $e->getStatusCode() < 500) {
                return ApiResponse::error('HTTP_ERROR', $e->getMessage() ?: 'Request could not be processed.', $e->getStatusCode());
            }

            // Never leak internals; the exception is still reported to the log.
            return ApiResponse::error('INTERNAL_ERROR', 'An unexpected error occurred.', 500);
        });
    })->create();
