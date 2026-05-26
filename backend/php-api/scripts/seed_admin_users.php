<?php

declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    fwrite(STDERR, "This script must be run via CLI.\n");
    exit(1);
}

$srcPath = realpath(__DIR__ . '/../src');
if (!is_string($srcPath)) {
    fwrite(STDERR, "Could not resolve src path.\n");
    exit(1);
}

require_once $srcPath . '/config.php';
require_once $srcPath . '/db.php';
require_once $srcPath . '/auth.php';

$adminPassword = getenv('ADMIN_INITIAL_PASSWORD') ?: '';
$viewerPassword = getenv('VIEWER_INITIAL_PASSWORD') ?: '';

if ($adminPassword === '' || $viewerPassword === '') {
    fwrite(STDERR, "Set ADMIN_INITIAL_PASSWORD and VIEWER_INITIAL_PASSWORD environment variables before running.\n");
    exit(1);
}

if (validate_password_policy($adminPassword) !== null || validate_password_policy($viewerPassword) !== null) {
    fwrite(STDERR, "Both passwords must meet policy requirements.\n");
    exit(1);
}

$pdo = db_connection();

$seed = [
    ['username' => 'admin', 'password' => $adminPassword, 'role' => 'admin'],
    ['username' => 'driver', 'password' => $viewerPassword, 'role' => 'viewer'],
];

$selectStmt = $pdo->prepare('SELECT id FROM admin_users WHERE username = :username LIMIT 1');
$insertStmt = $pdo->prepare('INSERT INTO admin_users (username, password_hash, role) VALUES (:username, :password_hash, :role)');
$updateStmt = $pdo->prepare('UPDATE admin_users SET password_hash = :password_hash, role = :role WHERE username = :username');

foreach ($seed as $user) {
    $selectStmt->execute([':username' => $user['username']]);
    $existing = $selectStmt->fetch();

    $hash = password_hash_secure($user['password']);

    if (is_array($existing)) {
        $updateStmt->execute([
            ':username' => $user['username'],
            ':password_hash' => $hash,
            ':role' => $user['role'],
        ]);
        echo 'Updated user: ' . $user['username'] . PHP_EOL;
    } else {
        $insertStmt->execute([
            ':username' => $user['username'],
            ':password_hash' => $hash,
            ':role' => $user['role'],
        ]);
        echo 'Created user: ' . $user['username'] . PHP_EOL;
    }
}

echo "Done.\n";
