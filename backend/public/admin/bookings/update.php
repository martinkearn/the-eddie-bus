<?php

declare(strict_types=1);

require_once __DIR__ . '/../../bootstrap_api.php';

function tri_state_to_nullable_int(mixed $value): ?int
{
    $normalized = strtolower(trim((string)$value));
    if (in_array($normalized, ['1', 'true', 'yes', 'y', 'on'], true)) {
        return 1;
    }

    if (in_array($normalized, ['0', 'false', 'no', 'n', 'off'], true)) {
        return 0;
    }

    return null;
}

function bool_to_int(mixed $value): int
{
    $normalized = strtolower(trim((string)$value));
    if (in_array($normalized, ['1', 'true', 'yes', 'y', 'on'], true)) {
        return 1;
    }

    return 0;
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

$bookingRef = trim((string)($payload['bookingRef'] ?? ''));
$status = trim((string)($payload['status'] ?? ''));
$bookingDate = trim((string)($payload['bookingDate'] ?? ''));
$pickupTime = trim((string)($payload['pickupTime'] ?? ''));
$organisation = trim((string)($payload['organisation'] ?? ''));
$destinationName = trim((string)($payload['destinationName'] ?? ''));
$destinationAddress = trim((string)($payload['destinationAddress'] ?? ''));
$contactName = trim((string)($payload['contactName'] ?? ''));
$contactEmail = trim((string)($payload['contactEmail'] ?? ''));
$contactNumber = trim((string)($payload['contactNumber'] ?? ''));
$specialRequirements = trim((string)($payload['specialRequirements'] ?? ''));
$adminNotes = trim((string)($payload['adminNotes'] ?? ''));
$startMileageRaw = trim((string)($payload['startMileage'] ?? ''));
$finishMileageRaw = trim((string)($payload['finishMileage'] ?? ''));
$nonBillableMileageRaw = trim((string)($payload['nonBillableMileage'] ?? ''));
$vehicleCheckDateRaw = trim((string)($payload['vehicleCheckDate'] ?? ''));
$vehicleCheckSignedBy = trim((string)($payload['vehicleCheckSignedBy'] ?? ''));
$vehicleFaultsRecorded = trim((string)($payload['vehicleFaultsRecorded'] ?? ''));
$driverUserIdRaw = trim((string)($payload['driverUserId'] ?? ''));

$allowedStatuses = ['pending', 'confirmed', 'journey_completed', 'customer_billed', 'booking_completed', 'cancelled_by_customer', 'cancelled_by_us'];
$errors = [];

if ($bookingRef === '') {
    $errors['bookingRef'] = 'Booking reference is required.';
}
if (!in_array($status, $allowedStatuses, true)) {
    $errors['status'] = 'Status is invalid.';
}
if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $bookingDate)) {
    $errors['bookingDate'] = 'Date must be in YYYY-MM-DD format.';
}
if (!preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $pickupTime)) {
    $errors['pickupTime'] = 'Pickup time must be in HH:MM format.';
}
if ($organisation === '') {
    $errors['organisation'] = 'Organisation is required.';
}
if ($contactName === '') {
    $errors['contactName'] = 'Contact name is required.';
}
if ($contactEmail === '' || filter_var($contactEmail, FILTER_VALIDATE_EMAIL) === false) {
    $errors['contactEmail'] = 'Valid contact email is required.';
}
if ($contactNumber === '') {
    $errors['contactNumber'] = 'Contact number is required.';
}
if ($driverUserIdRaw !== '' && !ctype_digit($driverUserIdRaw)) {
    $errors['driverUserId'] = 'Driver must be a valid user selection.';
}

$isValidMileage = static function (string $value): bool {
    return preg_match('/^\d+(\.\d{1,2})?$/', $value) === 1;
};

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

$driverUserId = $driverUserIdRaw !== '' ? (int)$driverUserIdRaw : null;
$startMileage = $startMileageRaw !== '' ? (float)$startMileageRaw : null;
$finishMileage = $finishMileageRaw !== '' ? (float)$finishMileageRaw : null;
$nonBillableMileage = $nonBillableMileageRaw !== '' ? (float)$nonBillableMileageRaw : null;
$vehicleCheckDate = $vehicleCheckDateRaw !== '' ? $vehicleCheckDateRaw : null;

