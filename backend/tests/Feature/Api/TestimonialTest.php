<?php

namespace Tests\Feature\Api;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\CreatesStaff;
use Tests\TestCase;

class TestimonialTest extends TestCase
{
    use CreatesStaff, RefreshDatabase;

    public function test_public_list_is_empty_until_admin_adds_one_and_hides_inactive(): void
    {
        $this->getJson('/api/v1/testimonials')->assertOk()->assertJsonCount(0, 'data.testimonials');

        [, $h] = $this->actingAsRole('super_admin');
        $id = $this->postJson('/api/v1/admin/testimonials', ['client_name' => 'A. Client', 'quote' => 'Superb.'], $h)
            ->assertCreated()->json('data.testimonial.id');

        $this->getJson('/api/v1/testimonials')->assertJsonCount(1, 'data.testimonials');

        $this->putJson("/api/v1/admin/testimonials/{$id}", ['is_active' => false], $h)->assertOk();
        $this->getJson('/api/v1/testimonials')->assertJsonCount(0, 'data.testimonials');

        $this->deleteJson("/api/v1/admin/testimonials/{$id}", [], $h)->assertOk();
    }

    public function test_validation_and_authorization(): void
    {
        $this->postJson('/api/v1/admin/testimonials', ['client_name' => 'X', 'quote' => 'Y'])->assertUnauthorized();

        [, $h] = $this->actingAsRole('super_admin');
        $this->postJson('/api/v1/admin/testimonials', ['client_name' => 'X'], $h)->assertUnprocessable();
        $this->postJson('/api/v1/admin/testimonials', ['client_name' => 'X', 'quote' => 'Y', 'rating' => 9], $h)->assertUnprocessable();
    }
}
