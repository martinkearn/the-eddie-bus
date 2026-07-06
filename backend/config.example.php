<?php

return [
    'environment' => 'production',
    'allowed_origins' => [
        'https://www.theeddiebus.org.uk',
        'https://theeddiebus.org.uk',
        'http://localhost:3000',
    ],
    'db' => [
        'host' => 'YOUR_KRYSTAL_DB_HOST',
        'port' => '3306',
        'name' => 'YOUR_DB_NAME',
        'user' => 'YOUR_DB_USER',
        'pass' => 'YOUR_DB_PASSWORD',
    ],
    'admin' => [
        'session_cookie_name' => 'eddie_admin_session',
        'session_cookie_lifetime_seconds' => 315360000,
        'session_cookie_samesite' => 'Lax',
    ],
    'resend' => [
        'api_key' => 're_xxxxxxxxxxxxxxxxxxxxxxxxx',
        'from_email' => 'bookings@your-domain.example',
        'from_name' => 'The EDDIE Bus',
    ],
];
