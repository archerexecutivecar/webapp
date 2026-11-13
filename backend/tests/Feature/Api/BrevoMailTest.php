<?php

namespace Tests\Feature\Api;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Symfony\Component\Mailer\Exception\TransportException;
use Tests\TestCase;

class BrevoMailTest extends TestCase
{
    public function test_brevo_transport_posts_the_message_with_the_api_key_header(): void
    {
        config(['mail.default' => 'brevo', 'mail.mailers.brevo.key' => 'test-key', 'mail.from' => ['address' => 'no-reply@example.com', 'name' => 'Archer']]);
        Http::fake(['api.brevo.com/*' => Http::response(['messageId' => 'x'], 201)]);

        Mail::raw('Your code is 123456', fn ($m) => $m->to('ada@example.com')->subject('Code'));

        Http::assertSent(fn ($r) => $r->url() === 'https://api.brevo.com/v3/smtp/email'
            && $r->header('api-key')[0] === 'test-key'
            && $r['sender']['email'] === 'no-reply@example.com'
            && $r['to'][0]['email'] === 'ada@example.com'
            && $r['subject'] === 'Code'
            && str_contains($r['textContent'], '123456'));
    }

    public function test_a_brevo_error_surfaces_without_leaking_the_key(): void
    {
        config(['mail.default' => 'brevo', 'mail.mailers.brevo.key' => 'secret-key-value', 'mail.from' => ['address' => 'no-reply@example.com', 'name' => 'Archer']]);
        Http::fake(['api.brevo.com/*' => Http::response(['message' => 'sender not valid'], 400)]);

        try {
            Mail::raw('x', fn ($m) => $m->to('ada@example.com')->subject('s'));
            $this->fail('Expected a TransportException');
        } catch (TransportException $e) {
            $this->assertStringContainsString('400', $e->getMessage());
            $this->assertStringNotContainsString('secret-key-value', $e->getMessage());
        }
    }
}
