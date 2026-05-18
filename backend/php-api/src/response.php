<?php

declare(strict_types=1);

function respond_json(int $statusCode, array $payload): void
{
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');

    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function fail_json(int $statusCode, string $message, array $details = []): void
{
    respond_json($statusCode, [
        'ok' => false,
        'message' => $message,
        'details' => $details,
    ]);
}
