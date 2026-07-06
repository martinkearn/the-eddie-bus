<?php

declare(strict_types=1);

function load_private_config_file(): array
{
    $explicitPath = env_value('BOOKING_API_CONFIG_FILE');
    $documentRoot = $_SERVER['DOCUMENT_ROOT'] ?? '';
    $defaultPath = $documentRoot !== ''
        ? dirname($documentRoot) . '/booking-api-config.php'
        : '';

    $candidatePaths = array_values(array_filter([
        $explicitPath,
        $defaultPath,
    ]));

    foreach ($candidatePaths as $path) {
        if (!is_string($path) || $path === '' || !is_file($path)) {
            continue;
        }

        $loaded = require $path;
        if (is_array($loaded)) {
            return $loaded;
        }
    }

    return [];
}

function env_value(string $key, ?string $default = null): ?string
{
    $value = getenv($key);

    if ($value === false || $value === '') {
        return $default;
    }

    return $value;
}

function required_env_value(string $key): string
{
    $value = env_value($key);

    if ($value === null) {
        throw new RuntimeException('Missing required environment variable: ' . $key);
    }

    return $value;
}

function app_config(): array
{
    $privateConfig = load_private_config_file();

    $allowedOriginsRaw = env_value('APP_ALLOWED_ORIGINS', '');
    if (isset($privateConfig['allowed_origins']) && is_array($privateConfig['allowed_origins'])) {
        $allowedOrigins = array_values(array_filter(array_map('strval', $privateConfig['allowed_origins'])));
    } else {
        $allowedOrigins = array_values(array_filter(array_map('trim', explode(',', $allowedOriginsRaw))));
    }

    $privateDb = isset($privateConfig['db']) && is_array($privateConfig['db']) ? $privateConfig['db'] : [];
    $privateResend = isset($privateConfig['resend']) && is_array($privateConfig['resend']) ? $privateConfig['resend'] : [];

    return [
        'environment' => (string)($privateConfig['environment'] ?? env_value('APP_ENV', 'production')),
        'allowed_origins' => $allowedOrigins,
        'admin' => [
            'session_cookie_name' => (string)($privateConfig['admin']['session_cookie_name'] ?? env_value('ADMIN_SESSION_COOKIE_NAME', 'eddie_admin_session')),
            'session_cookie_lifetime_seconds' => (int)($privateConfig['admin']['session_cookie_lifetime_seconds'] ?? env_value('ADMIN_SESSION_COOKIE_LIFETIME_SECONDS', '315360000')),
            'session_cookie_samesite' => (string)($privateConfig['admin']['session_cookie_samesite'] ?? env_value('ADMIN_SESSION_COOKIE_SAMESITE', 'Lax')),
        ],
        'db' => [
            'host' => (string)($privateDb['host'] ?? required_env_value('DB_HOST')),
            'port' => (string)($privateDb['port'] ?? env_value('DB_PORT', '3306')),
            'name' => (string)($privateDb['name'] ?? required_env_value('DB_NAME')),
            'user' => (string)($privateDb['user'] ?? required_env_value('DB_USER')),
            'pass' => (string)($privateDb['pass'] ?? required_env_value('DB_PASS')),
        ],
        'resend' => [
            'api_key' => (string)($privateResend['api_key'] ?? ''),
            'from_email' => (string)($privateResend['from_email'] ?? 'onboarding@resend.dev'),
            'from_name' => (string)($privateResend['from_name'] ?? 'The EDDIE Bus'),
        ],
    ];
}
