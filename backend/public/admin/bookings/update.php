<?php

declare(strict_types=1);

require_once __DIR__ . '/../../bootstrap_api.php';
require_once $srcPath . '/email.php';

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

function bool_to_int(mixed $value): int
{
    $normalized = strtolower(trim((string)$value));
    if (in_array($normalized, ['1', 'true', 'yes', 'y', 'on'], true)) {
        return 1;
    }

    return 0;
}

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

function is_cancellation_status(string $status): bool
{
    return in_array($status, ['cancelled_by_customer', 'cancelled_by_us'], true);
}

function cancellation_status_label(string $status): string
{
    return match ($status) {
        'cancelled_by_customer' => 'Cancelled by customer',
        'cancelled_by_us' => 'Cancelled by us',
        default => 'Cancelled',
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
if (is_cancellation_status($status) && $adminNotes === '') {
    $errors['adminNotes'] = 'Cancellation reason is required when cancelling a booking.';
}
if ($driverUserIdRaw !== '' && !ctype_digit($driverUserIdRaw)) {
    $errors['driverUserId'] = 'Driver must be a valid user selection.';
}
if ($status !== 'pending' && in_array(trim(strtolower($driverUserIdRaw)), ['', 'unassigned'], true)) {
    $errors['driverUserId'] = 'Driver must be assigned before moving booking beyond Pending.';
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
    $statusBeforeUpdate = '';
    $driverUserIdBeforeUpdate = null;

    $pdo->beginTransaction();

    $existingStatusStmt = $pdo->prepare('SELECT status, driver_user_id FROM bookings WHERE id = :id LIMIT 1 FOR UPDATE');
    $existingStatusStmt->execute([':id' => $bookingId]);
    $existingStatusRow = $existingStatusStmt->fetch();
    if (!is_array($existingStatusRow)) {
        fail_json(404, 'Booking not found.');
    }
    $statusBeforeUpdate = (string)($existingStatusRow['status'] ?? '');
    $driverUserIdBeforeUpdate = $existingStatusRow['driver_user_id'] !== null ? (int)$existingStatusRow['driver_user_id'] : null;

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
        ':checklist_lights_indicators' => checklist_status_or_null($payload['checklistLightsIndicators'] ?? null),
        ':checklist_tyres' => checklist_status_or_null($payload['checklistTyres'] ?? null),
        ':checklist_wheel_nuts' => checklist_status_or_null($payload['checklistWheelNuts'] ?? null),
        ':checklist_bodywork' => checklist_status_or_null($payload['checklistBodywork'] ?? null),
        ':checklist_mirrors_glass' => checklist_status_or_null($payload['checklistMirrorsGlass'] ?? null),
        ':checklist_brakes' => checklist_status_or_null($payload['checklistBrakes'] ?? null),
        ':checklist_steering' => checklist_status_or_null($payload['checklistSteering'] ?? null),
        ':checklist_wipers_washers' => checklist_status_or_null($payload['checklistWipersWashers'] ?? null),
        ':checklist_dashboard_warning_lights' => checklist_status_or_null($payload['checklistDashboardWarningLights'] ?? null),
        ':checklist_seats_seatbelts' => checklist_status_or_null($payload['checklistSeatsSeatbelts'] ?? null),
        ':checklist_emergency_equipment' => checklist_status_or_null($payload['checklistEmergencyEquipment'] ?? null),
        ':checklist_wheelchair_lifts_restraints' => checklist_status_or_null($payload['checklistWheelchairLiftsRestraints'] ?? null),
        ':checklist_tail_lifts' => checklist_status_or_null($payload['checklistTailLifts'] ?? null),
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

    if ($driverUserId !== null) {
        $clearConfirmedStmt = $pdo->prepare(
            "UPDATE booking_driver_mappings
             SET mapping_status = 'available'
             WHERE booking_id = :booking_id
               AND mapping_status = 'confirmed'
               AND user_id <> :user_id"
        );
        $clearConfirmedStmt->execute([
            ':booking_id' => $bookingId,
            ':user_id' => $driverUserId,
        ]);

        $upsertConfirmedStmt = $pdo->prepare(
            'INSERT INTO booking_driver_mappings (booking_id, user_id, mapping_status)
             VALUES (:booking_id, :user_id, :mapping_status)
             ON DUPLICATE KEY UPDATE
               mapping_status = VALUES(mapping_status),
               updated_at = CURRENT_TIMESTAMP'
        );
        $upsertConfirmedStmt->execute([
            ':booking_id' => $bookingId,
            ':user_id' => $driverUserId,
            ':mapping_status' => 'confirmed',
        ]);
    } else {
        $clearConfirmedStmt = $pdo->prepare("DELETE FROM booking_driver_mappings WHERE booking_id = :booking_id AND mapping_status = 'confirmed'");
        $clearConfirmedStmt->execute([':booking_id' => $bookingId]);
    }

    $pdo->commit();

    $statusMovedToConfirmed = $status === 'confirmed' && $statusBeforeUpdate !== 'confirmed';
    $statusMovedToCancellation = is_cancellation_status($status) && $statusBeforeUpdate !== $status;
    $driverChanged = $driverUserIdBeforeUpdate !== $driverUserId;
    $driverChangedToAssigned = $driverChanged && $driverUserId !== null;
    $confirmationEmailSent = true;
    $confirmationEmailError = null;
    $cancellationEmailSent = null;
    $cancellationEmailError = null;
    $driverAssignmentEmailSent = null;
    $driverAssignmentEmailError = null;
    $emailBooking = null;

    if ($statusMovedToConfirmed || $statusMovedToCancellation || $driverChangedToAssigned) {
        try {
            $emailBookingStmt = $pdo->prepare(
                "SELECT
                    b.booking_ref,
                    b.status,
                    b.booking_date,
                    TIME_FORMAT(b.pickup_time, '%H:%i') AS pickup_time,
                    b.organisation,
                    b.destination_name,
                    b.destination_address,
                    b.contact_name,
                    b.contact_email,
                    b.contact_number,
                    b.static_wheelchairs,
                    b.powered_wheelchairs,
                    b.passenger_transfers,
                    b.special_requirements,
                          b.admin_notes,
                    d.email AS driver_email,
                    d.username AS driver_username,
                    COALESCE(NULLIF(TRIM(d.display_name), ''), d.username) AS driver_name
                 FROM bookings b
                 LEFT JOIN admin_users d ON d.id = b.driver_user_id
                 WHERE b.id = :id
                 LIMIT 1"
            );
            $emailBookingStmt->execute([':id' => $bookingId]);
            $emailBooking = $emailBookingStmt->fetch();

            if (!is_array($emailBooking)) {
                throw new RuntimeException('Could not load booking details for email delivery.');
            }
        } catch (RuntimeException $runtimeException) {
            if ($statusMovedToConfirmed) {
                $confirmationEmailSent = false;
                $confirmationEmailError = $runtimeException->getMessage();
            }

            if ($statusMovedToCancellation) {
                $cancellationEmailSent = false;
                $cancellationEmailError = $runtimeException->getMessage();
            }

            if ($driverChangedToAssigned) {
                $driverAssignmentEmailSent = false;
                $driverAssignmentEmailError = $runtimeException->getMessage();
            }

            error_log('Booking email preload failed: ' . $runtimeException->getMessage());
        } catch (Throwable $emailException) {
            if ($statusMovedToConfirmed) {
                $confirmationEmailSent = false;
                $confirmationEmailError = 'Could not load booking details for confirmation email.';
            }

            if ($statusMovedToCancellation) {
                $cancellationEmailSent = false;
                $cancellationEmailError = 'Could not load booking details for cancellation email.';
            }

            if ($driverChangedToAssigned) {
                $driverAssignmentEmailSent = false;
                $driverAssignmentEmailError = 'Could not load booking details for driver assignment email.';
            }

            error_log('Booking email preload failed: ' . $emailException->getMessage());
        }
    }

    if ($statusMovedToConfirmed && is_array($emailBooking)) {
        try {
            $recipientEmail = trim((string)($emailBooking['contact_email'] ?? ''));
            if ($recipientEmail === '' || filter_var($recipientEmail, FILTER_VALIDATE_EMAIL) === false) {
                throw new RuntimeException('Booking contact email is missing or invalid for confirmation email.');
            }

            $bookingRefForEmail = trim((string)($emailBooking['booking_ref'] ?? ''));
            $bookingDateWords = format_booking_date_words((string)($emailBooking['booking_date'] ?? ''));
            $pickupTimeForEmail = trim((string)($emailBooking['pickup_time'] ?? ''));
            $bookingWhen = trim($bookingDateWords . ($pickupTimeForEmail !== '' ? ' at ' . $pickupTimeForEmail : ''));

            $subject = $bookingRefForEmail !== ''
                ? 'Your EDDIE bus booking ' . $bookingRefForEmail . ' is now confirmed'
                : 'Your EDDIE bus booking is now confirmed';

            send_resend_templated_email(
                $recipientEmail,
                $subject,
                'booking-confirmed',
                [
                    'subject' => $subject,
                    'recipient_name' => fallback_text((string)($emailBooking['contact_name'] ?? ''), 'there'),
                    'organisation' => fallback_text((string)($emailBooking['organisation'] ?? ''), 'your organisation'),
                    'destination_name' => fallback_text((string)($emailBooking['destination_name'] ?? ''), 'your chosen destination'),
                    'destination_address' => fallback_text((string)($emailBooking['destination_address'] ?? ''), 'Not provided'),
                    'booking_ref' => fallback_text($bookingRefForEmail, 'Not provided'),
                    'booking_when' => fallback_text($bookingWhen, 'your requested date'),
                    'booking_status_label' => 'Confirmed',
                    'driver_name' => fallback_text((string)($emailBooking['driver_name'] ?? ''), 'the assigned driver'),
                    'contact_name' => fallback_text((string)($emailBooking['contact_name'] ?? ''), 'Not provided'),
                    'contact_email' => fallback_text($recipientEmail, 'Not provided'),
                    'contact_number' => fallback_text((string)($emailBooking['contact_number'] ?? ''), 'Not provided'),
                    'static_wheelchairs' => ((int)($emailBooking['static_wheelchairs'] ?? 0)) === 1 ? 'Yes' : 'No',
                    'powered_wheelchairs' => ((int)($emailBooking['powered_wheelchairs'] ?? 0)) === 1 ? 'Yes' : 'No',
                    'passenger_transfers' => ((int)($emailBooking['passenger_transfers'] ?? 0)) === 1 ? 'Yes' : 'No',
                    'special_requirements' => fallback_text((string)($emailBooking['special_requirements'] ?? ''), 'None provided'),
                    'support_email' => 'bookings@theeddiebus.org.uk',
                    'support_phone' => '07805 400180',
                ]
            );
        } catch (RuntimeException $runtimeException) {
            $confirmationEmailSent = false;
            $confirmationEmailError = $runtimeException->getMessage();
            error_log('Booking confirmed email failed: ' . $runtimeException->getMessage());
        } catch (Throwable $emailException) {
            $confirmationEmailSent = false;
            $confirmationEmailError = 'Could not send booking confirmation email.';
            error_log('Booking confirmed email failed: ' . $emailException->getMessage());
        }
    }

    if ($statusMovedToCancellation && is_array($emailBooking)) {
        if ($cancellationEmailSent === null) {
            $cancellationEmailSent = true;
        }

        try {
            $recipientEmails = normalize_email_recipients([
                (string)($emailBooking['contact_email'] ?? ''),
                (string)($emailBooking['driver_email'] ?? ''),
            ]);
            if ($recipientEmails === []) {
                throw new RuntimeException('No valid customer or driver email was available for the cancellation email.');
            }

            $bookingRefForEmail = trim((string)($emailBooking['booking_ref'] ?? ''));
            $bookingDateWords = format_booking_date_words((string)($emailBooking['booking_date'] ?? ''));
            $pickupTimeForEmail = trim((string)($emailBooking['pickup_time'] ?? ''));
            $bookingWhen = trim($bookingDateWords . ($pickupTimeForEmail !== '' ? ' at ' . $pickupTimeForEmail : ''));
            $cancellationReason = trim((string)($emailBooking['admin_notes'] ?? ''));
            $statusLabel = cancellation_status_label((string)($emailBooking['status'] ?? $status));

            $subject = $bookingRefForEmail !== ''
                ? 'EDDIE bus booking ' . $bookingRefForEmail . ' has been cancelled'
                : 'Your EDDIE bus booking has been cancelled';

            send_resend_templated_email_to_recipients(
                $recipientEmails,
                $subject,
                'booking-cancelled',
                [
                    'subject' => $subject,
                    'recipient_name' => fallback_text((string)($emailBooking['contact_name'] ?? ''), 'there'),
                    'booking_ref' => fallback_text($bookingRefForEmail, 'Not provided'),
                    'booking_when' => fallback_text($bookingWhen, 'Not provided'),
                    'booking_status_label' => $statusLabel,
                    'organisation' => fallback_text((string)($emailBooking['organisation'] ?? ''), 'Not provided'),
                    'destination_name' => fallback_text((string)($emailBooking['destination_name'] ?? ''), 'Not provided'),
                    'destination_address' => fallback_text((string)($emailBooking['destination_address'] ?? ''), 'Not provided'),
                    'contact_name' => fallback_text((string)($emailBooking['contact_name'] ?? ''), 'Not provided'),
                    'contact_email' => fallback_text((string)($emailBooking['contact_email'] ?? ''), 'Not provided'),
                    'contact_number' => fallback_text((string)($emailBooking['contact_number'] ?? ''), 'Not provided'),
                    'driver_name' => fallback_text((string)($emailBooking['driver_name'] ?? ''), 'No driver assigned'),
                    'cancellation_reason' => fallback_text($cancellationReason, 'No reason provided'),
                    'support_email' => 'bookings@theeddiebus.org.uk',
                    'support_phone' => '07805 400180',
                ]
            );
        } catch (RuntimeException $runtimeException) {
            $cancellationEmailSent = false;
            $cancellationEmailError = $runtimeException->getMessage();
            error_log('Booking cancellation email failed: ' . $runtimeException->getMessage());
        } catch (Throwable $emailException) {
            $cancellationEmailSent = false;
            $cancellationEmailError = 'Could not send booking cancellation email.';
            error_log('Booking cancellation email failed: ' . $emailException->getMessage());
        }
    }

    if ($driverChangedToAssigned) {
        if ($driverAssignmentEmailSent === null) {
            $driverAssignmentEmailSent = true;
        }

        if (is_array($emailBooking)) {
            try {
                $recipientEmail = trim((string)($emailBooking['driver_email'] ?? ''));
                if ($recipientEmail === '' || filter_var($recipientEmail, FILTER_VALIDATE_EMAIL) === false) {
                    throw new RuntimeException('Assigned driver email is missing or invalid for driver assignment email.');
                }

                $bookingRefForEmail = trim((string)($emailBooking['booking_ref'] ?? ''));
                $bookingDateWords = format_booking_date_words((string)($emailBooking['booking_date'] ?? ''));
                $pickupTimeForEmail = trim((string)($emailBooking['pickup_time'] ?? ''));
                $bookingWhen = trim($bookingDateWords . ($pickupTimeForEmail !== '' ? ' at ' . $pickupTimeForEmail : ''));

                $subject = $bookingRefForEmail !== ''
                    ? 'Driver confirmation for booking ' . $bookingRefForEmail
                    : 'Driver confirmation for EDDIE bus booking';

                $adminBookingUrl = 'https://theeddiebus.org.uk/admin/';
                if ($bookingRefForEmail !== '') {
                    $adminBookingUrl .= rawurlencode($bookingRefForEmail);
                }

                send_resend_templated_email(
                    $recipientEmail,
                    $subject,
                    'booking-driver-confirmed',
                    [
                        'subject' => $subject,
                        'recipient_name' => fallback_text((string)($emailBooking['driver_name'] ?? ''), 'there'),
                        'booking_ref' => fallback_text($bookingRefForEmail, 'Not provided'),
                        'booking_when' => fallback_text($bookingWhen, 'Not provided'),
                        'organisation' => fallback_text((string)($emailBooking['organisation'] ?? ''), 'Not provided'),
                        'destination_name' => fallback_text((string)($emailBooking['destination_name'] ?? ''), 'Not provided'),
                        'destination_address' => fallback_text((string)($emailBooking['destination_address'] ?? ''), 'Not provided'),
                        'contact_name' => fallback_text((string)($emailBooking['contact_name'] ?? ''), 'Not provided'),
                        'contact_email' => fallback_text((string)($emailBooking['contact_email'] ?? ''), 'Not provided'),
                        'contact_number' => fallback_text((string)($emailBooking['contact_number'] ?? ''), 'Not provided'),
                        'special_requirements' => fallback_text((string)($emailBooking['special_requirements'] ?? ''), 'None provided'),
                        'support_email' => 'bookings@theeddiebus.org.uk',
                        'support_phone' => '07805 400180',
                        'admin_booking_url' => $adminBookingUrl,
                    ]
                );
            } catch (RuntimeException $runtimeException) {
                $driverAssignmentEmailSent = false;
                $driverAssignmentEmailError = $runtimeException->getMessage();
                error_log('Driver assignment email failed: ' . $runtimeException->getMessage());
            } catch (Throwable $emailException) {
                $driverAssignmentEmailSent = false;
                $driverAssignmentEmailError = 'Could not send driver assignment email.';
                error_log('Driver assignment email failed: ' . $emailException->getMessage());
            }
        }
    }

    $messages = ['Booking updated.'];
    if ($statusMovedToConfirmed) {
        $messages[] = $confirmationEmailSent
            ? 'Booking confirmation email sent.'
            : 'Booking confirmation email could not be sent.';
    }
    if ($statusMovedToCancellation) {
        $messages[] = $cancellationEmailSent
            ? 'Booking cancellation email sent.'
            : 'Booking cancellation email could not be sent.';
    }
    if ($driverChangedToAssigned) {
        $messages[] = $driverAssignmentEmailSent
            ? 'Driver assignment email sent.'
            : 'Driver assignment email could not be sent.';
    }

    respond_json(200, [
        'ok' => true,
        'message' => implode(' ', $messages),
        'confirmationEmailSent' => $statusMovedToConfirmed ? $confirmationEmailSent : null,
        'confirmationEmailError' => $statusMovedToConfirmed ? $confirmationEmailError : null,
        'cancellationEmailSent' => $statusMovedToCancellation ? $cancellationEmailSent : null,
        'cancellationEmailError' => $statusMovedToCancellation ? $cancellationEmailError : null,
        'driverAssignmentEmailSent' => $driverChangedToAssigned ? $driverAssignmentEmailSent : null,
        'driverAssignmentEmailError' => $driverChangedToAssigned ? $driverAssignmentEmailError : null,
    ]);
} catch (PDOException $pdoException) {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    $sqlState = $pdoException->errorInfo[0] ?? '';
    if ($sqlState === '23000') {
        fail_json(422, 'Booking reference must be unique.');
    }

    error_log('Admin booking update failed: ' . $pdoException->getMessage());
    fail_json(500, 'Could not update booking right now.');
} catch (Throwable $exception) {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    error_log('Admin booking update failed: ' . $exception->getMessage());
    fail_json(500, 'Could not update booking right now.');
}
