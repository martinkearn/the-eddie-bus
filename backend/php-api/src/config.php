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

    return [
        'environment' => (string)($privateConfig['environment'] ?? env_value('APP_ENV', 'production')),
        'allowed_origins' => $allowedOrigins,
        'db' => [
            'host' => (string)($privateDb['host'] ?? required_env_value('DB_HOST')),
            'port' => (string)($privateDb['port'] ?? env_value('DB_PORT', '3306')),
            'name' => (string)($privateDb['name'] ?? required_env_value('DB_NAME')),
            'user' => (string)($privateDb['user'] ?? required_env_value('DB_USER')),
            'pass' => (string)($privateDb['pass'] ?? required_env_value('DB_PASS')),
        ],
    ];
}
