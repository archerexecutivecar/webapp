<?php

namespace Tests\Feature\Api;

use Tests\TestCase;

class HealthCheckTest extends TestCase
{
    public function test_the_versioned_health_endpoint_returns_a_minimal_service_status(): void
    {
        $this->getJson('/api/v1/health')
            ->assertOk()
            ->assertExactJson([
                'data' => [
                    'service' => 'archer-api',
                    'status' => 'ok',
                ],
            ]);
    }
}
