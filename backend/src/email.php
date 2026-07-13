<?php

declare(strict_types=1);

require_once __DIR__ . '/config.php';

class ResendEmailException extends RuntimeException
{
    private int $httpStatus;
    private array $responseData;

    public function __construct(string $message, int $httpStatus = 0, array $responseData = [])
    {
        parent::__construct($message);
        $this->httpStatus = $httpStatus;
        $this->responseData = $responseData;
    }

    public function http_status(): int
    {
        return $this->httpStatus;
    }

    public function response_data(): array
    {
        return $this->responseData;
    }
}

function default_email_cc_recipients(): array
{
    return ['bookings@theeddiebus.org.uk'];
}

function normalize_email_recipients(mixed $value): array
{
    $rawValues = [];

    if (is_string($value)) {
        $rawValues = [$value];
    } elseif (is_array($value)) {
        $rawValues = $value;
    }

    $normalized = [];
    foreach ($rawValues as $item) {
        $email = strtolower(trim((string)$item));
        if ($email === '' || filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
            continue;
        }

        if (!in_array($email, $normalized, true)) {
            $normalized[] = $email;
        }
    }

    return $normalized;
}

function add_default_cc_to_payload(array $payload): array
{
    $existingCc = normalize_email_recipients($payload['cc'] ?? []);
    $defaultCc = normalize_email_recipients(default_email_cc_recipients());

    $payload['cc'] = array_values(array_unique(array_merge($existingCc, $defaultCc)));
    return $payload;
}

function resend_mail_config(): array
{
    $config = app_config();
    $resend = isset($config['resend']) && is_array($config['resend']) ? $config['resend'] : [];

    $apiKey = trim((string)($resend['api_key'] ?? ''));
    if ($apiKey === '') {
        throw new RuntimeException('Missing resend.api_key in private API config.');
    }

    $fromEmail = trim((string)($resend['from_email'] ?? ''));
    if ($fromEmail === '' || filter_var($fromEmail, FILTER_VALIDATE_EMAIL) === false) {
        throw new RuntimeException('Missing or invalid resend.from_email in private API config.');
    }

    $fromName = trim((string)($resend['from_name'] ?? ''));
    if ($fromName === '') {
        $fromName = 'The EDDIE Bus';
    }

    return [
        'api_key' => $apiKey,
        'from_email' => $fromEmail,
        'from_name' => $fromName,
    ];
}

function email_template_file_path(string $templateName): string
{
    $normalizedName = trim($templateName);
    if (preg_match('/^[a-z0-9_-]+$/', $normalizedName) !== 1) {
        throw new RuntimeException('Email template name is invalid.');
    }

    $path = __DIR__ . '/../templates/emails/' . $normalizedName . '.html';
    if (!is_file($path)) {
        throw new RuntimeException('Email template file not found: ' . $normalizedName);
    }

    return $path;
}

