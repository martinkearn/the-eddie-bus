CREATE TABLE IF NOT EXISTS bookings (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  status ENUM('pending', 'confirmed', 'cancelled') NOT NULL DEFAULT 'pending',
  booking_date DATE NOT NULL,
  pickup_time TIME NOT NULL,
  organisation VARCHAR(255) NOT NULL,
  destination_name VARCHAR(255) NOT NULL,
  destination_address VARCHAR(255) NULL,
  contact_name VARCHAR(255) NOT NULL,
  contact_email VARCHAR(255) NOT NULL,
  contact_number VARCHAR(64) NOT NULL,
  static_wheelchairs TINYINT(1) NOT NULL DEFAULT 0,
  powered_wheelchairs TINYINT(1) NOT NULL DEFAULT 0,
  passenger_transfers TINYINT(1) NOT NULL DEFAULT 0,
  special_requirements TEXT NULL,
  source_ip VARCHAR(45) NULL,
  user_agent VARCHAR(512) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_bookings_booking_date (booking_date),
  KEY idx_bookings_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS booking_unavailable_dates (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  unavailable_date DATE NOT NULL,
  reason VARCHAR(255) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_booking_unavailable_dates_date (unavailable_date),
  KEY idx_booking_unavailable_dates_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
