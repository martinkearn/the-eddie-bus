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
$displayName = trim((string)($payload['displayName'] ?? $payload['display_name'] ?? ''));
$role = trim((string)($payload['role'] ?? 'viewer'));
$password = random_memorable_password();
$email = trim((string)($payload['email'] ?? ''));
$phoneNumber = trim((string)($payload['phoneNumber'] ?? $payload['phone_number'] ?? ''));

$errors = [];
if ($username === '') {
    $errors['username'] = 'Username is required.';
}
if (strlen($displayName) > 255) {
    $errors['displayName'] = 'Display name must be 255 characters or fewer.';
}
if (!in_array($role, ['admin', 'viewer'], true)) {
    $errors['role'] = 'Role is invalid.';
}
$policyError = validate_password_policy($password);
if ($policyError !== null) {
    $errors['password'] = $policyError;
}
if ($email !== '' && filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
    $errors['email'] = 'Email address is invalid.';
}
if ($phoneNumber !== '' && strlen($phoneNumber) > 32) {
    $errors['phoneNumber'] = 'Phone number must be 32 characters or fewer.';
}

if ($errors !== []) {
    fail_json(422, 'Validation failed.', $errors);
}

try {
    $pdo = db_connection();
    $actor = require_admin($pdo);

    $stmt = $pdo->prepare('INSERT INTO admin_users (username, display_name, email, phone_number, password_hash, role) VALUES (:username, :display_name, :email, :phone_number, :password_hash, :role)');
    $stmt->execute([
        ':username' => $username,
        ':display_name' => $displayName !== '' ? $displayName : null,
        ':email' => $email !== '' ? $email : null,
        ':phone_number' => $phoneNumber !== '' ? $phoneNumber : null,
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
        'temporaryPassword' => $password,
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