function html_escape(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function render_email_html_template(string $templateName, array $templateData): string
{
    $templatePath = email_template_file_path($templateName);
    $templateHtml = file_get_contents($templatePath);

    if (!is_string($templateHtml) || $templateHtml === '') {
        throw new RuntimeException('Could not read email template: ' . $templateName);
    }

    $replacements = [];
    foreach ($templateData as $key => $value) {
        $token = '{{' . trim((string)$key) . '}}';
        $replacements[$token] = html_escape((string)$value);
    }

    return strtr($templateHtml, $replacements);
}

function html_to_plain_text(string $html): string
{
    $normalized = preg_replace('/<\s*br\s*\/?>/i', "\n", $html);
    $text = strip_tags((string)$normalized);
    $text = html_entity_decode($text, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    $text = preg_replace("/\n{3,}/", "\n\n", $text);
    return trim((string)$text);
}

function resend_send_email(array $payload, string $apiKey, bool $addDefaultCc = true): array
{
    if ($addDefaultCc) {
        $payload = add_default_cc_to_payload($payload);
    }

    $jsonBody = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if (!is_string($jsonBody) || $jsonBody === '') {
        throw new RuntimeException('Could not encode Resend email payload.');
    }

    $httpStatus = 0;
    $responseBody = '';

    if (function_exists('curl_init')) {
        $curl = curl_init('https://api.resend.com/emails');
        if ($curl === false) {
            throw new ResendEmailException('Could not initialize cURL for Resend request.');
        }

        curl_setopt_array($curl, [
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'Authorization: Bearer ' . $apiKey,
            ],
            CURLOPT_POSTFIELDS => $jsonBody,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 15,
        ]);

        $curlResult = curl_exec($curl);
        if ($curlResult === false) {
            $curlError = curl_error($curl);
            $curlErrno = curl_errno($curl);
            curl_close($curl);

            $message = 'Resend request failed before receiving a response via cURL.';
            if ($curlError !== '') {
                $message .= ' cURL error ' . $curlErrno . ': ' . $curlError;
            }

            throw new ResendEmailException($message);
        }

        $httpStatus = (int)curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
        $responseBody = (string)$curlResult;
        curl_close($curl);
    } else {
        $httpContext = stream_context_create([
            'http' => [
                'method' => 'POST',
                'header' => implode("\r\n", [
                    'Content-Type: application/json',
                    'Authorization: Bearer ' . $apiKey,
                ]),
                'content' => $jsonBody,
                'timeout' => 15,
                'ignore_errors' => true,
            ],
        ]);

        $streamResult = file_get_contents('https://api.resend.com/emails', false, $httpContext);
        if ($streamResult === false) {
            $lastError = error_get_last();
            $lastErrorMessage = '';
            if (is_array($lastError) && isset($lastError['message'])) {
                $lastErrorMessage = trim((string)$lastError['message']);
            }

            $message = 'Resend request failed before receiving a response via stream transport.';
            if ($lastErrorMessage !== '') {
                $message .= ' ' . $lastErrorMessage;
            }

            throw new ResendEmailException($message);
        }

        $responseBody = (string)$streamResult;

        $responseHeaders = $http_response_header ?? [];
        foreach ($responseHeaders as $headerLine) {
            if (preg_match('#^HTTP/\S+\s+(\d{3})#', (string)$headerLine, $matches) === 1) {
                $httpStatus = (int)$matches[1];
            }
        }
    }

    $responseData = json_decode($responseBody, true);
    if (!is_array($responseData)) {
        throw new ResendEmailException('Resend returned an invalid JSON response.', $httpStatus);
    }

    if ($httpStatus < 200 || $httpStatus >= 300) {
        $errorType = trim((string)($responseData['name'] ?? ''));
        $apiMessage = trim((string)($responseData['message'] ?? ''));

        $parts = [];
        $parts[] = 'Resend rejected the email request';
        if ($httpStatus > 0) {
            $parts[] = '(HTTP ' . $httpStatus . ')';
        }
        if ($errorType !== '') {
            $parts[] = '- ' . $errorType;
        }
        if ($apiMessage !== '') {
            $parts[] = ': ' . $apiMessage;
        }

        throw new ResendEmailException(implode(' ', $parts), $httpStatus, $responseData);
    }

    return $responseData;
}

function send_resend_templated_email(
    string $toEmail,
    string $subject,
    string $templateName,
    array $templateData = [],
    bool $addDefaultCc = true
): array {
    $to = trim($toEmail);
    if ($to === '' || filter_var($to, FILTER_VALIDATE_EMAIL) === false) {
        throw new RuntimeException('Recipient email is missing or invalid.');
    }

    $subjectLine = trim($subject);
    if ($subjectLine === '') {
        throw new RuntimeException('Email subject is required.');
    }

    $mailConfig = resend_mail_config();
    $html = render_email_html_template($templateName, $templateData);
    $text = html_to_plain_text($html);

    $payload = [
        'from' => sprintf('%s <%s>', $mailConfig['from_name'], $mailConfig['from_email']),
        'to' => [$to],
        'subject' => $subjectLine,
        'html' => $html,
        'text' => $text,
    ];

    return resend_send_email($payload, $mailConfig['api_key'], $addDefaultCc);
}

function send_resend_templated_email_to_recipients(
    array $toEmails,
    string $subject,
    string $templateName,
    array $templateData = [],
    bool $addDefaultCc = true
): array {
    $normalizedRecipients = normalize_email_recipients($toEmails);
    if ($normalizedRecipients === []) {
        throw new RuntimeException('At least one valid recipient email is required.');
    }

    $subjectLine = trim($subject);
    if ($subjectLine === '') {
        throw new RuntimeException('Email subject is required.');
    }

    $mailConfig = resend_mail_config();
    $html = render_email_html_template($templateName, $templateData);
    $text = html_to_plain_text($html);

    $payload = [
        'from' => sprintf('%s <%s>', $mailConfig['from_name'], $mailConfig['from_email']),
        'to' => $normalizedRecipients,
        'subject' => $subjectLine,
        'html' => $html,
        'text' => $text,
    ];

    return resend_send_email($payload, $mailConfig['api_key'], $addDefaultCc);
}
