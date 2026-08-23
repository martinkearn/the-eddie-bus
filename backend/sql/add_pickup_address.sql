ALTER TABLE bookings
  ADD COLUMN pickup_address VARCHAR(255) NULL AFTER organisation;