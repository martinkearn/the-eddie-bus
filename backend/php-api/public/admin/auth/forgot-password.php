<?php

declare(strict_types=1);

require_once __DIR__ . '/../../bootstrap_api.php';

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    fail_json(405, 'Method not allowed.');
}

respond_json(200, [
    'ok' => true,
    'message' => 'Please email bookings@theeddiebus.org.uk to request a password reset.',
]);
