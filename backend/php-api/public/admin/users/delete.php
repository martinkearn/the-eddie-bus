<?php

declare(strict_types=1);

require_once __DIR__ . '/../../bootstrap_api.php';

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
    fail_json(422, 'Valid user id is required.');
}
$targetUserId = (int)$idRaw;

try {
    $pdo = db_connection();
    $actor = require_admin($pdo);

    if ((int)$actor['id'] === $targetUserId) {
        fail_json(422, 'You cannot delete your own user account while signed in.');
    }

    ensure_not_last_admin_delete($pdo, $targetUserId);

    $usernameStmt = $pdo->prepare('SELECT username FROM admin_users WHERE id = :id LIMIT 1');
    $usernameStmt->execute([':id' => $targetUserId]);
    $target = $usernameStmt->fetch();
    if (!is_array($target)) {
        fail_json(404, 'User not found.');
    }

    revoke_user_sessions($pdo, $targetUserId);

    $deleteStmt = $pdo->prepare('DELETE FROM admin_users WHERE id = :id');
    $deleteStmt->execute([':id' => $targetUserId]);

    auth_event($pdo, 'user_deleted', (int)$actor['id'], (string)$actor['username'], [
        'targetUserId' => $targetUserId,
        'targetUsername' => (string)$target['username'],
    ]);

    respond_json(200, [
        'ok' => true,
        'message' => 'User deleted.',
    ]);
} catch (Throwable $exception) {
    error_log('Admin user delete failed: ' . $exception->getMessage());
    fail_json(500, 'Could not delete user right now.');
}
