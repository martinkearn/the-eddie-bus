<?php

declare(strict_types=1);

require_once __DIR__ . '/../../bootstrap_api.php';

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

try {
    $pdo = db_connection();
    require_admin($pdo);

    $stmt = $pdo->prepare('DELETE FROM bookings WHERE id = :id');
    $stmt->execute([':id' => $bookingId]);

    if ($stmt->rowCount() === 0) {
        fail_json(404, 'Booking not found.');
    }

    respond_json(200, [
        'ok' => true,
        'message' => 'Booking deleted.',
    ]);
} catch (Throwable $exception) {
    error_log('Admin booking delete failed: ' . $exception->getMessage());
    fail_json(500, 'Could not delete booking right now.');
}
