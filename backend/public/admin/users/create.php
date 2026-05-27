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

$username = trim((string)($payload['username'] ?? ''));
$role = trim((string)($payload['role'] ?? 'viewer'));
$password = (string)($payload['password'] ?? '');

$errors = [];
if ($username === '') {
    $errors['username'] = 'Username is required.';
}
if (!in_array($role, ['admin', 'viewer'], true)) {
    $errors['role'] = 'Role is invalid.';
}
$policyError = validate_password_policy($password);
if ($policyError !== null) {
    $errors['password'] = $policyError;
}

if ($errors !== []) {
    fail_json(422, 'Validation failed.', $errors);
}

try {
    $pdo = db_connection();
    $actor = require_admin($pdo);

    $stmt = $pdo->prepare('INSERT INTO admin_users (username, password_hash, role) VALUES (:username, :password_hash, :role)');
    $stmt->execute([
        ':username' => $username,
        ':password_hash' => password_hash_secure($password),
        ':role' => $role,
    ]);

    $newUserId = (int)$pdo->lastInsertId();
    auth_event($pdo, 'user_created', (int)$actor['id'], (string)$actor['username'], [
        'targetUserId' => $newUserId,
        'targetUsername' => $username,
        'targetRole' => $role,
    ]);

    respond_json(201, [
        'ok' => true,
        'message' => 'User created.',
        'userId' => $newUserId,
    ]);
} catch (PDOException $pdoException) {
    $sqlState = $pdoException->errorInfo[0] ?? '';
    if ($sqlState === '23000') {
        fail_json(422, 'Username already exists.');
    }

    error_log('Admin user create failed: ' . $pdoException->getMessage());
    fail_json(500, 'Could not create user right now.');
} catch (Throwable $exception) {
    error_log('Admin user create failed: ' . $exception->getMessage());
    fail_json(500, 'Could not create user right now.');
}
