<?php

declare(strict_types=1);

require_once __DIR__ . '/../../bootstrap_api.php';

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
    fail_json(405, 'Method not allowed.');
}

$q = trim((string)($_GET['q'] ?? ''));
$limitRaw = trim((string)($_GET['limit'] ?? '250'));
$fromRaw = trim((string)($_GET['from'] ?? ''));
$toRaw = trim((string)($_GET['to'] ?? ''));

$limit = ctype_digit($limitRaw) ? (int)$limitRaw : 250;
$limit = max(1, min(1000, $limit));

$today = new DateTimeImmutable('today');
$defaultFrom = $today->modify('-4 weeks')->format('Y-m-d');
$defaultTo = $today->modify('+8 weeks')->format('Y-m-d');

$fromDate = preg_match('/^\d{4}-\d{2}-\d{2}$/', $fromRaw) ? $fromRaw : $defaultFrom;
$toDate = preg_match('/^\d{4}-\d{2}-\d{2}$/', $toRaw) ? $toRaw : $defaultTo;

if ($fromDate > $toDate) {
    [$fromDate, $toDate] = [$toDate, $fromDate];
}

try {
    $pdo = db_connection();
    require_auth($pdo);

    $columnCheckStmt = $pdo->prepare('SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table_name AND COLUMN_NAME = :column_name');
    $columnCheckStmt->execute([
        ':table_name' => 'bookings',
        ':column_name' => 'admin_notes',
    ]);
    $hasAdminNotesColumn = ((int)$columnCheckStmt->fetchColumn()) > 0;

    $whereConditions = [];
    $params = [];

    // Only apply date window when not doing a text search
    if ($q === '') {
        $whereConditions[] = 'bookings.booking_date >= :from_date';
        $whereConditions[] = 'bookings.booking_date <= :to_date';
        $params[':from_date'] = $fromDate;
        $params[':to_date'] = $toDate;
    }

    if ($q !== '') {
        $searchTerm = function_exists('mb_strtolower')
            ? mb_strtolower($q, 'UTF-8')
            : strtolower($q);

        $searchColumns = [
            'CAST(bookings.id AS CHAR)',
            'bookings.booking_ref',
            'bookings.status',
            "IFNULL(driver.username, '')",
            "DATE_FORMAT(bookings.booking_date, '%Y-%m-%d')",
            "TIME_FORMAT(bookings.pickup_time, '%H:%i')",
            'bookings.organisation',
            'bookings.destination_name',
            "IFNULL(bookings.destination_address, '')",
            'bookings.contact_name',
            'bookings.contact_email',
            'bookings.contact_number',
            "IF(bookings.static_wheelchairs = 1, 'yes', 'no')",
            "IF(bookings.powered_wheelchairs = 1, 'yes', 'no')",
            "IF(bookings.passenger_transfers = 1, 'yes', 'no')",
            "IFNULL(bookings.special_requirements, '')",
            "DATE_FORMAT(bookings.created_at, '%Y-%m-%d %H:%i:%s')",
            "DATE_FORMAT(bookings.updated_at, '%Y-%m-%d %H:%i:%s')",
        ];

        if ($hasAdminNotesColumn) {
            $searchColumns[] = "IFNULL(bookings.admin_notes, '')";
        }

        $searchConditions = [];
        foreach ($searchColumns as $index => $expression) {
            $placeholder = ':search_term_' . $index;
            $searchConditions[] = 'LOWER(' . $expression . ') LIKE ' . $placeholder;
            $params[$placeholder] = '%' . $searchTerm . '%';
        }

        $whereConditions[] = '(' . implode(' OR ', $searchConditions) . ')';
    }

    $whereClause = "\nWHERE\n    " . implode("\n    AND ", $whereConditions);

    $adminNotesSelectSql = $hasAdminNotesColumn ? 'bookings.admin_notes' : 'NULL AS admin_notes';

    $sql = 'SELECT
        bookings.id,
        bookings.booking_ref,
        bookings.status,
        bookings.driver_user_id,
        driver.username AS driver_username,
        bookings.booking_date,
        TIME_FORMAT(bookings.pickup_time, "%H:%i") AS pickup_time,
        bookings.organisation,
        bookings.destination_name,
        bookings.destination_address,
        bookings.contact_name,
        bookings.contact_email,
        bookings.contact_number,
        bookings.static_wheelchairs,
        bookings.powered_wheelchairs,
        bookings.passenger_transfers,
        bookings.special_requirements,
        ' . $adminNotesSelectSql . ',
        bookings.source_ip,
        bookings.user_agent,
        bookings.created_at,
        bookings.updated_at
    FROM bookings
    LEFT JOIN admin_users driver ON driver.id = bookings.driver_user_id'
    . $whereClause
    . '
ORDER BY bookings.booking_date DESC, bookings.pickup_time DESC, bookings.id DESC
LIMIT :limit';

    $stmt = $pdo->prepare($sql);

    foreach ($params as $key => $value) {
        $stmt->bindValue($key, $value, PDO::PARAM_STR);
    }

    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->execute();

    $rows = $stmt->fetchAll();
    if (!is_array($rows)) {
        $rows = [];
    }

    // Count bookings outside the window (only meaningful when a date window is active)
    $pastCount = 0;
    $futureCount = 0;
    if ($q === '') {
        $pastStmt = $pdo->prepare('SELECT COUNT(*) FROM bookings WHERE booking_date < :from_date');
        $pastStmt->execute([':from_date' => $fromDate]);
        $pastCount = (int)$pastStmt->fetchColumn();

        $futureStmt = $pdo->prepare('SELECT COUNT(*) FROM bookings WHERE booking_date > :to_date');
        $futureStmt->execute([':to_date' => $toDate]);
        $futureCount = (int)$futureStmt->fetchColumn();
    }

    respond_json(200, [
        'ok' => true,
        'items' => $rows,
        'window' => [
            'from' => $fromDate,
            'to' => $toDate,
            'limit' => $limit,
            'pastCount' => $pastCount,
            'futureCount' => $futureCount,
        ],
    ]);
} catch (Throwable $exception) {
    error_log('Admin bookings list failed: ' . $exception->getMessage());
    fail_json(500, 'Could not load bookings right now.');
}
