<?php

declare(strict_types=1);

require_once __DIR__ . '/../../bootstrap_api.php';
require_once $srcPath . '/email.php';

const CHECKLIST_FIELDS = [
    'checklist_lights_indicators' => ['payload' => 'checklistLightsIndicators', 'label' => 'Lights & indicators'],
    'checklist_tyres' => ['payload' => 'checklistTyres', 'label' => 'Tyres'],
    'checklist_wheel_nuts' => ['payload' => 'checklistWheelNuts', 'label' => 'Wheel nuts'],
    'checklist_bodywork' => ['payload' => 'checklistBodywork', 'label' => 'Bodywork'],
    'checklist_mirrors_glass' => ['payload' => 'checklistMirrorsGlass', 'label' => 'Mirrors & glass'],
    'checklist_brakes' => ['payload' => 'checklistBrakes', 'label' => 'Brakes'],
    'checklist_steering' => ['payload' => 'checklistSteering', 'label' => 'Steering'],
    'checklist_wipers_washers' => ['payload' => 'checklistWipersWashers', 'label' => 'Wipers & washers'],
    'checklist_dashboard_warning_lights' => ['payload' => 'checklistDashboardWarningLights', 'label' => 'Dashboard warning lights'],
    'checklist_seats_seatbelts' => ['payload' => 'checklistSeatsSeatbelts', 'label' => 'Seats & seatbelts'],
    'checklist_emergency_equipment' => ['payload' => 'checklistEmergencyEquipment', 'label' => 'Emergency equipment'],
    'checklist_wheelchair_lifts_restraints' => ['payload' => 'checklistWheelchairLiftsRestraints', 'label' => 'Wheelchair lifts & restraints'],
    'checklist_tail_lifts' => ['payload' => 'checklistTailLifts', 'label' => 'Tail lifts'],
];

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
$checklistValues = [];
foreach (CHECKLIST_FIELDS as $column => $definition) {
    $checklistValues[$column] = checklist_status_or_null($payload[$definition['payload']] ?? '');
}

try {
    $pdo = db_connection();
    $user = require_auth($pdo);

    // Verify the booking exists and the user is either an admin or the assigned driver.
    $bookingStmt = $pdo->prepare('SELECT * FROM bookings WHERE id = :id LIMIT 1');
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

    $newConcernLabels = [];
    $allConcernLabels = [];
    foreach (CHECKLIST_FIELDS as $column => $definition) {
        if ($checklistValues[$column] !== 'concern') {
            continue;
        }

        $allConcernLabels[] = $definition['label'];
        if (checklist_status_or_null($booking[$column] ?? null) !== 'concern') {
            $newConcernLabels[] = $definition['label'];
        }
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
        ':checklist_lights_indicators' => $checklistValues['checklist_lights_indicators'],
        ':checklist_tyres' => $checklistValues['checklist_tyres'],
        ':checklist_wheel_nuts' => $checklistValues['checklist_wheel_nuts'],
        ':checklist_bodywork' => $checklistValues['checklist_bodywork'],
        ':checklist_mirrors_glass' => $checklistValues['checklist_mirrors_glass'],
        ':checklist_brakes' => $checklistValues['checklist_brakes'],
        ':checklist_steering' => $checklistValues['checklist_steering'],
        ':checklist_wipers_washers' => $checklistValues['checklist_wipers_washers'],
        ':checklist_dashboard_warning_lights' => $checklistValues['checklist_dashboard_warning_lights'],
        ':checklist_seats_seatbelts' => $checklistValues['checklist_seats_seatbelts'],
        ':checklist_emergency_equipment' => $checklistValues['checklist_emergency_equipment'],
        ':checklist_wheelchair_lifts_restraints' => $checklistValues['checklist_wheelchair_lifts_restraints'],
        ':checklist_tail_lifts' => $checklistValues['checklist_tail_lifts'],
        ':vehicle_check_date' => $vehicleCheckDate,
        ':vehicle_check_signed_by' => $vehicleCheckSignedBy,
        ':vehicle_faults_recorded' => $vehicleFaultsRecorded,
    ]);

    $pdo->commit();

    $notificationErrors = [];
    if ($newConcernLabels !== []) {
        $adminStmt = $pdo->query("SELECT email FROM admin_users WHERE role = 'admin' ORDER BY id ASC");
        $adminEmails = [];
        foreach ($adminStmt->fetchAll() as $adminUser) {
            $adminEmail = trim((string)($adminUser['email'] ?? ''));
            if ($adminEmail !== '' && filter_var($adminEmail, FILTER_VALIDATE_EMAIL) !== false) {
                $adminEmails[] = $adminEmail;
            }
        }

        if ($adminEmails === []) {
            $notificationErrors[] = 'no-admin-recipient';
            error_log('Checklist concern email failed: no admin users have a valid email address.');
        }

        $bookingRef = trim((string)($booking['booking_ref'] ?? ''));
        $subject = 'URGENT: Vehicle checklist concern' . ($bookingRef !== '' ? ' - ' . $bookingRef : '');
        foreach (array_values(array_unique($adminEmails)) as $adminEmail) {
            try {
                send_resend_templated_email(
                    $adminEmail,
                    $subject,
                    'booking-checklist-concern',
                    [
                        'subject' => $subject,
                        'new_concerns' => implode(', ', $newConcernLabels),
                        'all_concerns' => implode(', ', $allConcernLabels),
                        'booking_ref' => $bookingRef !== '' ? $bookingRef : 'Not provided',
                        'booking_date' => trim((string)($booking['booking_date'] ?? '')) ?: 'Not provided',
                        'organisation' => trim((string)($booking['organisation'] ?? '')) ?: 'Not provided',
                        'pickup_address' => trim((string)($booking['pickup_address'] ?? '')) ?: 'Not provided',
                        'destination_name' => trim((string)($booking['destination_name'] ?? '')) ?: 'Not provided',
                        'vehicle_check_date' => $vehicleCheckDateRaw !== '' ? $vehicleCheckDateRaw : 'Not provided',
                        'vehicle_check_signed_by' => $vehicleCheckSignedBy !== '' ? $vehicleCheckSignedBy : 'Not provided',
                        'vehicle_faults_recorded' => $vehicleFaultsRecorded !== '' ? $vehicleFaultsRecorded : 'None recorded',
                        'updated_by' => trim((string)($user['display_name'] ?? $user['username'] ?? '')) ?: 'Unknown user',
                        'admin_portal_url' => 'https://theeddiebus.org.uk/admin/',
                    ],
                    false
                );
            } catch (RuntimeException $emailException) {
                $notificationErrors[] = $adminEmail;
                error_log('Checklist concern email failed for ' . $adminEmail . ': ' . $emailException->getMessage());
            }
        }
    }

    respond_json(200, [
        'ok' => true,
        'message' => 'Checklist updated successfully.',
        'concernNotificationRequired' => $newConcernLabels !== [],
        'concernNotificationSent' => $newConcernLabels !== [] && $notificationErrors === [],
        'concernNotificationFailedRecipients' => count($notificationErrors),
    ]);
} catch (Throwable $exception) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log('update-checklist error: ' . $exception->getMessage());
    fail_json(500, 'Could not update checklist. Please try again.');
}
