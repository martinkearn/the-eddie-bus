<?php

declare(strict_types=1);

require_once __DIR__ . '/../../bootstrap_api.php';
require_once __DIR__ . '/../../../src/email.php';

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    fail_json(405, 'Method not allowed.');
}

try {
    $pdo = db_connection();
    $user = require_admin($pdo);

    $recipientEmail = 'martinkearn@live.co.uk';
    $recipientName = trim((string)($user['display_name'] ?? $user['username'] ?? 'there'));
    $triggeredBy = trim((string)($user['username'] ?? 'admin user'));
    $environment = trim((string)(app_config()['environment'] ?? 'production'));
    $subject = 'Test ' . (string)time();

    $result = send_resend_templated_email(
        $recipientEmail,
        $subject,
        'test-email',
        [
            'subject' => $subject,
            'recipient_name' => $recipientName !== '' ? $recipientName : 'there',
            'triggered_by' => $triggeredBy,
            'environment' => $environment,
            'sent_at' => gmdate('Y-m-d H:i:s') . ' UTC',
        ]
    );

    respond_json(200, [
        'ok' => true,
        'message' => 'Test email sent to ' . $recipientEmail . '.',
        'emailId' => (string)($result['id'] ?? ''),
        'recipientEmail' => $recipientEmail,
        'subject' => $subject,
    ]);
} catch (RuntimeException $exception) {
    error_log('Admin test email failed: ' . $exception->getMessage());
    fail_json(502, $exception->getMessage());
} catch (Throwable $exception) {
    error_log('Admin test email failed: ' . $exception->getMessage());
    fail_json(500, 'Could not send test email right now.');
}
