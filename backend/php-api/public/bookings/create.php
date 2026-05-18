<?php

declare(strict_types=1);

function resolve_src_path(): string
{
    $candidates = [];

    $explicitPath = getenv('BOOKING_API_SRC_PATH');
    if ($explicitPath !== false && $explicitPath !== '') {
        $candidates[] = $explicitPath;
    }

    $documentRoot = $_SERVER['DOCUMENT_ROOT'] ?? '';
    if (is_string($documentRoot) && $documentRoot !== '') {
        $candidates[] = dirname($documentRoot) . '/booking-api/src';
    }

    $candidates[] = __DIR__ . '/../../src';

    foreach ($candidates as $candidate) {
        if (!is_string($candidate) || $candidate === '') {
            continue;
        }

        $resolved = realpath($candidate);
        if (is_string($resolved) && is_dir($resolved)) {
            return $resolved;
        }
    }

    throw new RuntimeException('Could not resolve API src path.');
}

$srcPath = resolve_src_path();

require_once $srcPath . '/bootstrap.php';
require_once $srcPath . '/db.php';

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    fail_json(405, 'Method not allowed.');
}

$contentType = $_SERVER['CONTENT_TYPE'] ?? '';
if (stripos($contentType, 'application/json') !== 0) {
    fail_json(415, 'Content-Type must be application/json.');
}

$rawBody = file_get_contents('php://input');
if (!is_string($rawBody) || $rawBody === '') {
    fail_json(400, 'Request body is required.');
}

$payload = json_decode($rawBody, true);
if (!is_array($payload)) {
    fail_json(400, 'Invalid JSON payload.');
}

$requiredFields = [
    'bookingDate',
    'pickupTime',
    'organisation',
    'destinationName',
    'contactName',
    'contactEmail',
    'contactNumber',
];

$errors = [];
foreach ($requiredFields as $field) {
    if (!isset($payload[$field]) || trim((string)$payload[$field]) === '') {
        $errors[$field] = 'This field is required.';
    }
}

$bookingDate = trim((string)($payload['bookingDate'] ?? ''));
$pickupTime = trim((string)($payload['pickupTime'] ?? ''));
$contactEmail = trim((string)($payload['contactEmail'] ?? ''));

if ($bookingDate !== '' && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $bookingDate)) {
    $errors['bookingDate'] = 'Date must be in YYYY-MM-DD format.';
}

if ($pickupTime !== '' && !preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $pickupTime)) {
    $errors['pickupTime'] = 'Pickup time must be in HH:MM format.';
}

if ($contactEmail !== '' && filter_var($contactEmail, FILTER_VALIDATE_EMAIL) === false) {
    $errors['contactEmail'] = 'Please provide a valid email address.';
}

if ($errors !== []) {
    fail_json(422, 'Validation failed.', $errors);
}

$toFlag = static function (mixed $value): int {
    return strtolower(trim((string)$value)) === 'yes' ? 1 : 0;
};

$organisation = trim((string)($payload['organisation'] ?? ''));
$destinationName = trim((string)($payload['destinationName'] ?? ''));
$destinationAddress = trim((string)($payload['destinationAddress'] ?? ''));
$contactName = trim((string)($payload['contactName'] ?? ''));
$contactNumber = trim((string)($payload['contactNumber'] ?? ''));
$specialRequirements = trim((string)($payload['specialRequirements'] ?? ''));

$staticWheelchairs = $toFlag($payload['staticWheelchairs'] ?? 'No');
$poweredWheelchairs = $toFlag($payload['poweredWheelchairs'] ?? 'No');
$passengerTransfers = $toFlag($payload['passengerTransfers'] ?? 'No');

$sourceIp = substr((string)($_SERVER['REMOTE_ADDR'] ?? ''), 0, 45);
$userAgent = substr((string)($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 512);

try {
    $pdo = db_connection();

    $stmt = $pdo->prepare(
        'INSERT INTO bookings (
            booking_date,
            pickup_time,
            organisation,
            destination_name,
            destination_address,
            contact_name,
            contact_email,
            contact_number,
            static_wheelchairs,
            powered_wheelchairs,
            passenger_transfers,
            special_requirements,
            source_ip,
            user_agent
        ) VALUES (
            :booking_date,
            :pickup_time,
            :organisation,
            :destination_name,
            :destination_address,
            :contact_name,
            :contact_email,
            :contact_number,
            :static_wheelchairs,
            :powered_wheelchairs,
            :passenger_transfers,
            :special_requirements,
            :source_ip,
            :user_agent
        )'
    );

    $stmt->execute([
        ':booking_date' => $bookingDate,
        ':pickup_time' => $pickupTime . ':00',
        ':organisation' => $organisation,
        ':destination_name' => $destinationName,
        ':destination_address' => $destinationAddress !== '' ? $destinationAddress : null,
        ':contact_name' => $contactName,
        ':contact_email' => $contactEmail,
        ':contact_number' => $contactNumber,
        ':static_wheelchairs' => $staticWheelchairs,
        ':powered_wheelchairs' => $poweredWheelchairs,
        ':passenger_transfers' => $passengerTransfers,
        ':special_requirements' => $specialRequirements !== '' ? $specialRequirements : null,
        ':source_ip' => $sourceIp,
        ':user_agent' => $userAgent,
    ]);

    $bookingId = (int)$pdo->lastInsertId();

    respond_json(201, [
        'ok' => true,
        'message' => 'Booking request saved.',
        'bookingId' => $bookingId,
    ]);
} catch (Throwable $exception) {
    error_log('Booking create failed: ' . $exception->getMessage());
    fail_json(500, 'Could not save booking request right now.');
}
