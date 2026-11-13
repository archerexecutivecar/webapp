<?php

/*
 * Admin navigation. Each item is shown only if the user holds one of its `permissions`
 * (keys from config/rbac.php). The frontend renders exactly what GET /admin/navigation returns.
 * `available` marks modules whose API exists; others render a "not yet available" page.
 */

return [
    'groups' => [
        ['key' => 'overview', 'label' => 'Overview', 'items' => [
            ['key' => 'dashboard', 'label' => 'Operations Dashboard', 'href' => '/dashboard', 'icon' => 'layout-dashboard', 'permissions' => ['dashboard.view'], 'available' => true],
        ]],
        ['key' => 'operations', 'label' => 'Operations', 'items' => [
            ['key' => 'driver-portal', 'label' => 'Driver Portal (My Rides)', 'href' => '/my-rides', 'icon' => 'car', 'permissions' => ['driver.portal'], 'available' => true],
            ['key' => 'rides', 'label' => 'Rides & Dispatch', 'href' => '/rides', 'icon' => 'route', 'permissions' => ['rides.view', 'dispatch.manage'], 'available' => true],
        ]],
        ['key' => 'people', 'label' => 'People', 'items' => [
            ['key' => 'customers', 'label' => 'Customers', 'href' => '/customers', 'icon' => 'users', 'permissions' => ['rides.view'], 'available' => true],
            ['key' => 'drivers', 'label' => 'Drivers', 'href' => '/drivers', 'icon' => 'users', 'permissions' => ['drivers.view', 'drivers.manage'], 'available' => true],
            ['key' => 'tiers', 'label' => 'Driver Tiers', 'href' => '/tiers', 'icon' => 'shield-check', 'permissions' => ['tiers.manage'], 'available' => true],
        ]],
        ['key' => 'fleet', 'label' => 'Fleet', 'items' => [
            ['key' => 'vehicles', 'label' => 'Vehicles', 'href' => '/vehicles', 'icon' => 'car', 'permissions' => ['fleet.manage'], 'available' => true],
        ]],
        ['key' => 'website', 'label' => 'Website & Catalog', 'items' => [
            ['key' => 'services', 'label' => 'Service Types', 'href' => '/services', 'icon' => 'route', 'permissions' => ['content.edit'], 'available' => true],
            ['key' => 'security-addons', 'label' => 'Add-on Security', 'href' => '/security-addons', 'icon' => 'shield-check', 'permissions' => ['content.edit'], 'available' => true],
            ['key' => 'testimonials', 'label' => 'Testimonials', 'href' => '/testimonials', 'icon' => 'message-square', 'permissions' => ['content.edit'], 'available' => true],
            ['key' => 'site-content', 'label' => 'Page Content', 'href' => '/site-content', 'icon' => 'file-text', 'permissions' => ['content.edit'], 'available' => true],
            ['key' => 'site-tiers', 'label' => 'Website Tiers', 'href' => '/site-tiers', 'icon' => 'shield-check', 'permissions' => ['tiers.manage'], 'available' => true],
            ['key' => 'site-vehicles', 'label' => 'Website Fleet', 'href' => '/site-vehicles', 'icon' => 'car', 'permissions' => ['fleet.manage'], 'available' => true],
            ['key' => 'site-rates', 'label' => 'Rates', 'href' => '/site-rates', 'icon' => 'wallet', 'permissions' => ['pricing.manage'], 'available' => true],
        ]],
    ],
];