try {
    $pdo = db_connection();
    require_admin($pdo);

    $columnCheckStmt = $pdo->prepare('SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table_name AND COLUMN_NAME = :column_name');
    $columnCheckStmt->execute([
        ':table_name' => 'bookings',
        ':column_name' => 'admin_notes',
    ]);
    $hasAdminNotesColumn = ((int)$columnCheckStmt->fetchColumn()) > 0;

    if ($driverUserId !== null) {
        $driverStmt = $pdo->prepare('SELECT id FROM admin_users WHERE id = :id LIMIT 1');
        $driverStmt->execute([':id' => $driverUserId]);
        $driver = $driverStmt->fetch();
        if (!is_array($driver)) {
            fail_json(422, 'Driver must be an existing user.');
        }
    }

    $adminNotesUpdateSql = $hasAdminNotesColumn ? ",\n             admin_notes = :admin_notes" : '';

    $stmt = $pdo->prepare(
        'UPDATE bookings
         SET booking_ref = :booking_ref,
             status = :status,
             driver_user_id = :driver_user_id,
             booking_date = :booking_date,
             pickup_time = :pickup_time,
             organisation = :organisation,
             destination_name = :destination_name,
             destination_address = :destination_address,
             contact_name = :contact_name,
             contact_email = :contact_email,
             contact_number = :contact_number,
             static_wheelchairs = :static_wheelchairs,
             powered_wheelchairs = :powered_wheelchairs,
             passenger_transfers = :passenger_transfers,
             special_requirements = :special_requirements,
             start_mileage = :start_mileage,
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
             vehicle_faults_recorded = :vehicle_faults_recorded' . $adminNotesUpdateSql . '
         WHERE id = :id'
    );

    $executeParams = [
        ':booking_ref' => $bookingRef,
        ':status' => $status,
        ':driver_user_id' => $driverUserId,
        ':booking_date' => $bookingDate,
        ':pickup_time' => $pickupTime . ':00',
        ':organisation' => $organisation,
        ':destination_name' => $destinationName,
        ':destination_address' => $destinationAddress !== '' ? $destinationAddress : null,
        ':contact_name' => $contactName,
        ':contact_email' => $contactEmail,
        ':contact_number' => $contactNumber,
        ':static_wheelchairs' => bool_to_int($payload['staticWheelchairs'] ?? 0),
        ':powered_wheelchairs' => bool_to_int($payload['poweredWheelchairs'] ?? 0),
        ':passenger_transfers' => bool_to_int($payload['passengerTransfers'] ?? 0),
        ':special_requirements' => $specialRequirements !== '' ? $specialRequirements : null,
        ':start_mileage' => $startMileage,
        ':finish_mileage' => $finishMileage,
        ':non_billable_mileage' => $nonBillableMileage,
        ':checklist_lights_indicators' => tri_state_to_nullable_int($payload['checklistLightsIndicators'] ?? null),
        ':checklist_tyres' => tri_state_to_nullable_int($payload['checklistTyres'] ?? null),
        ':checklist_wheel_nuts' => tri_state_to_nullable_int($payload['checklistWheelNuts'] ?? null),
        ':checklist_bodywork' => tri_state_to_nullable_int($payload['checklistBodywork'] ?? null),
        ':checklist_mirrors_glass' => tri_state_to_nullable_int($payload['checklistMirrorsGlass'] ?? null),
        ':checklist_brakes' => tri_state_to_nullable_int($payload['checklistBrakes'] ?? null),
        ':checklist_steering' => tri_state_to_nullable_int($payload['checklistSteering'] ?? null),
        ':checklist_wipers_washers' => tri_state_to_nullable_int($payload['checklistWipersWashers'] ?? null),
        ':checklist_dashboard_warning_lights' => tri_state_to_nullable_int($payload['checklistDashboardWarningLights'] ?? null),
        ':checklist_seats_seatbelts' => tri_state_to_nullable_int($payload['checklistSeatsSeatbelts'] ?? null),
        ':checklist_emergency_equipment' => tri_state_to_nullable_int($payload['checklistEmergencyEquipment'] ?? null),
        ':checklist_wheelchair_lifts_restraints' => tri_state_to_nullable_int($payload['checklistWheelchairLiftsRestraints'] ?? null),
        ':checklist_tail_lifts' => tri_state_to_nullable_int($payload['checklistTailLifts'] ?? null),
        ':vehicle_check_date' => $vehicleCheckDate,
        ':vehicle_check_signed_by' => $vehicleCheckSignedBy !== '' ? $vehicleCheckSignedBy : null,
        ':vehicle_faults_recorded' => $vehicleFaultsRecorded !== '' ? $vehicleFaultsRecorded : null,
        ':id' => $bookingId,
    ];

    if ($hasAdminNotesColumn) {
        $executeParams[':admin_notes'] = $adminNotes !== '' ? $adminNotes : null;
    }

    $stmt->execute($executeParams);

    if ($stmt->rowCount() === 0) {
        $existsStmt = $pdo->prepare('SELECT id FROM bookings WHERE id = :id LIMIT 1');
        $existsStmt->execute([':id' => $bookingId]);
        $existing = $existsStmt->fetch();
        if (!is_array($existing)) {
            fail_json(404, 'Booking not found.');
        }
    }

    respond_json(200, [
        'ok' => true,
        'message' => 'Booking updated.',
    ]);
} catch (PDOException $pdoException) {
    $sqlState = $pdoException->errorInfo[0] ?? '';
    if ($sqlState === '23000') {
        fail_json(422, 'Booking reference must be unique.');
    }

    error_log('Admin booking update failed: ' . $pdoException->getMessage());
    fail_json(500, 'Could not update booking right now.');
} catch (Throwable $exception) {
    error_log('Admin booking update failed: ' . $exception->getMessage());
    fail_json(500, 'Could not update booking right now.');
}
