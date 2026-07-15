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
require_once $srcPath . '/email.php';

function ref_token_from_text(string $value, int $maxLength = 8): string
{
    $normalized = strtolower(trim($value));
    $normalized = preg_replace('/[^a-z0-9]+/', '', $normalized);
    $normalized = (string)$normalized;

    if ($normalized === '') {
        return 'x';
    }

    return substr($normalized, 0, max(1, $maxLength));
}

function build_booking_ref_base(string $bookingDate, string $pickupTime, string $organisation, string $destinationName): string
{
    [$year, $month, $day] = explode('-', $bookingDate);
    $datePart = $day . $month . substr($year, -2);
    $timePart = str_replace(':', '', $pickupTime);
    $orgPart = ref_token_from_text($organisation, 10);
    $destinationPart = ref_token_from_text($destinationName, 10);

    return sprintf('%s-%s-%s-%s', $datePart, $timePart, $orgPart, $destinationPart);
}

function next_booking_ref(PDO $pdo, string $baseRef): string
{
    $stmt = $pdo->prepare('SELECT booking_ref FROM bookings WHERE booking_ref = :exact OR booking_ref LIKE :like_ref');
    $stmt->execute([
        ':exact' => $baseRef,
        ':like_ref' => $baseRef . '-%',
    ]);

    $rows = $stmt->fetchAll(PDO::FETCH_COLUMN);
    if (!is_array($rows) || $rows === []) {
        return $baseRef;
    }

    $maxSuffix = 1;
    foreach ($rows as $row) {
        $ref = (string)$row;
        if ($ref === $baseRef) {
            $maxSuffix = max($maxSuffix, 1);
            continue;
        }

        if (preg_match('/^' . preg_quote($baseRef, '/') . '-(\d+)$/', $ref, $matches) === 1) {
            $maxSuffix = max($maxSuffix, (int)$matches[1]);
        }
    }

    return $baseRef . '-' . ($maxSuffix + 1);
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

function sanitize_error_for_log(string $message, int $maxLength = 1000): string
{
    $trimmed = trim($message);
    if ($trimmed === '') {
        return 'Unknown error.';
    }

    return substr($trimmed, 0, $maxLength);
}

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

    $baseRef = build_booking_ref_base($bookingDate, $pickupTime, $organisation, $destinationName);
    $bookingRef = next_booking_ref($pdo, $baseRef);

    $stmt = $pdo->prepare(
        'INSERT INTO bookings (
            booking_ref,
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
            :booking_ref,
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

    $params = [
        ':booking_ref' => $bookingRef,
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
    ];

    for ($attempt = 0; $attempt < 5; $attempt += 1) {
        try {
            $stmt->execute($params);
            break;
        } catch (PDOException $pdoException) {
            $sqlState = $pdoException->errorInfo[0] ?? '';
            $isUniqueConflict = $sqlState === '23000';
            if (!$isUniqueConflict || $attempt === 4) {
                throw $pdoException;
            }

            $bookingRef = next_booking_ref($pdo, $baseRef);
            $params[':booking_ref'] = $bookingRef;
        }
    }

    $bookingId = (int)$pdo->lastInsertId();
    $subject = $bookingRef !== ''
        ? 'Your EDDIE bus booking request ' . $bookingRef
        : 'Your EDDIE bus booking request';
    $bookingDateWords = format_booking_date_words($bookingDate);
    $bookingWhen = trim($bookingDateWords . ($pickupTime !== '' ? ' at ' . $pickupTime : ''));

    $emailSent = true;
    $emailError = null;
    $emailErrorCode = null;
    $emailErrorStatus = null;
    $driverAvailabilityEmailTotalRecipients = 0;
    $driverAvailabilityEmailSentCount = 0;
    $driverAvailabilityEmailFailedCount = 0;
    $driverAvailabilityEmailError = null;

    try {
        send_resend_templated_email(
            $contactEmail,
            $subject,
            'booking-acknowledgement',
            [
                'subject' => $subject,
                'recipient_name' => fallback_text($contactName, 'there'),
                'organisation' => fallback_text($organisation, 'your organisation'),
                'destination_name' => fallback_text($destinationName, 'your chosen destination'),
                'destination_address' => fallback_text($destinationAddress, 'Not provided'),
                'booking_ref' => fallback_text($bookingRef, 'Not provided'),
                'booking_when' => fallback_text($bookingWhen, 'your requested date'),
                'booking_status_label' => 'Pending',
                'contact_name' => fallback_text($contactName, 'Not provided'),
                'contact_email' => fallback_text($contactEmail, 'Not provided'),
                'contact_number' => fallback_text($contactNumber, 'Not provided'),
                'static_wheelchairs' => $staticWheelchairs === 1 ? 'Yes' : 'No',
                'powered_wheelchairs' => $poweredWheelchairs === 1 ? 'Yes' : 'No',
                'passenger_transfers' => $passengerTransfers === 1 ? 'Yes' : 'No',
                'special_requirements' => fallback_text($specialRequirements, 'None provided'),
                'support_email' => 'bookings@theeddiebus.org.uk',
                'support_phone' => '07805 400180',
            ]
        );
    } catch (ResendEmailException $resendException) {
        $emailSent = false;
        $emailError = sanitize_error_for_log($resendException->getMessage());
        $emailErrorCode = 'RESEND_API_REJECTED';
        $emailErrorStatus = $resendException->http_status() > 0 ? $resendException->http_status() : null;
        error_log('Booking acknowledgement email failed: ' . $emailError);
    } catch (RuntimeException $runtimeException) {
        $emailSent = false;
        $emailError = sanitize_error_for_log($runtimeException->getMessage());
        $emailErrorCode = 'EMAIL_CONFIG_OR_RUNTIME_ERROR';
        error_log('Booking acknowledgement email failed: ' . $emailError);
    } catch (Throwable $emailException) {
        $emailSent = false;
        $emailError = 'Could not send booking confirmation email.';
        $emailErrorCode = 'EMAIL_UNKNOWN_ERROR';
        error_log('Booking acknowledgement email failed: ' . $emailException->getMessage());
    }

    try {
        $usersStmt = $pdo->query('SELECT id, username, display_name, email FROM admin_users ORDER BY id ASC');
        $users = $usersStmt->fetchAll();
        if (!is_array($users)) {
            $users = [];
        }

        $driverRecipients = [];
        foreach ($users as $userRow) {
            if (!is_array($userRow)) {
                continue;
            }

            $recipientEmail = strtolower(trim((string)($userRow['email'] ?? '')));
            if ($recipientEmail === '' || filter_var($recipientEmail, FILTER_VALIDATE_EMAIL) === false) {
                continue;
            }

            if (isset($driverRecipients[$recipientEmail])) {
                continue;
            }

            $driverRecipients[$recipientEmail] = [
                'email' => $recipientEmail,
                'display_name' => trim((string)($userRow['display_name'] ?? '')),
                'username' => trim((string)($userRow['username'] ?? '')),
            ];
        }

        $driverAvailabilityEmailTotalRecipients = count($driverRecipients);

        if ($driverAvailabilityEmailTotalRecipients > 0) {
            $driverAvailabilitySubject = $bookingRef !== ''
                ? 'Driver availability needed for booking ' . $bookingRef
                : 'Driver availability needed for a new booking';

            $adminBookingUrl = 'https://theeddiebus.org.uk/admin/';
            if ($bookingRef !== '') {
                $adminBookingUrl .= rawurlencode($bookingRef) . '/youravaliability';
            }

            $driverRecipientEmails = array_values(array_map(
                static fn (array $recipient): string => (string)($recipient['email'] ?? ''),
                array_values($driverRecipients)
            ));

            try {
                send_resend_templated_email_to_recipients(
                    $driverRecipientEmails,
                    $driverAvailabilitySubject,
                    'booking-driver-availability-request',
                    [
                        'subject' => $driverAvailabilitySubject,
                        'recipient_name' => 'there',
                        'organisation' => fallback_text($organisation, 'your organisation'),
                        'destination_name' => fallback_text($destinationName, 'your chosen destination'),
                        'destination_address' => fallback_text($destinationAddress, 'Not provided'),
                        'booking_ref' => fallback_text($bookingRef, 'Not provided'),
                        'booking_when' => fallback_text($bookingWhen, 'your requested date'),
                        'booking_status_label' => 'Pending',
                        'admin_booking_url' => $adminBookingUrl,
                        'support_email' => 'bookings@theeddiebus.org.uk',
                        'support_phone' => '07805 400180',
                    ]
                );

                $driverAvailabilityEmailSentCount = $driverAvailabilityEmailTotalRecipients;
            } catch (Throwable $bulkDriverEmailException) {
                error_log('Driver availability bulk email failed, retrying per recipient: ' . $bulkDriverEmailException->getMessage());

                foreach ($driverRecipients as $recipient) {
                    try {
                        $recipientName = fallback_text((string)($recipient['display_name'] ?? ''), (string)($recipient['username'] ?? 'there'));

                        send_resend_templated_email(
                            (string)$recipient['email'],
                            $driverAvailabilitySubject,
                            'booking-driver-availability-request',
                            [
                                'subject' => $driverAvailabilitySubject,
                                'recipient_name' => $recipientName,
                                'organisation' => fallback_text($organisation, 'your organisation'),
                                'destination_name' => fallback_text($destinationName, 'your chosen destination'),
                                'destination_address' => fallback_text($destinationAddress, 'Not provided'),
                                'booking_ref' => fallback_text($bookingRef, 'Not provided'),
                                'booking_when' => fallback_text($bookingWhen, 'your requested date'),
                                'booking_status_label' => 'Pending',
                                'admin_booking_url' => $adminBookingUrl,
                                'support_email' => 'bookings@theeddiebus.org.uk',
                                'support_phone' => '07805 400180',
                            ]
                        );

                        $driverAvailabilityEmailSentCount += 1;
                    } catch (Throwable $driverEmailException) {
                        $driverAvailabilityEmailFailedCount += 1;
                        error_log('Driver availability email failed for ' . (string)$recipient['email'] . ': ' . $driverEmailException->getMessage());
                    }
                }
            }

            if ($driverAvailabilityEmailSentCount < $driverAvailabilityEmailTotalRecipients) {
                $driverAvailabilityEmailFailedCount = max(
                    $driverAvailabilityEmailFailedCount,
                    $driverAvailabilityEmailTotalRecipients - $driverAvailabilityEmailSentCount
                );
            }

            if ($driverAvailabilityEmailFailedCount > 0) {
                $driverAvailabilityEmailError = sprintf(
                    'Sent %d of %d driver availability emails.',
                    $driverAvailabilityEmailSentCount,
                    $driverAvailabilityEmailTotalRecipients
                );
            }
        }
    } catch (Throwable $driverAvailabilityException) {
        $driverAvailabilityEmailError = sanitize_error_for_log($driverAvailabilityException->getMessage());
        error_log('Driver availability email batch failed: ' . $driverAvailabilityException->getMessage());
    }

    $driverAvailabilityEmailsFullySent = $driverAvailabilityEmailTotalRecipients === 0
        || $driverAvailabilityEmailSentCount === $driverAvailabilityEmailTotalRecipients;

    if ($emailSent && $driverAvailabilityEmailsFullySent) {
        respond_json(201, [
            'ok' => true,
            'message' => 'Booking request saved and confirmation email sent.',
            'bookingId' => $bookingId,
            'bookingRef' => $bookingRef,
            'emailSent' => true,
            'emailError' => null,
            'driverAvailabilityEmailTotalRecipients' => $driverAvailabilityEmailTotalRecipients,
            'driverAvailabilityEmailSentCount' => $driverAvailabilityEmailSentCount,
            'driverAvailabilityEmailFailedCount' => $driverAvailabilityEmailFailedCount,
            'driverAvailabilityEmailError' => $driverAvailabilityEmailError,
            'bookingSaved' => true,
        ]);
    }

    $errorCode = $emailErrorCode;
    $errorProviderStatus = $emailErrorStatus;
    $errorDetail = $emailError;
    $failureMessage = 'Your booking request was saved, but we could not send your confirmation email right now. Please contact us and quote your booking reference.';

    if ($emailSent && !$driverAvailabilityEmailsFullySent) {
        $errorCode = 'DRIVER_AVAILABILITY_EMAIL_FAILED';
        $errorProviderStatus = null;
        $errorDetail = $driverAvailabilityEmailError ?? 'Could not send driver availability notification emails to all recipients.';
        $failureMessage = 'Your booking request was saved, but we could not send the driver availability emails to all admin users right now. Please contact us and quote your booking reference.';
    }

    respond_json(502, [
        'ok' => false,
        'message' => $failureMessage,
        'bookingId' => $bookingId,
        'bookingRef' => $bookingRef,
        'bookingSaved' => true,
        'emailSent' => $emailSent,
        'emailError' => $errorDetail,
        'driverAvailabilityEmailTotalRecipients' => $driverAvailabilityEmailTotalRecipients,
        'driverAvailabilityEmailSentCount' => $driverAvailabilityEmailSentCount,
        'driverAvailabilityEmailFailedCount' => $driverAvailabilityEmailFailedCount,
        'driverAvailabilityEmailError' => $driverAvailabilityEmailError,
        'error' => [
            'code' => $errorCode,
            'provider' => 'resend',
            'providerStatus' => $errorProviderStatus,
            'detail' => $errorDetail,
        ],
    ]);
} catch (Throwable $exception) {
    error_log('Booking create failed: ' . $exception->getMessage());
    fail_json(500, 'Could not save booking request right now.');
}
