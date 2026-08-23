-- Convert vehicle checklist values from numeric booleans to word-based statuses.
-- This migration is rerunnable. It preserves 1/yes/true as "ok", preserves
-- 0/no/false as "concern", and converts unrecognized values to NULL.
-- The statements are intentionally explicit for phpMyAdmin compatibility.

ALTER TABLE bookings
  MODIFY checklist_lights_indicators VARCHAR(16) NULL DEFAULT NULL,
  MODIFY checklist_tyres VARCHAR(16) NULL DEFAULT NULL,
  MODIFY checklist_wheel_nuts VARCHAR(16) NULL DEFAULT NULL,
  MODIFY checklist_bodywork VARCHAR(16) NULL DEFAULT NULL,
  MODIFY checklist_mirrors_glass VARCHAR(16) NULL DEFAULT NULL,
  MODIFY checklist_brakes VARCHAR(16) NULL DEFAULT NULL,
  MODIFY checklist_steering VARCHAR(16) NULL DEFAULT NULL,
  MODIFY checklist_wipers_washers VARCHAR(16) NULL DEFAULT NULL,
  MODIFY checklist_dashboard_warning_lights VARCHAR(16) NULL DEFAULT NULL,
  MODIFY checklist_seats_seatbelts VARCHAR(16) NULL DEFAULT NULL,
  MODIFY checklist_emergency_equipment VARCHAR(16) NULL DEFAULT NULL,
  MODIFY checklist_wheelchair_lifts_restraints VARCHAR(16) NULL DEFAULT NULL,
  MODIFY checklist_tail_lifts VARCHAR(16) NULL DEFAULT NULL;

UPDATE bookings
SET checklist_lights_indicators = CASE
      WHEN LOWER(TRIM(checklist_lights_indicators)) IN ('ok', '1', 'true', 'yes', 'y', 'on') THEN 'ok'
      WHEN LOWER(TRIM(checklist_lights_indicators)) IN ('concern', '0', 'false', 'no', 'n', 'off') THEN 'concern'
      ELSE NULL
    END,
    checklist_tyres = CASE
      WHEN LOWER(TRIM(checklist_tyres)) IN ('ok', '1', 'true', 'yes', 'y', 'on') THEN 'ok'
      WHEN LOWER(TRIM(checklist_tyres)) IN ('concern', '0', 'false', 'no', 'n', 'off') THEN 'concern'
      ELSE NULL
    END,
    checklist_wheel_nuts = CASE
      WHEN LOWER(TRIM(checklist_wheel_nuts)) IN ('ok', '1', 'true', 'yes', 'y', 'on') THEN 'ok'
      WHEN LOWER(TRIM(checklist_wheel_nuts)) IN ('concern', '0', 'false', 'no', 'n', 'off') THEN 'concern'
      ELSE NULL
    END,
    checklist_bodywork = CASE
      WHEN LOWER(TRIM(checklist_bodywork)) IN ('ok', '1', 'true', 'yes', 'y', 'on') THEN 'ok'
      WHEN LOWER(TRIM(checklist_bodywork)) IN ('concern', '0', 'false', 'no', 'n', 'off') THEN 'concern'
      ELSE NULL
    END,
    checklist_mirrors_glass = CASE
      WHEN LOWER(TRIM(checklist_mirrors_glass)) IN ('ok', '1', 'true', 'yes', 'y', 'on') THEN 'ok'
      WHEN LOWER(TRIM(checklist_mirrors_glass)) IN ('concern', '0', 'false', 'no', 'n', 'off') THEN 'concern'
      ELSE NULL
    END,
    checklist_brakes = CASE
      WHEN LOWER(TRIM(checklist_brakes)) IN ('ok', '1', 'true', 'yes', 'y', 'on') THEN 'ok'
      WHEN LOWER(TRIM(checklist_brakes)) IN ('concern', '0', 'false', 'no', 'n', 'off') THEN 'concern'
      ELSE NULL
    END,
    checklist_steering = CASE
      WHEN LOWER(TRIM(checklist_steering)) IN ('ok', '1', 'true', 'yes', 'y', 'on') THEN 'ok'
      WHEN LOWER(TRIM(checklist_steering)) IN ('concern', '0', 'false', 'no', 'n', 'off') THEN 'concern'
      ELSE NULL
    END,
    checklist_wipers_washers = CASE
      WHEN LOWER(TRIM(checklist_wipers_washers)) IN ('ok', '1', 'true', 'yes', 'y', 'on') THEN 'ok'
      WHEN LOWER(TRIM(checklist_wipers_washers)) IN ('concern', '0', 'false', 'no', 'n', 'off') THEN 'concern'
      ELSE NULL
    END,
    checklist_dashboard_warning_lights = CASE
      WHEN LOWER(TRIM(checklist_dashboard_warning_lights)) IN ('ok', '1', 'true', 'yes', 'y', 'on') THEN 'ok'
      WHEN LOWER(TRIM(checklist_dashboard_warning_lights)) IN ('concern', '0', 'false', 'no', 'n', 'off') THEN 'concern'
      ELSE NULL
    END,
    checklist_seats_seatbelts = CASE
      WHEN LOWER(TRIM(checklist_seats_seatbelts)) IN ('ok', '1', 'true', 'yes', 'y', 'on') THEN 'ok'
      WHEN LOWER(TRIM(checklist_seats_seatbelts)) IN ('concern', '0', 'false', 'no', 'n', 'off') THEN 'concern'
      ELSE NULL
    END,
    checklist_emergency_equipment = CASE
      WHEN LOWER(TRIM(checklist_emergency_equipment)) IN ('ok', '1', 'true', 'yes', 'y', 'on') THEN 'ok'
      WHEN LOWER(TRIM(checklist_emergency_equipment)) IN ('concern', '0', 'false', 'no', 'n', 'off') THEN 'concern'
      ELSE NULL
    END,
    checklist_wheelchair_lifts_restraints = CASE
      WHEN LOWER(TRIM(checklist_wheelchair_lifts_restraints)) IN ('ok', '1', 'true', 'yes', 'y', 'on') THEN 'ok'
      WHEN LOWER(TRIM(checklist_wheelchair_lifts_restraints)) IN ('concern', '0', 'false', 'no', 'n', 'off') THEN 'concern'
      ELSE NULL
    END,
    checklist_tail_lifts = CASE
      WHEN LOWER(TRIM(checklist_tail_lifts)) IN ('ok', '1', 'true', 'yes', 'y', 'on') THEN 'ok'
      WHEN LOWER(TRIM(checklist_tail_lifts)) IN ('concern', '0', 'false', 'no', 'n', 'off') THEN 'concern'
      ELSE NULL
    END;

