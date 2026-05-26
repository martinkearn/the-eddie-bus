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

    $whereClause = '';
    $params = [];

    if ($q !== '') {
        $whereClause = "\nWHERE CONCAT_WS(' ',\n    CAST(id AS CHAR),\n    booking_ref,\n    status,\n    DATE_FORMAT(booking_date, '%Y-%m-%d'),\n    TIME_FORMAT(pickup_time, '%H:%i'),\n    organisation,\n    destination_name,\n    IFNULL(destination_address, ''),\n    contact_name,\n    contact_email,\n    contact_number,\n    IF(static_wheelchairs = 1, 'yes', 'no'),\n    IF(powered_wheelchairs = 1, 'yes', 'no'),\n    IF(passenger_transfers = 1, 'yes', 'no'),\n    IFNULL(special_requirements, ''),\n    IFNULL(source_ip, ''),\n    IFNULL(user_agent, ''),\n    DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s'),\n    DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s')\n) LIKE :search_term";
        $params[':search_term'] = '%' . $q . '%';
    }

    $sql = 'SELECT
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
    FROM bookings'
    . $whereClause
    . '
ORDER BY booking_date DESC, pickup_time DESC, id DESC
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
