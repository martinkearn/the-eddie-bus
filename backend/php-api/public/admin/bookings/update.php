<?php

declare(strict_types=1);

require_once __DIR__ . '/../../bootstrap_api.php';

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

$allowedStatuses = ['pending', 'confirmed', 'cancelled', 'completed'];
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
if ($destinationName === '') {
    $errors['destinationName'] = 'Destination is required.';
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

if ($errors !== []) {
    fail_json(422, 'Validation failed.', $errors);
}

try {
    $pdo = db_connection();
    require_admin($pdo);

    $stmt = $pdo->prepare(
        'UPDATE bookings
         SET booking_ref = :booking_ref,
             status = :status,
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
             special_requirements = :special_requirements
         WHERE id = :id'
    );

    $stmt->execute([
        ':booking_ref' => $bookingRef,
        ':status' => $status,
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
        ':id' => $bookingId,
    ]);

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
