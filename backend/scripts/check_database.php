<?php

declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    fwrite(STDERR, "This script must be run via CLI.\n");
    exit(2);
}

$configPath = realpath(__DIR__ . '/../config.private.php');
if (!is_string($configPath)) {
    fwrite(STDERR, "FAIL: backend/config.private.php was not found.\n");
    exit(2);
}

if (getenv('BOOKING_API_CONFIG_FILE') === false) {
    putenv('BOOKING_API_CONFIG_FILE=' . $configPath);
}

require_once __DIR__ . '/../src/db.php';

fwrite(STDOUT, "Checking database connection...\n");

try {
    $pdo = db_connection();
    $result = $pdo->query('SELECT 1')->fetchColumn();

    if ((int)$result !== 1) {
        throw new RuntimeException('The database returned an unexpected test result.');
    }

    fwrite(STDOUT, "PASS: Connected to the database and completed a test query.\n");
    exit(0);
} catch (PDOException $exception) {
    $driverCode = (int)($exception->errorInfo[1] ?? 0);
    $message = strtolower($exception->getMessage());

    if ($driverCode === 1045 || str_contains($message, 'access denied')) {
        fwrite(STDERR, "FAIL: The database rejected the configured username or password.\n");
    } elseif ($driverCode === 1049 || str_contains($message, 'unknown database')) {
        fwrite(STDERR, "FAIL: The configured database does not exist or is not accessible.\n");
    } elseif (str_contains($message, 'timed out') || str_contains($message, 'operation timed out')) {
        fwrite(STDERR, "FAIL: The database connection timed out. Check the database IP allow-list or firewall.\n");
    } elseif (str_contains($message, 'getaddrinfo') || str_contains($message, 'name or service not known')) {
        fwrite(STDERR, "FAIL: The configured database hostname could not be resolved.\n");
    } else {
        fwrite(STDERR, "FAIL: The database connection could not be established (PDO error {$exception->getCode()}).\n");
    }

    exit(1);
} catch (Throwable $exception) {
    fwrite(STDERR, 'FAIL: ' . $exception->getMessage() . "\n");
    exit(1);
}