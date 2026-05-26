<?php

declare(strict_types=1);

function resolve_src_path(): string
{
    $candidates = [];

    $explicitPath = getenv('BOOKING_API_SRC_PATH');
    if ($explicitPath !== false && $explicitPath !== '') {
        $candidates[] = $explicitPath;
    }

    $documentRoot = $_SERVER['DOCUMENT_ROOT'] ?? '';
    if (is_string($documentRoot) && $documentRoot !== '') {
        $candidates[] = dirname($documentRoot) . '/booking-api/src';
    }

    $candidates[] = __DIR__ . '/../src';

    foreach ($candidates as $candidate) {
        if (!is_string($candidate) || $candidate === '') {
            continue;
        }

        $resolved = realpath($candidate);
        if (is_string($resolved) && is_dir($resolved)) {
            return $resolved;
        }
    }

    throw new RuntimeException('Could not resolve API src path.');
}

$srcPath = resolve_src_path();

require_once $srcPath . '/bootstrap.php';
require_once $srcPath . '/db.php';
require_once $srcPath . '/auth.php';
