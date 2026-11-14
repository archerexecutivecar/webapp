<?php

namespace App\Support\Pricing;

use RuntimeException;

/** A quote cannot be produced from the Admin data as it stands; carries an API error code and the field to blame. */
class QuoteException extends RuntimeException
{
    public function __construct(public readonly string $errorCode, string $message, public readonly string $field)
    {
        parent::__construct($message);
    }
}
