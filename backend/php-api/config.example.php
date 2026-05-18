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
    'availability' => [
        'days_to_show' => 90,
        'disable_past_dates' => true,
        'disable_weekdays' => [0],
    ],
];
