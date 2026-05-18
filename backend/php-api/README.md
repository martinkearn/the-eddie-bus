# Booking API (PHP + MySQL)

This is a separate backend for the static Next.js site.

## Why separate?

- The frontend is statically hosted.
- Database credentials must never be exposed to the browser.
- PHP API runs on a secure server and talks to MySQL.

## Endpoint

- POST /bookings/create.php

## Environment variables

Copy .env.example into your server environment and set real values.

Required values:

- DB_HOST
- DB_PORT
- DB_NAME
- DB_USER
- DB_PASS

Security values:

- APP_ALLOWED_ORIGINS: comma-separated origins allowed to call the API.

Optional values:

- BOOKING_API_CONFIG_FILE: absolute path to a private PHP config file.
- BOOKING_API_SRC_PATH: absolute path to the src directory if not using the default location.

## Krystal hosting recommendation

For shared hosting, using a private config file outside public_html is a good pattern.

Default lookup path used by this API:

- /home/your-account/booking-api-config.php (resolved as one level above DOCUMENT_ROOT)

Example private config file:

```php
<?php

return [
	'environment' => 'production',
	'allowed_origins' => [
		'https://www.theeddiebus.org.uk',
		'https://theeddiebus.org.uk',
	],
	'db' => [
		'host' => 'localhost',
		'port' => '3306',
		'name' => 'eddie_bus',
		'user' => 'eddie_bus_app',
		'pass' => 'replace-with-real-password',
	],
];
```

## Setup

1. Create database table using sql/bookings.sql.
2. Deploy backend/php-api/public to a public URL path, such as /public_html/api.
3. Deploy backend/php-api/src and backend/php-api/sql to a private path, such as /booking-api.
4. Add your private config file outside public_html.
5. Optionally set BOOKING_API_SRC_PATH if your private src directory differs from /booking-api/src.

## Frontend connection

Set this environment variable in the Next.js build environment:

- NEXT_PUBLIC_BOOKING_API_ENDPOINT=https://api.your-domain/bookings/create.php

The site form will POST JSON to this endpoint.
