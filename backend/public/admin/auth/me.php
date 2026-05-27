<?php

declare(strict_types=1);

require_once __DIR__ . '/../../bootstrap_api.php';

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
    fail_json(405, 'Method not allowed.');
}

try {
    $pdo = db_connection();
    $user = auth_user($pdo);

    if (!is_array($user)) {
        fail_json(401, 'Authentication required.');
    }

    respond_json(200, [
        'ok' => true,
        'user' => [
            'id' => (int)$user['id'],
            'username' => (string)$user['username'],
            'role' => (string)$user['role'],
            'lastLoginAt' => $user['last_login_at'] !== null ? (string)$user['last_login_at'] : null,
        ],
    ]);
} catch (Throwable $exception) {
    error_log('Admin me failed: ' . $exception->getMessage());
    fail_json(500, 'Could not load session right now.');
}
