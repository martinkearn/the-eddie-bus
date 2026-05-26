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

    $stmt = $pdo->prepare('SELECT
        id,
        booking_ref,
        status,
        booking_date,
        TIME_FORMAT(pickup_time, "%H:%i") AS pickup_time,
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
        user_agent,
        created_at,
        updated_at
    FROM bookings
    WHERE id = :id
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
