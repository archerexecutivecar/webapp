-- Archer: booking intake + customer accounts (MySQL).
-- For hosts without a command line. Run ONCE in phpMyAdmin (SQL tab) on the production database, after a backup.
-- Equivalent to: php artisan migrate   (these three migrations only)
-- Do not run this if you have already run `php artisan migrate` for them.

START TRANSACTION;

-- 2026_11_12_100000_add_request_details_to_ride_requests_table
ALTER TABLE `ride_requests` ADD `request_type` varchar(40) NULL AFTER `reference`;
ALTER TABLE `ride_requests` ADD `details` json NULL AFTER `dispatch_notes`;
ALTER TABLE `ride_requests` ADD `idempotency_key` varchar(100) NULL AFTER `details`;
ALTER TABLE `ride_requests` ADD INDEX `ride_requests_request_type_index` (`request_type`);
ALTER TABLE `ride_requests` ADD UNIQUE `ride_requests_idempotency_key_unique` (`idempotency_key`);
ALTER TABLE `ride_requests` MODIFY `vehicle` varchar(255) NULL;
ALTER TABLE `ride_requests` MODIFY `ride_date` varchar(255) NULL;
ALTER TABLE `ride_requests` MODIFY `ride_time` varchar(255) NULL;

-- 2026_11_12_100100_create_assistant_profiles_table
CREATE TABLE `assistant_profiles` (
  `id` char(36) NOT NULL,
  `reference` varchar(255) NOT NULL,
  `first_name` varchar(255) NOT NULL,
  `last_name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `mobile` varchar(255) NOT NULL,
  `company` varchar(255) NULL,
  `data` json NOT NULL,
  `terms_accepted_at` timestamp NOT NULL,
  `idempotency_key` varchar(100) NULL,
  `status` varchar(255) NOT NULL DEFAULT 'active',
  `created_at` timestamp NULL,
  `updated_at` timestamp NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE = InnoDB;
ALTER TABLE `assistant_profiles` ADD UNIQUE `assistant_profiles_reference_unique` (`reference`);
ALTER TABLE `assistant_profiles` ADD UNIQUE `assistant_profiles_idempotency_key_unique` (`idempotency_key`);

-- 2026_11_12_110000_add_customer_accounts
ALTER TABLE `users` ADD `phone` varchar(50) NULL AFTER `email`;
ALTER TABLE `users` ADD `password_set_at` timestamp NULL AFTER `password`;
ALTER TABLE `ride_requests` ADD `customer_id` bigint unsigned NULL AFTER `assigned_driver_id`;
ALTER TABLE `ride_requests` ADD CONSTRAINT `ride_requests_customer_id_foreign` FOREIGN KEY (`customer_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;
CREATE TABLE `login_codes` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `email` varchar(255) NOT NULL,
  `code_hash` varchar(64) NOT NULL,
  `expires_at` timestamp NOT NULL,
  `attempts` tinyint unsigned NOT NULL DEFAULT 0,
  `consumed_at` timestamp NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE = InnoDB;
ALTER TABLE `login_codes` ADD INDEX `login_codes_email_index` (`email`);

-- Tell Laravel these migrations are done, so a later `php artisan migrate` does not try to run them again.
SET @batch = (SELECT COALESCE(MAX(`batch`), 0) + 1 FROM `migrations`);
INSERT INTO `migrations` (`migration`, `batch`) VALUES
  ('2026_11_12_100000_add_request_details_to_ride_requests_table', @batch),
  ('2026_11_12_100100_create_assistant_profiles_table', @batch),
  ('2026_11_12_110000_add_customer_accounts', @batch);

COMMIT;

-- Check afterwards (should return a row): the customer role must exist for accounts to be created with it.
-- SELECT `key`, `name` FROM `roles` WHERE `key` = 'customer';
