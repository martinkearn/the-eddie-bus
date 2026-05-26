<?php

declare(strict_types=1);

require_once __DIR__ . '/../../bootstrap_api.php';

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
    fail_json(405, 'Method not allowed.');
}

$q = trim((string)($_GET['q'] ?? ''));
$limitRaw = trim((string)($_GET['limit'] ?? '25'));
$offsetRaw = trim((string)($_GET['offset'] ?? '0'));

$limit = ctype_digit($limitRaw) ? (int)$limitRaw : 25;
$offset = ctype_digit($offsetRaw) ? (int)$offsetRaw : 0;

$limit = max(1, min(100, $limit));
$offset = max(0, $offset);

try {
    $pdo = db_connection();
    require_auth($pdo);

    $columnCheckStmt = $pdo->prepare('SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table_name AND COLUMN_NAME = :column_name');
    $columnCheckStmt->execute([
        ':table_name' => 'bookings',
        ':column_name' => 'admin_notes',
    ]);
    $hasAdminNotesColumn = ((int)$columnCheckStmt->fetchColumn()) > 0;

    $whereClause = '';
    $params = [];

    if ($q !== '') {
        $adminNotesSearchSql = $hasAdminNotesColumn ? "\n    IFNULL(bookings.admin_notes, '')," : '';
        $whereClause = "\nWHERE CONCAT_WS(' ',\n    CAST(bookings.id AS CHAR),\n    bookings.booking_ref,\n    bookings.status,\n    IFNULL(driver.username, ''),\n    DATE_FORMAT(bookings.booking_date, '%Y-%m-%d'),\n    TIME_FORMAT(bookings.pickup_time, '%H:%i'),\n    bookings.organisation,\n    bookings.destination_name,\n    IFNULL(bookings.destination_address, ''),\n    bookings.contact_name,\n    bookings.contact_email,\n    bookings.contact_number,\n    IF(bookings.static_wheelchairs = 1, 'yes', 'no'),\n    IF(bookings.powered_wheelchairs = 1, 'yes', 'no'),\n    IF(bookings.passenger_transfers = 1, 'yes', 'no'),\n    IFNULL(bookings.special_requirements, '')," . $adminNotesSearchSql . "\n    IFNULL(bookings.source_ip, ''),\n    IFNULL(bookings.user_agent, ''),\n    DATE_FORMAT(bookings.created_at, '%Y-%m-%d %H:%i:%s'),\n    DATE_FORMAT(bookings.updated_at, '%Y-%m-%d %H:%i:%s')\n) LIKE :search_term";
        $params[':search_term'] = '%' . $q . '%';
    }

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
LIMIT :limit_plus OFFSET :offset';

    $stmt = $pdo->prepare($sql);

    foreach ($params as $key => $value) {
        $stmt->bindValue($key, $value, PDO::PARAM_STR);
    }

    $stmt->bindValue(':limit_plus', $limit + 1, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();

    $rows = $stmt->fetchAll();
    if (!is_array($rows)) {
        $rows = [];
    }

    $hasMore = count($rows) > $limit;
    if ($hasMore) {
        array_pop($rows);
    }

    respond_json(200, [
        'ok' => true,
        'items' => $rows,
        'pagination' => [
            'limit' => $limit,
            'offset' => $offset,
            'nextOffset' => $offset + count($rows),
            'hasMore' => $hasMore,
        ],
    ]);
} catch (Throwable $exception) {
    error_log('Admin bookings list failed: ' . $exception->getMessage());
    fail_json(500, 'Could not load bookings right now.');
}
