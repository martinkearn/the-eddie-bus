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

function is_iso_date(string $value): bool
{
    return preg_match('/^\d{4}-\d{2}-\d{2}$/', $value) === 1;
}

$srcPath = resolve_src_path();

require_once $srcPath . '/bootstrap.php';
require_once $srcPath . '/db.php';

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
    fail_json(405, 'Method not allowed.');
}

$config = app_config();
$availabilityConfig = $config['availability'] ?? [];

$today = new DateTimeImmutable('today');
$startDateRaw = trim((string)($_GET['startDate'] ?? ''));
$startDate = is_iso_date($startDateRaw) ? $startDateRaw : $today->format('Y-m-d');

$daysToShow = (int)($availabilityConfig['days_to_show'] ?? 90);
$queryDaysToShow = trim((string)($_GET['daysToShow'] ?? ''));
if ($queryDaysToShow !== '' && ctype_digit($queryDaysToShow)) {
    $daysToShow = (int)$queryDaysToShow;
}
$daysToShow = max(28, min(365, $daysToShow));

$startDateObj = DateTimeImmutable::createFromFormat('Y-m-d', $startDate);
if (!$startDateObj instanceof DateTimeImmutable) {
    fail_json(422, 'Invalid startDate. Use YYYY-MM-DD.');
}

$endDate = $startDateObj->modify('+' . ($daysToShow - 1) . ' days')->format('Y-m-d');

$unavailableDates = [];

try {
    $pdo = db_connection();

    $stmt = $pdo->prepare(
        "SELECT DISTINCT booking_date
         FROM bookings
         WHERE status IN ('pending', 'confirmed')
           AND booking_date BETWEEN :start_date AND :end_date"
    );
    $stmt->execute([
        ':start_date' => $startDate,
        ':end_date' => $endDate,
    ]);

    foreach ($stmt->fetchAll() as $row) {
        $value = trim((string)($row['booking_date'] ?? ''));
        if (is_iso_date($value)) {
            $unavailableDates[$value] = true;
        }
    }

    try {
        $blockedStmt = $pdo->prepare(
            'SELECT unavailable_date
             FROM booking_unavailable_dates
             WHERE is_active = 1
               AND unavailable_date BETWEEN :start_date AND :end_date'
        );
        $blockedStmt->execute([
            ':start_date' => $startDate,
            ':end_date' => $endDate,
        ]);

        foreach ($blockedStmt->fetchAll() as $row) {
            $value = trim((string)($row['unavailable_date'] ?? ''));
            if (is_iso_date($value)) {
                $unavailableDates[$value] = true;
            }
        }
    } catch (Throwable $exception) {
        error_log('Booking availability blocked date query skipped: ' . $exception->getMessage());
    }

    $unavailableDateList = array_keys($unavailableDates);
    sort($unavailableDateList);

    respond_json(200, [
        'startDate' => $startDate,
        'daysToShow' => $daysToShow,
        'disablePastDates' => ($availabilityConfig['disable_past_dates'] ?? true) !== false,
        'disableWeekdays' => $availabilityConfig['disable_weekdays'] ?? [0],
        'unavailableDates' => $unavailableDateList,
    ]);
} catch (Throwable $exception) {
    error_log('Booking availability read failed: ' . $exception->getMessage());
    fail_json(500, 'Could not load availability right now.');
}
