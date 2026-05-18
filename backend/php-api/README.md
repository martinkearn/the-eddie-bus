# Booking API (PHP + MySQL)

This is a separate backend for the static Next.js site.

## Why separate?

- The frontend is statically hosted.
- Database credentials must never be exposed to the browser.
- PHP API runs on a secure server and talks to MySQL.

## Endpoints

- POST /bookings/create.php
- GET /bookings/availability.php

Availability returns JSON in this shape:

```json
{
	"startDate": "2026-05-18",
	"daysToShow": 90,
	"disablePastDates": true,
	"disableWeekdays": [0],
	"unavailableDates": ["2026-05-20"]
}
```

## Config files

Use `config.example.php` as the committed template and copy it to a private file path (outside public_html) with real values.

Optional environment variables:

- BOOKING_API_CONFIG_FILE: absolute path to a private PHP config file.
- BOOKING_API_SRC_PATH: absolute path to the src directory if not using the default location.

If DB values are not present in the private config file, the API falls back to environment variables:

- DB_HOST
- DB_PORT
- DB_NAME
- DB_USER
- DB_PASS

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
	'availability' => [
		'days_to_show' => 90,
		'disable_past_dates' => true,
		'disable_weekdays' => [0]
	]
];
```

## Setup

1. Create database tables using `sql/bookings.sql`.
2. Deploy backend/php-api/public to a public URL path, such as /public_html/api.
3. Deploy backend/php-api/src and backend/php-api/sql to a private path, such as /booking-api.
4. Add your private config file outside public_html.
5. Optionally set BOOKING_API_CONFIG_FILE and/or BOOKING_API_SRC_PATH if your paths differ from defaults.

To manually block dates, insert rows into `booking_unavailable_dates`.

## Frontend connection

Set this environment variable in the Next.js build environment:

- NEXT_PUBLIC_BOOKING_API_ENDPOINT=https://api.your-domain/bookings/create.php

The site form will POST JSON to this endpoint.
