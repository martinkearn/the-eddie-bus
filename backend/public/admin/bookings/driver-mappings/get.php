<?php

declare(strict_types=1);

require_once __DIR__ . '/../../../bootstrap_api.php';

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
    fail_json(405, 'Method not allowed.');
}

$bookingIdRaw = trim((string)($_GET['booking_id'] ?? ''));
if ($bookingIdRaw === '' || !ctype_digit($bookingIdRaw)) {
    fail_json(422, 'A valid booking id is required.');
}
$bookingId = (int)$bookingIdRaw;

try {
    $pdo = db_connection();
    $user = require_auth($pdo);

    $bookingStmt = $pdo->prepare('SELECT id, driver_user_id FROM bookings WHERE id = :id LIMIT 1');
    $bookingStmt->execute([':id' => $bookingId]);
    $booking = $bookingStmt->fetch();
    if (!is_array($booking)) {
        fail_json(404, 'Booking not found.');
    }

    $stmt = $pdo->prepare(
        "SELECT
            m.user_id,
            u.username,
            u.role,
            m.mapping_status,
            m.created_at,
            m.updated_at
        FROM booking_driver_mappings m
        INNER JOIN admin_users u ON u.id = m.user_id
        WHERE m.booking_id = :booking_id
        ORDER BY
            CASE m.mapping_status
                WHEN 'confirmed' THEN 1
                WHEN 'available' THEN 2
                WHEN 'maybe_available' THEN 3
                WHEN 'not_available' THEN 4
                ELSE 5
            END,
            u.username ASC"
    );
    $stmt->execute([':booking_id' => $bookingId]);
    $rows = $stmt->fetchAll();
    if (!is_array($rows)) {
        $rows = [];
    }

    $currentUserMappingStatus = null;
    foreach ($rows as $row) {
        if ((int)($row['user_id'] ?? 0) === (int)$user['id']) {
            $currentUserMappingStatus = (string)$row['mapping_status'];
            break;
        }
    }

    respond_json(200, [
        'ok' => true,
        'bookingId' => $bookingId,
        'driverUserId' => $booking['driver_user_id'] !== null ? (int)$booking['driver_user_id'] : null,
        'mappings' => $rows,
        'currentUserMappingStatus' => $currentUserMappingStatus,
        'canConfirm' => (($user['role'] ?? '') === 'admin'),
    ]);
} catch (Throwable $exception) {
    error_log('Booking driver mappings get failed: ' . $exception->getMessage());
    fail_json(500, 'Could not load driver availability right now.');
}
