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
$username = trim((string)($payload['username'] ?? ''));
$role = trim((string)($payload['role'] ?? ''));

$errors = [];
if ($idRaw === '' || !ctype_digit($idRaw)) {
    $errors['id'] = 'Valid user id is required.';
}
if ($username === '') {
    $errors['username'] = 'Username is required.';
}
if (!in_array($role, ['admin', 'viewer'], true)) {
    $errors['role'] = 'Role is invalid.';
}

if ($errors !== []) {
    fail_json(422, 'Validation failed.', $errors);
}

$targetUserId = (int)$idRaw;

try {
    $pdo = db_connection();
    $actor = require_admin($pdo);

    ensure_not_last_admin_change($pdo, $targetUserId, $role);

    $stmt = $pdo->prepare('UPDATE admin_users SET username = :username, role = :role WHERE id = :id');
    $stmt->execute([
        ':username' => $username,
        ':role' => $role,
        ':id' => $targetUserId,
    ]);

    if ($stmt->rowCount() === 0) {
        $existsStmt = $pdo->prepare('SELECT id FROM admin_users WHERE id = :id LIMIT 1');
        $existsStmt->execute([':id' => $targetUserId]);
        $existing = $existsStmt->fetch();
        if (!is_array($existing)) {
            fail_json(404, 'User not found.');
        }
    }

    auth_event($pdo, 'user_updated', (int)$actor['id'], (string)$actor['username'], [
        'targetUserId' => $targetUserId,
        'targetUsername' => $username,
        'targetRole' => $role,
    ]);

    respond_json(200, [
        'ok' => true,
        'message' => 'User updated.',
    ]);
} catch (PDOException $pdoException) {
    $sqlState = $pdoException->errorInfo[0] ?? '';
    if ($sqlState === '23000') {
        fail_json(422, 'Username already exists.');
    }

    error_log('Admin user update failed: ' . $pdoException->getMessage());
    fail_json(500, 'Could not update user right now.');
} catch (Throwable $exception) {
    error_log('Admin user update failed: ' . $exception->getMessage());
    fail_json(500, 'Could not update user right now.');
}
