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
$password = (string)($payload['password'] ?? '');

if ($username === '' || $password === '') {
    fail_json(422, 'Username and password are required.');
}

try {
    $pdo = db_connection();

    $stmt = $pdo->prepare('SELECT id, username, display_name, email, phone_number, role, password_hash FROM admin_users WHERE username = :username LIMIT 1');
    $stmt->execute([':username' => $username]);
    $user = $stmt->fetch();

    if (!is_array($user) || !password_verify_secure($password, (string)$user['password_hash'])) {
        auth_event($pdo, 'login_failed', null, $username, ['reason' => 'invalid_credentials']);
        fail_json(401, 'Invalid username or password.');
    }

    $userId = (int)$user['id'];
    $token = issue_session($pdo, $userId);
    set_session_cookie($token);

    $updateStmt = $pdo->prepare('UPDATE admin_users SET last_login_at = NOW() WHERE id = :id');
    $updateStmt->execute([':id' => $userId]);

    auth_event($pdo, 'login_success', $userId, (string)$user['username']);

    respond_json(200, [
        'ok' => true,
        'sessionToken' => $token,
        'user' => [
            'id' => $userId,
            'username' => (string)$user['username'],
            'displayName' => $user['display_name'] !== null ? (string)$user['display_name'] : null,
            'email' => $user['email'] !== null ? (string)$user['email'] : null,
            'phoneNumber' => $user['phone_number'] !== null ? (string)$user['phone_number'] : null,
            'role' => (string)$user['role'],
        ],
    ]);
} catch (Throwable $exception) {
    error_log('Admin login failed: ' . $exception->getMessage());
    fail_json(500, 'Could not complete login right now.');
}