ALTER TABLE bookings
  MODIFY checklist_lights_indicators ENUM('ok', 'concern') NULL DEFAULT NULL,
  MODIFY checklist_tyres ENUM('ok', 'concern') NULL DEFAULT NULL,
  MODIFY checklist_wheel_nuts ENUM('ok', 'concern') NULL DEFAULT NULL,
  MODIFY checklist_bodywork ENUM('ok', 'concern') NULL DEFAULT NULL,
  MODIFY checklist_mirrors_glass ENUM('ok', 'concern') NULL DEFAULT NULL,
  MODIFY checklist_brakes ENUM('ok', 'concern') NULL DEFAULT NULL,
  MODIFY checklist_steering ENUM('ok', 'concern') NULL DEFAULT NULL,
  MODIFY checklist_wipers_washers ENUM('ok', 'concern') NULL DEFAULT NULL,
  MODIFY checklist_dashboard_warning_lights ENUM('ok', 'concern') NULL DEFAULT NULL,
  MODIFY checklist_seats_seatbelts ENUM('ok', 'concern') NULL DEFAULT NULL,
  MODIFY checklist_emergency_equipment ENUM('ok', 'concern') NULL DEFAULT NULL,
  MODIFY checklist_wheelchair_lifts_restraints ENUM('ok', 'concern') NULL DEFAULT NULL,
  MODIFY checklist_tail_lifts ENUM('ok', 'concern') NULL DEFAULT NULL;

-- Verify the migrated value totals. Only ok, concern, and NULL should appear.
SELECT checklist_status, COUNT(*) AS value_count
FROM (
  SELECT checklist_lights_indicators AS checklist_status FROM bookings
  UNION ALL SELECT checklist_tyres FROM bookings
  UNION ALL SELECT checklist_wheel_nuts FROM bookings
  UNION ALL SELECT checklist_bodywork FROM bookings
  UNION ALL SELECT checklist_mirrors_glass FROM bookings
  UNION ALL SELECT checklist_brakes FROM bookings
  UNION ALL SELECT checklist_steering FROM bookings
  UNION ALL SELECT checklist_wipers_washers FROM bookings
  UNION ALL SELECT checklist_dashboard_warning_lights FROM bookings
  UNION ALL SELECT checklist_seats_seatbelts FROM bookings
  UNION ALL SELECT checklist_emergency_equipment FROM bookings
  UNION ALL SELECT checklist_wheelchair_lifts_restraints FROM bookings
  UNION ALL SELECT checklist_tail_lifts FROM bookings
) AS checklist_values
GROUP BY checklist_status
ORDER BY checklist_status;

-- Verify that every checklist column now permits strings only.
-- Keep this last because phpMyAdmin may switch its active schema to information_schema.
SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'bookings'
  AND COLUMN_NAME LIKE 'checklist_%'
ORDER BY ORDINAL_POSITION;