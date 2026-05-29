<?php

declare(strict_types=1);

require_once __DIR__ . '/../../../bootstrap_api.php';

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

$bookingIdRaw = trim((string)($payload['bookingId'] ?? ''));
$targetUserIdRaw = trim((string)($payload['userId'] ?? ''));
$mappingStatusRaw = trim((string)($payload['mappingStatus'] ?? ''));

if ($bookingIdRaw === '' || !ctype_digit($bookingIdRaw)) {
    fail_json(422, 'A valid booking id is required.');
}

$allowedStatuses = ['available', 'maybe_available', 'not_available', 'confirmed', ''];
if (!in_array($mappingStatusRaw, $allowedStatuses, true)) {
    fail_json(422, 'Mapping status is invalid.');
}

$bookingId = (int)$bookingIdRaw;

try {
    $pdo = db_connection();
    $authUser = require_auth($pdo);

    $targetUserId = (int)$authUser['id'];
    if ($targetUserIdRaw !== '') {
        if (!ctype_digit($targetUserIdRaw)) {
            fail_json(422, 'A valid driver user id is required.');
        }

        $requestedTargetUserId = (int)$targetUserIdRaw;
        if ($requestedTargetUserId !== (int)$authUser['id'] && ($authUser['role'] ?? '') !== 'admin') {
            fail_json(403, 'You can only update your own mapping.');
        }

        $targetUserId = $requestedTargetUserId;
    }

    $isSelfUpdate = $targetUserId === (int)$authUser['id'];

    if ($isSelfUpdate) {
        $selfAssignableStatuses = ['available', 'maybe_available', 'not_available'];
        if (!in_array($mappingStatusRaw, $selfAssignableStatuses, true)) {
            fail_json(403, 'Please choose Available, Maybe Available, or Not Available for yourself.');
        }
    } else {
        if (($authUser['role'] ?? '') !== 'admin') {
            fail_json(403, 'Only admin users can update another user.');
        }

        if (!in_array($mappingStatusRaw, ['confirmed', ''], true)) {
            fail_json(403, 'Admin updates for another user must be Confirmed or clear.');
        }
    }

    if ($mappingStatusRaw === 'confirmed' && ($authUser['role'] ?? '') !== 'admin') {
        fail_json(403, 'Only admin users can confirm a driver.');
    }

    $bookingStmt = $pdo->prepare('SELECT id, driver_user_id FROM bookings WHERE id = :id LIMIT 1');
    $bookingStmt->execute([':id' => $bookingId]);
    $booking = $bookingStmt->fetch();
    if (!is_array($booking)) {
        fail_json(404, 'Booking not found.');
    }

    $isSelfAvailabilityUpdate = $isSelfUpdate;
    $shouldResetBookingDriver = $isSelfAvailabilityUpdate
        && (int)($booking['driver_user_id'] ?? 0) === $targetUserId
        && in_array($mappingStatusRaw, ['maybe_available', 'not_available'], true);

    $targetUserStmt = $pdo->prepare('SELECT id FROM admin_users WHERE id = :id LIMIT 1');
    $targetUserStmt->execute([':id' => $targetUserId]);
    $targetUser = $targetUserStmt->fetch();
    if (!is_array($targetUser)) {
        fail_json(422, 'Driver must be an existing user.');
    }

    $pdo->beginTransaction();

    if ($mappingStatusRaw === '') {
        $deleteStmt = $pdo->prepare('DELETE FROM booking_driver_mappings WHERE booking_id = :booking_id AND user_id = :user_id');
        $deleteStmt->execute([
            ':booking_id' => $bookingId,
            ':user_id' => $targetUserId,
        ]);

        $clearDriverStmt = $pdo->prepare('UPDATE bookings SET driver_user_id = NULL WHERE id = :booking_id AND driver_user_id = :user_id');
        $clearDriverStmt->execute([
            ':booking_id' => $bookingId,
            ':user_id' => $targetUserId,
        ]);
    } else {
        if ($mappingStatusRaw === 'confirmed') {
            $clearConfirmedStmt = $pdo->prepare(
                "UPDATE booking_driver_mappings
                 SET mapping_status = 'available'
                 WHERE booking_id = :booking_id
                   AND mapping_status = 'confirmed'
                   AND user_id <> :user_id"
            );
            $clearConfirmedStmt->execute([
                ':booking_id' => $bookingId,
                ':user_id' => $targetUserId,
            ]);
        }

        $upsertStmt = $pdo->prepare(
            'INSERT INTO booking_driver_mappings (booking_id, user_id, mapping_status)
             VALUES (:booking_id, :user_id, :mapping_status)
             ON DUPLICATE KEY UPDATE
               mapping_status = VALUES(mapping_status),
               updated_at = CURRENT_TIMESTAMP'
        );
        $upsertStmt->execute([
            ':booking_id' => $bookingId,
            ':user_id' => $targetUserId,
            ':mapping_status' => $mappingStatusRaw,
        ]);

        if ($mappingStatusRaw === 'confirmed') {
            $setDriverStmt = $pdo->prepare('UPDATE bookings SET driver_user_id = :user_id WHERE id = :booking_id');
            $setDriverStmt->execute([
                ':booking_id' => $bookingId,
                ':user_id' => $targetUserId,
            ]);
        } elseif ($shouldResetBookingDriver) {
            $clearDriverStmt = $pdo->prepare('UPDATE bookings SET driver_user_id = NULL, status = :status WHERE id = :booking_id AND driver_user_id = :user_id');
            $clearDriverStmt->execute([
                ':status' => 'pending',
                ':booking_id' => $bookingId,
                ':user_id' => $targetUserId,
            ]);
        }
    }

    $pdo->commit();

    respond_json(200, [
        'ok' => true,
        'message' => 'Availability updated.',
    ]);
} catch (Throwable $exception) {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    error_log('Booking driver mapping update failed: ' . $exception->getMessage());
    fail_json(500, 'Could not update availability right now.');
}
