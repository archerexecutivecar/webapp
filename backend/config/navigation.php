<?php

/*
 * Admin navigation. Each item is shown only if the user holds one of its `permissions`
 * (keys from config/rbac.php). The frontend renders exactly what GET /admin/navigation returns.
 * `available` marks modules whose API exists; others render a "not yet available" page.
 */

return [
    'groups' => [
        ['key' => 'operations', 'label' => 'OPERATIONS', 'items' => [
            ['key' => 'dashboard', 'label' => 'Dashboard', 'href' => '/dashboard', 'icon' => 'layout-dashboard', 'permissions' => ['dashboard.view'], 'available' => true],
            ['key' => 'driver-portal', 'label' => 'My Assigned Rides', 'href' => '/my-rides', 'icon' => 'car', 'permissions' => ['driver.portal'], 'available' => true],
            ['key' => 'rides', 'label' => 'Ride requests', 'href' => '/rides', 'icon' => 'route', 'permissions' => ['rides.view', 'dispatch.manage'], 'available' => true],
            ['key' => 'reports', 'label' => 'Reports', 'href' => '/reports', 'icon' => 'file-text', 'permissions' => ['reports.view'], 'available' => true],
            ['key' => 'customers', 'label' => 'Clients', 'href' => '/customers', 'icon' => 'users', 'permissions' => ['rides.view'], 'available' => true],
            ['key' => 'drivers', 'label' => 'Drivers', 'href' => '/drivers', 'icon' => 'user-check', 'permissions' => ['drivers.view', 'drivers.manage'], 'available' => true],
            ['key' => 'careers', 'label' => 'Careers & Applicants', 'href' => '/careers', 'icon' => 'user-check', 'permissions' => ['careers.manage', 'settings.manage'], 'available' => true],
            ['key' => 'notices', 'label' => 'Customer notices', 'href' => '/notices', 'icon' => 'bell', 'permissions' => ['rides.view'], 'available' => true],
        ]],
        ['key' => 'money', 'label' => 'MONEY', 'items' => [
            ['key' => 'pricing', 'label' => 'Payments & earnings', 'href' => '/pricing', 'icon' => 'credit-card', 'permissions' => ['payments.view', 'pricing.manage'], 'available' => true],
            ['key' => 'payroll', 'label' => 'Weekly payroll', 'href' => '/payroll', 'icon' => 'calculator', 'permissions' => ['payroll.view', 'payroll.manage'], 'available' => true],
        ]],
        ['key' => 'setup', 'label' => 'SETUP', 'items' => [
            ['key' => 'fleet', 'label' => 'Fleet & availability', 'href' => '/site-vehicles', 'icon' => 'car', 'permissions' => ['fleet.manage'], 'available' => true],
            ['key' => 'rates', 'label' => 'Vehicles & rates', 'href' => '/site-rates', 'icon' => 'tag', 'permissions' => ['pricing.manage'], 'available' => true],
            ['key' => 'settings', 'label' => 'Settings', 'href' => '/settings', 'icon' => 'settings', 'permissions' => ['settings.manage'], 'available' => true],
            ['key' => 'site-content', 'label' => 'Page Content', 'href' => '/site-content', 'icon' => 'file-text', 'permissions' => ['content.edit'], 'available' => true],
            ['key' => 'site-tiers', 'label' => 'Tiers', 'href' => '/site-tiers', 'icon' => 'shield-check', 'permissions' => ['tiers.manage'], 'available' => true],
            ['key' => 'testimonials', 'label' => 'Testimonials', 'href' => '/testimonials', 'icon' => 'message-square', 'permissions' => ['content.edit'], 'available' => true],
            ['key' => 'cms-pages', 'label' => 'CMS Pages', 'href' => '/cms-pages', 'icon' => 'file-text', 'permissions' => ['content.edit'], 'available' => true],
        ]],
        ['key' => 'security', 'label' => 'SECURITY', 'items' => [
            ['key' => 'security-leads', 'label' => 'Security leads', 'href' => '/security/leads', 'icon' => 'shield-alert', 'permissions' => ['security.view', 'security.manage'], 'available' => true],
            ['key' => 'contracts-shifts', 'label' => 'Contracts & shifts', 'href' => '/security/contracts', 'icon' => 'calendar-check', 'permissions' => ['security.view', 'security.manage'], 'available' => true],
            ['key' => 'swap-approvals', 'label' => 'Swap approvals', 'href' => '/security/swaps', 'icon' => 'arrow-left-right', 'permissions' => ['security.view', 'security.manage'], 'available' => true],
            ['key' => 'credentials', 'label' => 'Credentials', 'href' => '/security/credentials', 'icon' => 'badge-check', 'permissions' => ['security.view', 'security.manage'], 'available' => true],
            ['key' => 'announcements', 'label' => 'Announcements', 'href' => '/security/announcements', 'icon' => 'megaphone', 'permissions' => ['security.view', 'security.manage'], 'available' => true],
        ]],
    ],
];
