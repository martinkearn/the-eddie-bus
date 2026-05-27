<?php

declare(strict_types=1);

require_once __DIR__ . '/../../bootstrap_api.php';

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    fail_json(405, 'Method not allowed.');
}

try {
    $pdo = db_connection();
    $user = auth_user($pdo);
    $token = session_token_from_request();

    if (is_array($user)) {
        auth_event($pdo, 'logout', (int)$user['id'], (string)$user['username']);
    }

    revoke_session_by_token($pdo, $token);
    clear_session_cookie();

    respond_json(200, [
        'ok' => true,
        'message' => 'Logged out.',
    ]);
} catch (Throwable $exception) {
    error_log('Admin logout failed: ' . $exception->getMessage());
    fail_json(500, 'Could not logout right now.');
}
