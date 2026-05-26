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

$currentPassword = (string)($payload['currentPassword'] ?? '');
$newPassword = (string)($payload['newPassword'] ?? '');

if ($currentPassword === '' || $newPassword === '') {
    fail_json(422, 'Current password and new password are required.');
}

$policyError = validate_password_policy($newPassword);
if ($policyError !== null) {
    fail_json(422, $policyError);
}

try {
    $pdo = db_connection();
    $user = require_auth($pdo);

    $stmt = $pdo->prepare('SELECT password_hash FROM admin_users WHERE id = :id LIMIT 1');
    $stmt->execute([':id' => (int)$user['id']]);
    $row = $stmt->fetch();

    if (!is_array($row) || !password_verify_secure($currentPassword, (string)$row['password_hash'])) {
        fail_json(401, 'Current password is incorrect.');
    }

    $newHash = password_hash_secure($newPassword);
    $updateStmt = $pdo->prepare('UPDATE admin_users SET password_hash = :password_hash WHERE id = :id');
    $updateStmt->execute([
        ':password_hash' => $newHash,
        ':id' => (int)$user['id'],
    ]);

    revoke_user_sessions($pdo, (int)$user['id']);
    clear_session_cookie();

    auth_event($pdo, 'password_changed', (int)$user['id'], (string)$user['username']);

    respond_json(200, [
        'ok' => true,
        'message' => 'Password changed. Please sign in again.',
        'signedOut' => true,
    ]);
} catch (Throwable $exception) {
    error_log('Admin change password failed: ' . $exception->getMessage());
    fail_json(500, 'Could not change password right now.');
}
