<?php

declare(strict_types=1);

require_once __DIR__ . '/../../../bootstrap_api.php';
require_once $srcPath . '/email.php';

function fallback_text(string $value, string $fallback): string
{
    $trimmed = trim($value);
    return $trimmed !== '' ? $trimmed : $fallback;
}

function format_booking_date_words(string $bookingDate): string
{
    $date = DateTimeImmutable::createFromFormat('Y-m-d', $bookingDate);
    if (!$date instanceof DateTimeImmutable) {
        return $bookingDate;
    }

    return $date->format('l j F Y');
}

function mapping_status_label(string $mappingStatus): string
{
    return match ($mappingStatus) {
        'available' => 'Available',
        'maybe_available' => 'Maybe Available',
        'not_available' => 'Not Available',
        'confirmed' => 'Confirmed',
        default => 'Not set',
    };
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

    $bookingStmt = $pdo->prepare(
        "SELECT
            id,
            driver_user_id,
            booking_ref,
            status,
            booking_date,
            TIME_FORMAT(pickup_time, '%H:%i') AS pickup_time,
            organisation,
            destination_name,
            destination_address,
            contact_name,
            contact_email,
            contact_number
         FROM bookings
         WHERE id = :id
         LIMIT 1"
    );
    $bookingStmt->execute([':id' => $bookingId]);
    $booking = $bookingStmt->fetch();
    if (!is_array($booking)) {
        fail_json(404, 'Booking not found.');
    }

    $isSelfAvailabilityUpdate = $isSelfUpdate;
    $shouldResetBookingDriver = $isSelfAvailabilityUpdate
        && (int)($booking['driver_user_id'] ?? 0) === $targetUserId
        && in_array($mappingStatusRaw, ['maybe_available', 'not_available'], true);

    $targetUserStmt = $pdo->prepare(
        "SELECT
            id,
            username,
            display_name,
            email,
            phone_number
         FROM admin_users
         WHERE id = :id
         LIMIT 1"
    );
    $targetUserStmt->execute([':id' => $targetUserId]);
    $targetUser = $targetUserStmt->fetch();
    if (!is_array($targetUser)) {
        fail_json(422, 'Driver must be an existing user.');
    }

    $existingMappingStmt = $pdo->prepare(
        'SELECT mapping_status FROM booking_driver_mappings WHERE booking_id = :booking_id AND user_id = :user_id LIMIT 1'
    );
    $existingMappingStmt->execute([
        ':booking_id' => $bookingId,
        ':user_id' => $targetUserId,
    ]);
    $existingMapping = $existingMappingStmt->fetch();
    $existingMappingStatus = is_array($existingMapping)
        ? trim((string)($existingMapping['mapping_status'] ?? ''))
        : '';

    $shouldSendAdminAvailabilityAlert = $isSelfAvailabilityUpdate
        && in_array($mappingStatusRaw, ['available', 'maybe_available', 'not_available'], true)
        && ($existingMappingStatus === '' || $existingMappingStatus !== $mappingStatusRaw);

    $driverDisplayName = trim((string)($targetUser['display_name'] ?? ''));
    if ($driverDisplayName === '') {
        $driverDisplayName = trim((string)($targetUser['username'] ?? ''));
    }

    $bookingRefForEmail = trim((string)($booking['booking_ref'] ?? ''));
    $bookingStatusForEmail = trim((string)($booking['status'] ?? ''));
    $bookingDateWords = format_booking_date_words((string)($booking['booking_date'] ?? ''));
    $pickupTimeForEmail = trim((string)($booking['pickup_time'] ?? ''));
    $bookingWhenForEmail = trim($bookingDateWords . ($pickupTimeForEmail !== '' ? ' at ' . $pickupTimeForEmail : ''));
    $driverAssignmentUrl = 'https://theeddiebus.org.uk/admin/';
    if ($bookingRefForEmail !== '') {
        $driverAssignmentUrl .= rawurlencode($bookingRefForEmail) . '/driver-assignment';
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

    if ($shouldSendAdminAvailabilityAlert) {
        try {
            $subject = $bookingRefForEmail !== ''
                ? 'Driver availability updated for booking ' . $bookingRefForEmail
                : 'Driver availability updated for EDDIE bus booking';

            send_resend_templated_email(
                'bookings@theeddiebus.org.uk',
                $subject,
                'booking-driver-availability-admin-alert',
                [
                    'subject' => $subject,
                    'booking_ref' => fallback_text($bookingRefForEmail, 'Not provided'),
                    'booking_status_label' => fallback_text(ucwords(str_replace('_', ' ', $bookingStatusForEmail)), 'Not provided'),
                    'booking_when' => fallback_text($bookingWhenForEmail, 'Not provided'),
                    'organisation' => fallback_text((string)($booking['organisation'] ?? ''), 'Not provided'),
                    'destination_name' => fallback_text((string)($booking['destination_name'] ?? ''), 'Not provided'),
                    'destination_address' => fallback_text((string)($booking['destination_address'] ?? ''), 'Not provided'),
                    'contact_name' => fallback_text((string)($booking['contact_name'] ?? ''), 'Not provided'),
                    'contact_email' => fallback_text((string)($booking['contact_email'] ?? ''), 'Not provided'),
                    'contact_number' => fallback_text((string)($booking['contact_number'] ?? ''), 'Not provided'),
                    'driver_name' => fallback_text($driverDisplayName, 'Not provided'),
                    'driver_email' => fallback_text((string)($targetUser['email'] ?? ''), 'Not provided'),
                    'driver_phone' => fallback_text((string)($targetUser['phone_number'] ?? ''), 'Not provided'),
                    'driver_availability_label' => mapping_status_label($mappingStatusRaw),
                    'driver_assignment_url' => $driverAssignmentUrl,
                ],
                false
            );
        } catch (Throwable $emailException) {
            error_log('Driver availability admin alert email failed: ' . $emailException->getMessage());
        }
    }

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
