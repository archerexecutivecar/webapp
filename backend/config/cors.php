<?php

return [
    'paths' => ['api/*'],
    'allowed_methods' => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    // Explicit origins only (comma-separated in .env); bearer tokens, so no credentialed cookies.
    'allowed_origins' => array_values(array_filter(array_map('trim', explode(',', env('CORS_ALLOWED_ORIGINS', 'http://localhost:3001'))))),
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['Authorization', 'Content-Type', 'Accept', 'Idempotency-Key'],
    'exposed_headers' => [],
    'max_age' => 600,
    'supports_credentials' => false,
];
