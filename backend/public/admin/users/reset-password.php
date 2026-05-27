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
$providedPassword = (string)($payload['newPassword'] ?? '');

if ($idRaw === '' || !ctype_digit($idRaw)) {
    fail_json(422, 'Valid user id is required.');
}
$targetUserId = (int)$idRaw;

$newPassword = $providedPassword !== '' ? $providedPassword : random_password(12);
$policyError = validate_password_policy($newPassword);
if ($policyError !== null) {
    fail_json(422, $policyError);
}

try {
    $pdo = db_connection();
    $actor = require_admin($pdo);

    $targetStmt = $pdo->prepare('SELECT id, username FROM admin_users WHERE id = :id LIMIT 1');
    $targetStmt->execute([':id' => $targetUserId]);
    $target = $targetStmt->fetch();

    if (!is_array($target)) {
        fail_json(404, 'User not found.');
    }

    $hash = password_hash_secure($newPassword);
    $updateStmt = $pdo->prepare('UPDATE admin_users SET password_hash = :password_hash WHERE id = :id');
    $updateStmt->execute([
        ':password_hash' => $hash,
        ':id' => $targetUserId,
    ]);

    revoke_user_sessions($pdo, $targetUserId);

    auth_event($pdo, 'password_reset', (int)$actor['id'], (string)$actor['username'], [
        'targetUserId' => $targetUserId,
        'targetUsername' => (string)$target['username'],
    ]);

    respond_json(200, [
        'ok' => true,
        'message' => 'Password reset completed.',
        'temporaryPassword' => $newPassword,
    ]);
} catch (Throwable $exception) {
    error_log('Admin user reset password failed: ' . $exception->getMessage());
    fail_json(500, 'Could not reset password right now.');
}
