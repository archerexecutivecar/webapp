-- Hostinger / phpMyAdmin patch for POST /api/v1/admin/drivers 500s.
-- Run once against the production MySQL database, then clear Laravel caches.
-- Safe to re-run: each ALTER is guarded by information_schema checks.

-- 1) Widen audit_logs.subject_id so UUID drivers/rides can be audited (avoids
--    "Data truncated for column subject_id" after Driver::create succeeds).
SET @col_type := (
  SELECT DATA_TYPE
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'audit_logs'
    AND COLUMN_NAME = 'subject_id'
  LIMIT 1
);
SET @sql := IF(
  @col_type IS NOT NULL AND @col_type <> 'varchar',
  'ALTER TABLE `audit_logs` MODIFY `subject_id` VARCHAR(64) NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2) Operating-mode / owner-vehicle / compliance columns used by DriverController::store
SET @db := DATABASE();

SET @sql := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='drivers' AND COLUMN_NAME='is_fleet_operator') = 0,
  'ALTER TABLE `drivers` ADD COLUMN `is_fleet_operator` TINYINT(1) NOT NULL DEFAULT 1 AFTER `is_active`',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='drivers' AND COLUMN_NAME='is_client_car_operator') = 0,
  'ALTER TABLE `drivers` ADD COLUMN `is_client_car_operator` TINYINT(1) NOT NULL DEFAULT 1 AFTER `is_fleet_operator`',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='drivers' AND COLUMN_NAME='is_owner_operator') = 0,
  'ALTER TABLE `drivers` ADD COLUMN `is_owner_operator` TINYINT(1) NOT NULL DEFAULT 0 AFTER `is_client_car_operator`',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='drivers' AND COLUMN_NAME='owner_vehicle_model') = 0,
  'ALTER TABLE `drivers` ADD COLUMN `owner_vehicle_model` VARCHAR(255) NULL AFTER `is_owner_operator`',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='drivers' AND COLUMN_NAME='owner_vehicle_class') = 0,
  'ALTER TABLE `drivers` ADD COLUMN `owner_vehicle_class` VARCHAR(100) NULL AFTER `owner_vehicle_model`',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='drivers' AND COLUMN_NAME='owner_vehicle_plate') = 0,
  'ALTER TABLE `drivers` ADD COLUMN `owner_vehicle_plate` VARCHAR(50) NULL AFTER `owner_vehicle_class`',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='drivers' AND COLUMN_NAME='owner_vehicle_reg_expires') = 0,
  'ALTER TABLE `drivers` ADD COLUMN `owner_vehicle_reg_expires` DATE NULL AFTER `owner_vehicle_plate`',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='drivers' AND COLUMN_NAME='owner_vehicle_ins_expires') = 0,
  'ALTER TABLE `drivers` ADD COLUMN `owner_vehicle_ins_expires` DATE NULL AFTER `owner_vehicle_reg_expires`',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='drivers' AND COLUMN_NAME='owner_vehicle_inspected') = 0,
  'ALTER TABLE `drivers` ADD COLUMN `owner_vehicle_inspected` TINYINT(1) NOT NULL DEFAULT 0 AFTER `owner_vehicle_ins_expires`',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='drivers' AND COLUMN_NAME='compliance_credentials') = 0,
  'ALTER TABLE `drivers` ADD COLUMN `compliance_credentials` JSON NULL AFTER `owner_vehicle_inspected`',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='drivers' AND COLUMN_NAME='availability_schedule') = 0,
  'ALTER TABLE `drivers` ADD COLUMN `availability_schedule` VARCHAR(255) NULL AFTER `compliance_credentials`',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3) Mark Laravel migrations as applied so `php artisan migrate` will not retry them.
INSERT INTO `migrations` (`migration`, `batch`)
SELECT t.migration, t.batch
FROM (
  SELECT '2026_11_14_000002_make_audit_subject_id_string' AS migration,
         (SELECT COALESCE(MAX(`batch`), 0) + 1 FROM `migrations`) AS batch
) AS t
WHERE NOT EXISTS (
  SELECT 1 FROM `migrations` m WHERE m.migration = '2026_11_14_000002_make_audit_subject_id_string'
);

INSERT INTO `migrations` (`migration`, `batch`)
SELECT t.migration, t.batch
FROM (
  SELECT '2026_11_21_000001_add_operating_modes_to_drivers_table' AS migration,
         (SELECT COALESCE(MAX(`batch`), 0) + 1 FROM `migrations`) AS batch
) AS t
WHERE NOT EXISTS (
  SELECT 1 FROM `migrations` m WHERE m.migration = '2026_11_21_000001_add_operating_modes_to_drivers_table'
);
