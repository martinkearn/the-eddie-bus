<?php

declare(strict_types=1);

require_once __DIR__ . '/../../bootstrap_api.php';

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
    fail_json(405, 'Method not allowed.');
}

try {
    $pdo = db_connection();
    require_auth($pdo);

    $stmt = $pdo->query(
        "SELECT
            id,
            username,
            display_name,
            COALESCE(NULLIF(TRIM(display_name), ''), username) AS label
         FROM admin_users
         ORDER BY label ASC, username ASC"
    );
    $rows = $stmt->fetchAll();
    if (!is_array($rows)) {
        $rows = [];
    }

    respond_json(200, [
        'ok' => true,
        'items' => $rows,
    ]);
} catch (Throwable $exception) {
    error_log('Admin user options failed: ' . $exception->getMessage());
    fail_json(500, 'Could not load user options right now.');
}
