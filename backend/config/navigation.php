<?php

/*
 * Admin navigation. Each item is shown only if the user holds one of its `permissions`
 * (keys from config/rbac.php). The frontend renders exactly what GET /admin/navigation returns.
 * `available` marks modules whose API exists; others render a "not yet available" page.
 *
 * ASSUMPTION (needs owner confirmation): the approved matrix has no keys for Bookings, Customers,
 * Driver Applications, Vehicles/Availability split, Closeout, CMS Media/Navigation/SEO, Integrations.
 * They are mapped to the closest approved key below; no new permission keys were invented.
 */

return [
    'groups' => [
        ['key' => 'overview', 'label' => 'Overview', 'items' => [
            ['key' => 'dashboard', 'label' => 'Operations Dashboard', 'href' => '/dashboard', 'icon' => 'layout-dashboard', 'permissions' => ['dashboard.view'], 'available' => true],
        ]],
        ['key' => 'operations', 'label' => 'Operations', 'items' => [
            ['key' => 'rides', 'label' => 'Rides & Dispatch', 'href' => '/rides', 'icon' => 'route', 'permissions' => ['rides.view', 'dispatch.manage'], 'available' => false],
            ['key' => 'bookings', 'label' => 'Bookings', 'href' => '/bookings', 'icon' => 'calendar-check', 'permissions' => ['rides.view'], 'available' => false],
        ]],
        ['key' => 'people', 'label' => 'People', 'items' => [
            ['key' => 'drivers', 'label' => 'Drivers', 'href' => '/drivers', 'icon' => 'users', 'permissions' => ['drivers.view'], 'available' => false],
            ['key' => 'driver-applications', 'label' => 'Driver Applications', 'href' => '/driver-applications', 'icon' => 'clipboard-list', 'permissions' => ['drivers.manage'], 'available' => false],
            ['key' => 'customers', 'label' => 'Customers', 'href' => '/customers', 'icon' => 'user-round', 'permissions' => ['rides.view'], 'available' => false],
            ['key' => 'staff', 'label' => 'Staff & Roles', 'href' => '/staff', 'icon' => 'shield-check', 'permissions' => ['users.manage', 'roles.manage'], 'available' => false],
        ]],
        ['key' => 'fleet', 'label' => 'Fleet', 'items' => [
            ['key' => 'vehicles', 'label' => 'Vehicles', 'href' => '/vehicles', 'icon' => 'car', 'permissions' => ['fleet.manage'], 'available' => false],
            ['key' => 'availability', 'label' => 'Availability', 'href' => '/availability', 'icon' => 'calendar-clock', 'permissions' => ['fleet.manage'], 'available' => false],
        ]],
        ['key' => 'finance', 'label' => 'Finance', 'items' => [
            ['key' => 'payments', 'label' => 'Payments', 'href' => '/payments', 'icon' => 'credit-card', 'permissions' => ['payments.view'], 'available' => false],
            ['key' => 'closeout', 'label' => 'Closeout', 'href' => '/closeout', 'icon' => 'circle-check-big', 'permissions' => ['payments.view'], 'available' => false],
            ['key' => 'payroll', 'label' => 'Payroll', 'href' => '/payroll', 'icon' => 'wallet', 'permissions' => ['payroll.view'], 'available' => false],
        ]],
        ['key' => 'website', 'label' => 'Website', 'items' => [
            ['key' => 'services', 'label' => 'Service Types', 'href' => '/services', 'icon' => 'route', 'permissions' => ['content.edit'], 'available' => true],
            ['key' => 'cms-pages', 'label' => 'CMS Pages', 'href' => '/cms-pages', 'icon' => 'file-text', 'permissions' => ['content.edit'], 'available' => true],
            ['key' => 'media', 'label' => 'Media Library', 'href' => '/media', 'icon' => 'image', 'permissions' => ['content.edit'], 'available' => false],
            ['key' => 'site-navigation', 'label' => 'Navigation', 'href' => '/site-navigation', 'icon' => 'menu', 'permissions' => ['content.edit'], 'available' => false],
            ['key' => 'seo', 'label' => 'SEO Settings', 'href' => '/seo', 'icon' => 'search', 'permissions' => ['content.publish'], 'available' => false],
        ]],
        ['key' => 'system', 'label' => 'System', 'items' => [
            ['key' => 'audit-logs', 'label' => 'Audit Logs', 'href' => '/audit-logs', 'icon' => 'scroll-text', 'permissions' => ['audit.view'], 'available' => false],
            ['key' => 'integrations', 'label' => 'Integrations', 'href' => '/integrations', 'icon' => 'plug', 'permissions' => ['settings.manage'], 'available' => false],
            ['key' => 'settings', 'label' => 'Settings', 'href' => '/settings', 'icon' => 'settings', 'permissions' => ['settings.manage'], 'available' => false],
        ]],
    ],
];
