<?php

namespace App\Mail;

use Illuminate\Support\Facades\Http;
use Symfony\Component\Mailer\Envelope;
use Symfony\Component\Mailer\Exception\TransportException;
use Symfony\Component\Mailer\SentMessage;
use Symfony\Component\Mailer\Transport\AbstractTransport;
use Symfony\Component\Mime\Address;
use Symfony\Component\Mime\Email;
use Symfony\Component\Mime\MessageConverter;

/**
 * Sends transactional email through Brevo's HTTP API (POST /v3/smtp/email).
 * The API key comes from configuration (BREVO_API_KEY in the server environment) and is never stored in code.
 * The From address must be a sender/domain verified in the Brevo account.
 */
class BrevoTransport extends AbstractTransport
{
    public function __construct(private readonly string $apiKey, private readonly string $endpoint = 'https://api.brevo.com/v3/smtp/email')
    {
        parent::__construct();
    }

    protected function doSend(SentMessage $message): void
    {
        /** @var Email $email */
        $email = MessageConverter::toEmail($message->getOriginalMessage());
        $addr = fn (Address $a) => array_filter(['email' => $a->getAddress(), 'name' => $a->getName() ?: null]);

        $from = $email->getFrom()[0] ?? null;
        if (! $from) {
            throw new TransportException('Brevo: message has no From address.');
        }

        $payload = array_filter([
            'sender' => $addr($from),
            'to' => array_map($addr, $email->getTo()),
            'cc' => array_map($addr, $email->getCc()) ?: null,
            'bcc' => array_map($addr, $email->getBcc()) ?: null,
            'replyTo' => isset($email->getReplyTo()[0]) ? $addr($email->getReplyTo()[0]) : null,
            'subject' => $email->getSubject(),
            'htmlContent' => $email->getHtmlBody() ?: null,
            'textContent' => $email->getTextBody() ?: null,
        ]);

        $res = Http::withHeaders(['api-key' => $this->apiKey, 'accept' => 'application/json'])
            ->timeout(15)->post($this->endpoint, $payload);

        if ($res->failed()) {
            // Never include the key; the response body from Brevo is safe to log.
            throw new TransportException('Brevo rejected the message ('.$res->status().'): '.mb_substr($res->body(), 0, 300));
        }
    }

    public function __toString(): string
    {
        return 'brevo';
    }
}
