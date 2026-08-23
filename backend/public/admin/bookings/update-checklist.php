<?php

declare(strict_types=1);

require_once __DIR__ . '/../../bootstrap_api.php';

function checklist_status_or_null(mixed $value): ?string
{
    $normalized = strtolower(trim((string)$value));
    if (in_array($normalized, ['ok', '1', 'true', 'yes', 'y', 'on'], true)) {
        return 'ok';
    }

    if (in_array($normalized, ['concern', '0', 'false', 'no', 'n', 'off'], true)) {
        return 'concern';
    }

    return null;
}

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    fail_json(405, 'Method not allowed.');
}

$contentType = $_SERVER['CONTENT_TYPE'] ?? '';
if (stripos($contentType, 'application/json') !== 0) {
    fail_json(415, 'Content-Type must be application/json.');
}

$rawBody = file_get_contents('php://input');
$payload = json_decode((string)$rawBody, true);
if (!is_array($payload)) {
    fail_json(400, 'Invalid JSON payload.');
}

$idRaw = trim((string)($payload['id'] ?? ''));
if ($idRaw === '' || !ctype_digit($idRaw)) {
    fail_json(422, 'A valid booking id is required.');
}
$bookingId = (int)$idRaw;

$startMileageRaw = trim((string)($payload['startMileage'] ?? ''));
$finishMileageRaw = trim((string)($payload['finishMileage'] ?? ''));
$nonBillableMileageRaw = trim((string)($payload['nonBillableMileage'] ?? ''));
$vehicleCheckDateRaw = trim((string)($payload['vehicleCheckDate'] ?? ''));
$vehicleCheckSignedBy = trim((string)($payload['vehicleCheckSignedBy'] ?? ''));
$vehicleFaultsRecorded = trim((string)($payload['vehicleFaultsRecorded'] ?? ''));

$isValidMileage = static function (string $value): bool {
    return preg_match('/^\d+(\.\d{1,2})?$/', $value) === 1;
};

$errors = [];

if ($startMileageRaw !== '' && !$isValidMileage($startMileageRaw)) {
    $errors['startMileage'] = 'Start mileage must be a valid number with up to 2 decimal places.';
}
if ($finishMileageRaw !== '' && !$isValidMileage($finishMileageRaw)) {
    $errors['finishMileage'] = 'Finish mileage must be a valid number with up to 2 decimal places.';
}
if ($nonBillableMileageRaw !== '' && !$isValidMileage($nonBillableMileageRaw)) {
    $errors['nonBillableMileage'] = 'Non billable mileage must be a valid number with up to 2 decimal places.';
}
if ($vehicleCheckDateRaw !== '' && preg_match('/^\d{4}-\d{2}-\d{2}$/', $vehicleCheckDateRaw) !== 1) {
    $errors['vehicleCheckDate'] = 'Vehicle check date must be in YYYY-MM-DD format.';
}

if ($errors !== []) {
    fail_json(422, 'Validation failed.', $errors);
}

$startMileage = $startMileageRaw !== '' ? (float)$startMileageRaw : null;
$finishMileage = $finishMileageRaw !== '' ? (float)$finishMileageRaw : null;
$nonBillableMileage = $nonBillableMileageRaw !== '' ? (float)$nonBillableMileageRaw : null;
$vehicleCheckDate = $vehicleCheckDateRaw !== '' ? $vehicleCheckDateRaw : null;

