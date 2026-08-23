-- Admin portal schema updates

UPDATE bookings
SET status = 'cancelled_by_customer'
WHERE status = 'cancelled';

UPDATE bookings
SET status = 'journey_completed'
WHERE status = 'completed';

ALTER TABLE bookings
  MODIFY status ENUM('pending', 'confirmed', 'journey_completed', 'customer_billed', 'booking_completed', 'cancelled_by_customer', 'cancelled_by_us') NOT NULL DEFAULT 'pending';

DROP PROCEDURE IF EXISTS ensure_booking_column;
DELIMITER //
CREATE PROCEDURE ensure_booking_column(
  IN p_column_name VARCHAR(64),
  IN p_definition TEXT,
  IN p_after_column VARCHAR(64)
)
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'bookings'
      AND COLUMN_NAME = p_column_name
  ) THEN
    SET @ddl = CONCAT(
      'ALTER TABLE bookings ADD COLUMN ',
      p_column_name,
      ' ',
      p_definition,
      CASE
        WHEN p_after_column IS NULL OR p_after_column = '' THEN ''
        ELSE CONCAT(' AFTER ', p_after_column)
      END
    );

    PREPARE stmt FROM @ddl;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS ensure_admin_user_column;
DELIMITER //
CREATE PROCEDURE ensure_admin_user_column(
  IN p_column_name VARCHAR(64),
  IN p_definition TEXT,
  IN p_after_column VARCHAR(64)
)
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'admin_users'
      AND COLUMN_NAME = p_column_name
  ) THEN
    SET @ddl = CONCAT(
      'ALTER TABLE admin_users ADD COLUMN ',
      p_column_name,
      ' ',
      p_definition,
      CASE
        WHEN p_after_column IS NULL OR p_after_column = '' THEN ''
        ELSE CONCAT(' AFTER ', p_after_column)
      END
    );

    PREPARE stmt FROM @ddl;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END //
DELIMITER ;

CREATE TABLE IF NOT EXISTS admin_users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  username VARCHAR(64) NOT NULL,
  display_name VARCHAR(255) NULL,
  email VARCHAR(255) NULL,
  phone_number VARCHAR(32) NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'viewer') NOT NULL DEFAULT 'viewer',
  last_login_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_admin_users_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CALL ensure_admin_user_column('display_name', 'VARCHAR(255) NULL', 'username');
CALL ensure_admin_user_column('email', 'VARCHAR(255) NULL', 'username');
CALL ensure_admin_user_column('phone_number', 'VARCHAR(32) NULL', 'email');

