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
$displayName = trim((string)($payload['displayName'] ?? $payload['display_name'] ?? ''));
$role = trim((string)($payload['role'] ?? ''));
$email = trim((string)($payload['email'] ?? ''));
$phoneNumber = trim((string)($payload['phoneNumber'] ?? $payload['phone_number'] ?? ''));
$newPassword = (string)($payload['newPassword'] ?? '');

$errors = [];
if ($idRaw === '' || !ctype_digit($idRaw)) {
    $errors['id'] = 'Valid user id is required.';
}
if ($username === '') {
    $errors['username'] = 'Username is required.';
}
if (strlen($displayName) > 255) {
    $errors['displayName'] = 'Display name must be 255 characters or fewer.';
}
if (!in_array($role, ['admin', 'viewer'], true)) {
    $errors['role'] = 'Role is invalid.';
}
if ($email !== '' && filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
    $errors['email'] = 'Email address is invalid.';
}
if ($phoneNumber !== '' && strlen($phoneNumber) > 32) {
    $errors['phoneNumber'] = 'Phone number must be 32 characters or fewer.';
}
if ($newPassword !== '') {
    $policyError = validate_password_policy($newPassword);
    if ($policyError !== null) {
        $errors['newPassword'] = $policyError;
    }
}

if ($errors !== []) {
    fail_json(422, 'Validation failed.', $errors);
}

$targetUserId = (int)$idRaw;

try {
    $pdo = db_connection();
    $actor = require_auth($pdo);
    $actorId = (int)($actor['id'] ?? 0);
    $actorRole = (string)($actor['role'] ?? '');
    $isAdmin = $actorRole === 'admin';

    if (!$isAdmin && $actorId !== $targetUserId) {
        fail_json(403, 'You can only update your own profile.');
    }

    $existingStmt = $pdo->prepare('SELECT id, username, display_name, role FROM admin_users WHERE id = :id LIMIT 1');
    $existingStmt->execute([':id' => $targetUserId]);
    $existing = $existingStmt->fetch();
    if (!is_array($existing)) {
        fail_json(404, 'User not found.');
    }

    $passwordChangeRequested = $newPassword !== '';
    if ($passwordChangeRequested && $actorId !== $targetUserId) {
        fail_json(403, 'You can only change your own password.');
    }

    $nextUsername = $username;
    $nextDisplayName = $displayName;
    $nextRole = $role;

    if (!$isAdmin) {
        if ($nextUsername !== (string)$existing['username'] || $nextRole !== (string)$existing['role']) {
            fail_json(403, 'You can only update your own profile details.');
        }
        $nextUsername = (string)$existing['username'];
        $nextDisplayName = $displayName;
        $nextRole = (string)$existing['role'];
    } else {
        ensure_not_last_admin_change($pdo, $targetUserId, $nextRole);
    }

    $stmt = $pdo->prepare('UPDATE admin_users SET username = :username, display_name = :display_name, email = :email, phone_number = :phone_number, role = :role WHERE id = :id');
    $stmt->execute([
        ':username' => $nextUsername,
        ':display_name' => $nextDisplayName !== '' ? $nextDisplayName : null,
        ':email' => $email !== '' ? $email : null,
        ':phone_number' => $phoneNumber !== '' ? $phoneNumber : null,
        ':role' => $nextRole,
        ':id' => $targetUserId,
    ]);

    $signedOut = false;
    if ($passwordChangeRequested) {
        $newHash = password_hash_secure($newPassword);
        $passwordUpdateStmt = $pdo->prepare('UPDATE admin_users SET password_hash = :password_hash WHERE id = :id');
        $passwordUpdateStmt->execute([
            ':password_hash' => $newHash,
            ':id' => $targetUserId,
        ]);

        revoke_user_sessions($pdo, $targetUserId);
        clear_session_cookie();
        $signedOut = true;
    }

    if ($stmt->rowCount() === 0) {
        $existsStmt = $pdo->prepare('SELECT id FROM admin_users WHERE id = :id LIMIT 1');
        $existsStmt->execute([':id' => $targetUserId]);
        $existing = $existsStmt->fetch();
        if (!is_array($existing)) {
            fail_json(404, 'User not found.');
        }
    }

    auth_event($pdo, $isAdmin || $actorId !== $targetUserId ? 'user_updated' : 'profile_updated', $actorId, (string)$actor['username'], [
        'targetUserId' => $targetUserId,
        'targetUsername' => $nextUsername,
        'targetRole' => $nextRole,
        'passwordChanged' => $signedOut,
    ]);

    respond_json(200, [
        'ok' => true,
        'message' => 'User updated.',
        'signedOut' => $signedOut,
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