try {
    $pdo = db_connection();
    $user = require_auth($pdo);

    // Verify the booking exists and the user is either an admin or the assigned driver.
    $bookingStmt = $pdo->prepare('SELECT id, driver_user_id FROM bookings WHERE id = :id LIMIT 1');
    $bookingStmt->execute([':id' => $bookingId]);
    $booking = $bookingStmt->fetch();

    if (!is_array($booking)) {
        fail_json(404, 'Booking not found.');
    }

    $isAdmin = ($user['role'] ?? '') === 'admin';
    $isAssignedDriver = $booking['driver_user_id'] !== null
        && (int)$booking['driver_user_id'] === (int)$user['id'];

    if (!$isAdmin && !$isAssignedDriver) {
        fail_json(403, 'You must be an admin or the assigned driver to update the checklist.');
    }

    $pdo->beginTransaction();

    $stmt = $pdo->prepare(
        'UPDATE bookings
         SET start_mileage = :start_mileage,
             finish_mileage = :finish_mileage,
             non_billable_mileage = :non_billable_mileage,
             checklist_lights_indicators = :checklist_lights_indicators,
             checklist_tyres = :checklist_tyres,
             checklist_wheel_nuts = :checklist_wheel_nuts,
             checklist_bodywork = :checklist_bodywork,
             checklist_mirrors_glass = :checklist_mirrors_glass,
             checklist_brakes = :checklist_brakes,
             checklist_steering = :checklist_steering,
             checklist_wipers_washers = :checklist_wipers_washers,
             checklist_dashboard_warning_lights = :checklist_dashboard_warning_lights,
             checklist_seats_seatbelts = :checklist_seats_seatbelts,
             checklist_emergency_equipment = :checklist_emergency_equipment,
             checklist_wheelchair_lifts_restraints = :checklist_wheelchair_lifts_restraints,
             checklist_tail_lifts = :checklist_tail_lifts,
             vehicle_check_date = :vehicle_check_date,
             vehicle_check_signed_by = :vehicle_check_signed_by,
             vehicle_faults_recorded = :vehicle_faults_recorded,
             updated_at = NOW()
         WHERE id = :id'
    );

    $stmt->execute([
        ':id' => $bookingId,
        ':start_mileage' => $startMileage,
        ':finish_mileage' => $finishMileage,
        ':non_billable_mileage' => $nonBillableMileage,
        ':checklist_lights_indicators' => checklist_status_or_null($payload['checklistLightsIndicators'] ?? ''),
        ':checklist_tyres' => checklist_status_or_null($payload['checklistTyres'] ?? ''),
        ':checklist_wheel_nuts' => checklist_status_or_null($payload['checklistWheelNuts'] ?? ''),
        ':checklist_bodywork' => checklist_status_or_null($payload['checklistBodywork'] ?? ''),
        ':checklist_mirrors_glass' => checklist_status_or_null($payload['checklistMirrorsGlass'] ?? ''),
        ':checklist_brakes' => checklist_status_or_null($payload['checklistBrakes'] ?? ''),
        ':checklist_steering' => checklist_status_or_null($payload['checklistSteering'] ?? ''),
        ':checklist_wipers_washers' => checklist_status_or_null($payload['checklistWipersWashers'] ?? ''),
        ':checklist_dashboard_warning_lights' => checklist_status_or_null($payload['checklistDashboardWarningLights'] ?? ''),
        ':checklist_seats_seatbelts' => checklist_status_or_null($payload['checklistSeatsSeatbelts'] ?? ''),
        ':checklist_emergency_equipment' => checklist_status_or_null($payload['checklistEmergencyEquipment'] ?? ''),
        ':checklist_wheelchair_lifts_restraints' => checklist_status_or_null($payload['checklistWheelchairLiftsRestraints'] ?? ''),
        ':checklist_tail_lifts' => checklist_status_or_null($payload['checklistTailLifts'] ?? ''),
        ':vehicle_check_date' => $vehicleCheckDate,
        ':vehicle_check_signed_by' => $vehicleCheckSignedBy,
        ':vehicle_faults_recorded' => $vehicleFaultsRecorded,
    ]);

    $pdo->commit();

    respond_json(200, [
        'ok' => true,
        'message' => 'Checklist updated successfully.',
    ]);
} catch (Throwable $exception) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log('update-checklist error: ' . $exception->getMessage());
    fail_json(500, 'Could not update checklist. Please try again.');
}
