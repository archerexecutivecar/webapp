<?php

namespace App\Support;

/**
 * Validation for an EA/PA profile, shared by the public sign-up form (POST /v1/assistant-profiles)
 * and the customer's own edits (PUT /v1/customer/assistant-profiles/{reference}), so both accept exactly the same data.
 */
class AssistantProfileRules
{
    /** The nested sections stored in assistant_profiles.data. */
    public const SECTIONS = ['about', 'company_info', 'people', 'billing'];

    public static function sections(): array
    {
        $short = ['nullable', 'string', 'max:150'];
        $long = ['nullable', 'string', 'max:2000'];

        return [
            'about' => ['nullable', 'array'],
            'about.title' => $short, 'about.office' => $short, 'about.hours' => $short, 'about.contact_method' => $short,
            'about.backup_name' => $short, 'about.backup_phone' => $short, 'about.backup_email' => ['nullable', 'email', 'max:150'],
            'company_info' => ['nullable', 'array'],
            'company_info.industry' => $short, 'company_info.phone' => $short, 'company_info.address' => $short, 'company_info.city' => $short,
            'company_info.website' => $short, 'company_info.arrival' => $long, 'company_info.booking_for' => $short,
            'people' => ['nullable', 'array', 'max:10'],
            'people.*.name' => ['required', 'string', 'max:150'],
            'people.*.title' => $short, 'people.*.relationship' => $short, 'people.*.mobile' => $short,
            'people.*.email' => ['nullable', 'email', 'max:150'],
            'people.*.home' => $short, 'people.*.airports' => $short, 'people.*.airlines' => $short, 'people.*.companions' => $short,
            'people.*.vehicle' => $short, 'people.*.tier' => $short, 'people.*.preferences' => $long, 'people.*.notes' => $long,
            'people.*.notify' => $short, 'people.*.security' => $short,
            'billing' => ['nullable', 'array'],
            'billing.payer' => $short, 'billing.method' => $short, 'billing.contact' => $short,
            'billing.email' => ['nullable', 'email', 'max:150'], 'billing.phone' => $short, 'billing.address' => $short,
            'billing.po' => $short, 'billing.receipts' => $short, 'billing.approval' => $short,
        ];
    }
}
