<?php

declare(strict_types=1);

require_once __DIR__ . '/../../bootstrap_api.php';

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
    fail_json(405, 'Method not allowed.');
}

try {
    $pdo = db_connection();
    require_admin($pdo);

    $stmt = $pdo->query('SELECT id, username, role, last_login_at, created_at, updated_at FROM admin_users ORDER BY username ASC');
    $rows = $stmt->fetchAll();
    if (!is_array($rows)) {
        $rows = [];
    }

    respond_json(200, [
        'ok' => true,
        'items' => $rows,
    ]);
} catch (Throwable $exception) {
    error_log('Admin users list failed: ' . $exception->getMessage());
    fail_json(500, 'Could not load users right now.');
}
