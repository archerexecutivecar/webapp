<?php

namespace App\Support;

class IntegrationSecretMask
{
    public const PLACEHOLDER_PREFIX = '••••';

    public static function mask(?string $secret): ?string
    {
        if ($secret === null || $secret === '') {
            return null;
        }

        $len = strlen($secret);
        if ($len <= 4) {
            return self::PLACEHOLDER_PREFIX;
        }

        return self::PLACEHOLDER_PREFIX . substr($secret, -4);
    }

    public static function isConfigured(?string $secret): bool
    {
        return $secret !== null && $secret !== '';
    }

    /** Write-only updates: skip empty values and mask placeholders sent back from the UI. */
    public static function shouldPersistIncoming(?string $value): bool
    {
        if ($value === null || $value === '') {
            return false;
        }

        return ! str_starts_with($value, self::PLACEHOLDER_PREFIX);
    }
}