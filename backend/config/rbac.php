<?php

/*
 * Approved nine-role permission matrix (docs/RBAC_PROPOSAL_9_ROLES.md, approved 2026-10-29).
 * The database is authoritative at runtime; DatabaseSeeder syncs it from here idempotently.
 */

$all = [
    'dashboard.view', 'users.manage', 'roles.manage', 'rides.view', 'rides.manage',
    'dispatch.manage', 'drivers.view', 'drivers.manage', 'drivers.switches', 'tiers.manage',
    'fleet.manage', 'pricing.manage', 'payments.view', 'payments.manage', 'payroll.view',
    'payroll.manage', 'reports.view', 'audit.view', 'settings.manage', 'content.edit',
    'content.publish', 'self.profile',
];

return [
    'permissions' => $all,

    'roles' => [
        'super_admin' => ['name' => 'Super Admin', 'permissions' => array_values(array_diff($all, ['self.profile']))],
        'operations_manager' => ['name' => 'Operations Manager', 'permissions' => [
            'dashboard.view', 'rides.view', 'rides.manage', 'dispatch.manage', 'drivers.view', 'drivers.manage',
            'tiers.manage', 'fleet.manage', 'pricing.manage', 'payments.view', 'reports.view', 'audit.view',
            'settings.manage',
        ]],
        'dispatcher' => ['name' => 'Dispatcher', 'permissions' => [
            'dashboard.view', 'rides.view', 'rides.manage', 'dispatch.manage', 'drivers.view',
        ]],
        'driver_manager' => ['name' => 'Driver Manager', 'permissions' => [
            'dashboard.view', 'drivers.view', 'drivers.manage', 'drivers.switches', 'tiers.manage',
        ]],
        'finance_payroll' => ['name' => 'Finance/Payroll', 'permissions' => [
            'dashboard.view', 'rides.view', 'drivers.view', 'payments.view', 'payments.manage',
            'payroll.view', 'payroll.manage', 'reports.view', 'audit.view',
        ]],
        'content_editor' => ['name' => 'Content Editor', 'permissions' => ['content.edit']],
        'content_publisher' => ['name' => 'Content Publisher', 'permissions' => ['content.edit', 'content.publish']],
        'driver' => ['name' => 'Driver', 'permissions' => ['self.profile']],
        'customer' => ['name' => 'Customer', 'permissions' => ['self.profile']],
    ],

    // Matrix: Finance/Payroll audit.view is limited to financial events.
    'audit_financial_only_roles' => ['finance_payroll'],
    'financial_event_prefixes' => ['payment.', 'payroll.'],
];
