-- One-off data fix: set existing checklist yes/no values to "Not entered" (NULL)
-- Scope: checklist fields only (does not touch mobility fields)
--
-- Usage (MySQL):
--   mysql -u <user> -p <database> < backend/sql/set_existing_checklist_yes_no_to_not_entered.sql

-- Preview: rows that will be affected
SELECT COUNT(*) AS affected_bookings_before
FROM bookings
WHERE checklist_lights_indicators IS NOT NULL
   OR checklist_tyres IS NOT NULL
   OR checklist_wheel_nuts IS NOT NULL
   OR checklist_bodywork IS NOT NULL
   OR checklist_mirrors_glass IS NOT NULL
   OR checklist_brakes IS NOT NULL
   OR checklist_steering IS NOT NULL
   OR checklist_wipers_washers IS NOT NULL
   OR checklist_dashboard_warning_lights IS NOT NULL
   OR checklist_seats_seatbelts IS NOT NULL
   OR checklist_emergency_equipment IS NOT NULL
   OR checklist_wheelchair_lifts_restraints IS NOT NULL
   OR checklist_tail_lifts IS NOT NULL;

START TRANSACTION;

UPDATE bookings
SET checklist_lights_indicators = NULL,
    checklist_tyres = NULL,
    checklist_wheel_nuts = NULL,
    checklist_bodywork = NULL,
    checklist_mirrors_glass = NULL,
    checklist_brakes = NULL,
    checklist_steering = NULL,
    checklist_wipers_washers = NULL,
    checklist_dashboard_warning_lights = NULL,
    checklist_seats_seatbelts = NULL,
    checklist_emergency_equipment = NULL,
    checklist_wheelchair_lifts_restraints = NULL,
    checklist_tail_lifts = NULL
WHERE checklist_lights_indicators IS NOT NULL
   OR checklist_tyres IS NOT NULL
   OR checklist_wheel_nuts IS NOT NULL
   OR checklist_bodywork IS NOT NULL
   OR checklist_mirrors_glass IS NOT NULL
   OR checklist_brakes IS NOT NULL
   OR checklist_steering IS NOT NULL
   OR checklist_wipers_washers IS NOT NULL
   OR checklist_dashboard_warning_lights IS NOT NULL
   OR checklist_seats_seatbelts IS NOT NULL
   OR checklist_emergency_equipment IS NOT NULL
   OR checklist_wheelchair_lifts_restraints IS NOT NULL
   OR checklist_tail_lifts IS NOT NULL;

SELECT ROW_COUNT() AS updated_rows;

-- Verification: should be 0 after update
SELECT COUNT(*) AS remaining_non_null_checklist_values
FROM bookings
WHERE checklist_lights_indicators IS NOT NULL
   OR checklist_tyres IS NOT NULL
   OR checklist_wheel_nuts IS NOT NULL
   OR checklist_bodywork IS NOT NULL
   OR checklist_mirrors_glass IS NOT NULL
   OR checklist_brakes IS NOT NULL
   OR checklist_steering IS NOT NULL
   OR checklist_wipers_washers IS NOT NULL
   OR checklist_dashboard_warning_lights IS NOT NULL
   OR checklist_seats_seatbelts IS NOT NULL
   OR checklist_emergency_equipment IS NOT NULL
   OR checklist_wheelchair_lifts_restraints IS NOT NULL
   OR checklist_tail_lifts IS NOT NULL;

COMMIT;
