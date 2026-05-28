<?php

declare(strict_types=1);

require_once __DIR__ . '/../../bootstrap_api.php';

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
    fail_json(405, 'Method not allowed.');
}

$idRaw = trim((string)($_GET['id'] ?? ''));
if ($idRaw === '' || !ctype_digit($idRaw)) {
    fail_json(422, 'A valid booking id is required.');
}

$bookingId = (int)$idRaw;

try {
    $pdo = db_connection();
    require_auth($pdo);

    $columnCheckStmt = $pdo->prepare('SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table_name AND COLUMN_NAME = :column_name');
    $columnCheckStmt->execute([
        ':table_name' => 'bookings',
        ':column_name' => 'admin_notes',
    ]);
    $hasAdminNotesColumn = ((int)$columnCheckStmt->fetchColumn()) > 0;

    $adminNotesSelectSql = $hasAdminNotesColumn ? 'bookings.admin_notes' : 'NULL AS admin_notes';

    $stmt = $pdo->prepare('SELECT
        bookings.id,
        bookings.booking_ref,
        bookings.status,
        bookings.driver_user_id,
        driver.username AS driver_username,
        bookings.booking_date,
        TIME_FORMAT(bookings.pickup_time, "%H:%i") AS pickup_time,
        bookings.organisation,
        bookings.destination_name,
        bookings.destination_address,
        bookings.contact_name,
        bookings.contact_email,
        bookings.contact_number,
        bookings.static_wheelchairs,
        bookings.powered_wheelchairs,
        bookings.passenger_transfers,
        bookings.special_requirements,
        bookings.start_mileage,
        bookings.finish_mileage,
        bookings.non_billable_mileage,
        bookings.checklist_lights_indicators,
        bookings.checklist_tyres,
        bookings.checklist_wheel_nuts,
        bookings.checklist_bodywork,
        bookings.checklist_mirrors_glass,
        bookings.checklist_brakes,
        bookings.checklist_steering,
        bookings.checklist_wipers_washers,
        bookings.checklist_dashboard_warning_lights,
        bookings.checklist_seats_seatbelts,
        bookings.checklist_emergency_equipment,
        bookings.checklist_wheelchair_lifts_restraints,
        bookings.checklist_tail_lifts,
        bookings.vehicle_check_date,
        bookings.vehicle_check_signed_by,
        bookings.vehicle_faults_recorded,
        ' . $adminNotesSelectSql . ',
        bookings.source_ip,
        bookings.user_agent,
        bookings.created_at,
        bookings.updated_at
    FROM bookings
    LEFT JOIN admin_users driver ON driver.id = bookings.driver_user_id
    WHERE bookings.id = :id
    LIMIT 1');

    $stmt->execute([':id' => $bookingId]);
    $booking = $stmt->fetch();

    if (!is_array($booking)) {
        fail_json(404, 'Booking not found.');
    }

    respond_json(200, [
        'ok' => true,
        'item' => $booking,
    ]);
} catch (Throwable $exception) {
    error_log('Admin booking get failed: ' . $exception->getMessage());
    fail_json(500, 'Could not load booking right now.');
}