CREATE TABLE IF NOT EXISTS booking_driver_mappings (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  booking_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  mapping_status ENUM('available', 'maybe_available', 'not_available', 'confirmed') NOT NULL,
  confirmed_booking_id BIGINT UNSIGNED GENERATED ALWAYS AS (
    CASE
      WHEN mapping_status = 'confirmed' THEN booking_id
      ELSE NULL
    END
  ) STORED,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_booking_driver_mappings_booking_user (booking_id, user_id),
  UNIQUE KEY uq_booking_driver_mappings_confirmed_booking (confirmed_booking_id),
  KEY idx_booking_driver_mappings_user_id (user_id),
  KEY idx_booking_driver_mappings_booking_status (booking_id, mapping_status),
  CONSTRAINT fk_booking_driver_mappings_booking_id FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  CONSTRAINT fk_booking_driver_mappings_user_id FOREIGN KEY (user_id) REFERENCES admin_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CALL ensure_booking_column('driver_user_id', 'BIGINT UNSIGNED NULL', 'status');
CALL ensure_booking_column('estimated_return_time', 'TIME NULL', 'pickup_time');
CALL ensure_booking_column('invoice_email', 'VARCHAR(255) NULL', 'contact_email');
CALL ensure_booking_column('admin_notes', 'TEXT NULL', 'special_requirements');
CALL ensure_booking_column('start_mileage', 'DECIMAL(8,2) NULL', 'admin_notes');
CALL ensure_booking_column('finish_mileage', 'DECIMAL(8,2) NULL', 'start_mileage');
CALL ensure_booking_column('non_billable_mileage', 'DECIMAL(8,2) NULL', 'finish_mileage');
CALL ensure_booking_column('checklist_lights_indicators', 'ENUM(''ok'', ''concern'') NULL DEFAULT NULL', 'non_billable_mileage');
CALL ensure_booking_column('checklist_tyres', 'ENUM(''ok'', ''concern'') NULL DEFAULT NULL', 'checklist_lights_indicators');
CALL ensure_booking_column('checklist_wheel_nuts', 'ENUM(''ok'', ''concern'') NULL DEFAULT NULL', 'checklist_tyres');
CALL ensure_booking_column('checklist_bodywork', 'ENUM(''ok'', ''concern'') NULL DEFAULT NULL', 'checklist_wheel_nuts');
CALL ensure_booking_column('checklist_mirrors_glass', 'ENUM(''ok'', ''concern'') NULL DEFAULT NULL', 'checklist_bodywork');
CALL ensure_booking_column('checklist_brakes', 'ENUM(''ok'', ''concern'') NULL DEFAULT NULL', 'checklist_mirrors_glass');
CALL ensure_booking_column('checklist_steering', 'ENUM(''ok'', ''concern'') NULL DEFAULT NULL', 'checklist_brakes');
CALL ensure_booking_column('checklist_wipers_washers', 'ENUM(''ok'', ''concern'') NULL DEFAULT NULL', 'checklist_steering');
CALL ensure_booking_column('checklist_dashboard_warning_lights', 'ENUM(''ok'', ''concern'') NULL DEFAULT NULL', 'checklist_wipers_washers');
CALL ensure_booking_column('checklist_seats_seatbelts', 'ENUM(''ok'', ''concern'') NULL DEFAULT NULL', 'checklist_dashboard_warning_lights');
CALL ensure_booking_column('checklist_emergency_equipment', 'ENUM(''ok'', ''concern'') NULL DEFAULT NULL', 'checklist_seats_seatbelts');
CALL ensure_booking_column('checklist_wheelchair_lifts_restraints', 'ENUM(''ok'', ''concern'') NULL DEFAULT NULL', 'checklist_emergency_equipment');
CALL ensure_booking_column('checklist_tail_lifts', 'ENUM(''ok'', ''concern'') NULL DEFAULT NULL', 'checklist_wheelchair_lifts_restraints');
CALL ensure_booking_column('vehicle_check_date', 'DATE NULL', 'checklist_tail_lifts');
CALL ensure_booking_column('vehicle_check_signed_by', 'VARCHAR(255) NULL', 'vehicle_check_date');
CALL ensure_booking_column('vehicle_faults_recorded', 'TEXT NULL', 'vehicle_check_signed_by');

UPDATE bookings
SET invoice_email = contact_email
WHERE invoice_email IS NULL OR TRIM(invoice_email) = '';

ALTER TABLE bookings
  MODIFY invoice_email VARCHAR(255) NOT NULL,
  MODIFY static_wheelchairs TINYINT(1) NOT NULL DEFAULT 0,
  MODIFY powered_wheelchairs TINYINT(1) NOT NULL DEFAULT 0,
  MODIFY passenger_transfers TINYINT(1) NOT NULL DEFAULT 0;

DROP PROCEDURE IF EXISTS migrate_checklist_column;
DELIMITER //
CREATE PROCEDURE migrate_checklist_column(IN p_column_name VARCHAR(64))
BEGIN
  SET @checklist_to_text_sql = CONCAT(
    'ALTER TABLE bookings MODIFY COLUMN ',
    p_column_name,
    ' VARCHAR(16) NULL DEFAULT NULL'
  );
  PREPARE stmt FROM @checklist_to_text_sql;
  EXECUTE stmt;
  DEALLOCATE PREPARE stmt;

  SET @normalize_checklist_sql = CONCAT(
    'UPDATE bookings SET ',
    p_column_name,
    ' = CASE ',
    'WHEN LOWER(TRIM(', p_column_name, ')) IN (''ok'', ''1'', ''true'', ''yes'', ''y'', ''on'') THEN ''ok'' ',
    'WHEN LOWER(TRIM(', p_column_name, ')) IN (''concern'', ''0'', ''false'', ''no'', ''n'', ''off'') THEN ''concern'' ',
    'ELSE NULL END'
  );
  PREPARE stmt FROM @normalize_checklist_sql;
  EXECUTE stmt;
  DEALLOCATE PREPARE stmt;

  SET @checklist_to_enum_sql = CONCAT(
    'ALTER TABLE bookings MODIFY COLUMN ',
    p_column_name,
    ' ENUM(''ok'', ''concern'') NULL DEFAULT NULL'
  );
  PREPARE stmt FROM @checklist_to_enum_sql;
  EXECUTE stmt;
  DEALLOCATE PREPARE stmt;
END //
DELIMITER ;

CALL migrate_checklist_column('checklist_lights_indicators');
CALL migrate_checklist_column('checklist_tyres');
CALL migrate_checklist_column('checklist_wheel_nuts');
CALL migrate_checklist_column('checklist_bodywork');
CALL migrate_checklist_column('checklist_mirrors_glass');
CALL migrate_checklist_column('checklist_brakes');
CALL migrate_checklist_column('checklist_steering');
CALL migrate_checklist_column('checklist_wipers_washers');
CALL migrate_checklist_column('checklist_dashboard_warning_lights');
CALL migrate_checklist_column('checklist_seats_seatbelts');
CALL migrate_checklist_column('checklist_emergency_equipment');
CALL migrate_checklist_column('checklist_wheelchair_lifts_restraints');
CALL migrate_checklist_column('checklist_tail_lifts');

DROP PROCEDURE IF EXISTS migrate_checklist_column;

SET @has_driver_index = (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'bookings'
    AND INDEX_NAME = 'idx_bookings_driver_user_id'
);

SET @driver_index_sql = IF(
  @has_driver_index = 0,
  'ALTER TABLE bookings ADD KEY idx_bookings_driver_user_id (driver_user_id)',
  'SELECT 1'
);
PREPARE stmt FROM @driver_index_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_driver_fk = (
  SELECT COUNT(*)
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'bookings'
    AND CONSTRAINT_NAME = 'fk_bookings_driver_user_id'
    AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);

SET @driver_fk_sql = IF(
  @has_driver_fk = 0,
  'ALTER TABLE bookings ADD CONSTRAINT fk_bookings_driver_user_id FOREIGN KEY (driver_user_id) REFERENCES admin_users(id) ON DELETE SET NULL',
  'SELECT 1'
);
PREPARE stmt FROM @driver_fk_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

DROP PROCEDURE IF EXISTS ensure_booking_column;

CREATE TABLE IF NOT EXISTS admin_sessions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL,
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(512) NULL,
  last_seen_at TIMESTAMP NULL DEFAULT NULL,
  revoked_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_admin_sessions_token_hash (token_hash),
  KEY idx_admin_sessions_user_id (user_id),
  KEY idx_admin_sessions_revoked_at (revoked_at),
  CONSTRAINT fk_admin_sessions_user_id FOREIGN KEY (user_id) REFERENCES admin_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS auth_event_log (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  event_type VARCHAR(64) NOT NULL,
  user_id BIGINT UNSIGNED NULL,
  username VARCHAR(64) NULL,
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(512) NULL,
  details_json JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_auth_event_log_event_type (event_type),
  KEY idx_auth_event_log_created_at (created_at),
  KEY idx_auth_event_log_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create initial users via a private runtime process only.
-- Do not commit plaintext passwords to git.
-- Example (run manually in trusted environment):
-- INSERT INTO admin_users (username, password_hash, role)
-- VALUES ('admin', '<hash-from-php-password_hash>', 'admin');
