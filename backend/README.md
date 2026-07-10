# Booking API (PHP + MySQL)

This is a separate backend for the static Next.js site.

## Why separate?

- The frontend is statically hosted.
- Database credentials must never be exposed to the browser.
- PHP API runs on a secure server and talks to MySQL.

## Endpoints

- POST /bookings/create.php
- GET /bookings/availability.php
- POST /admin/auth/login.php
- POST /admin/auth/logout.php
- GET /admin/auth/me.php
- POST /admin/auth/forgot-password.php
- POST /admin/auth/change-password.php
- GET /admin/bookings/list.php
- GET /admin/bookings/get.php
- POST /admin/bookings/update.php
- POST /admin/bookings/delete.php
- GET /admin/users/list.php
- GET /admin/users/options.php
- POST /admin/users/create.php
- POST /admin/users/update.php
- POST /admin/users/reset-password.php
- POST /admin/users/delete.php

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
	'resend' => [
		'api_key' => 're_replace_with_real_key',
		'from_email' => 'bookings@your-domain.example',
		'from_name' => 'The EDDIE Bus',
	],
	'availability' => [
		'days_to_show' => 90,
		'disable_past_dates' => true,
		'disable_weekdays' => [0]
	]
];
```

## Email delivery (Resend)

- Resend config lives in the private config file under `resend`.
- HTML email templates are source-controlled in:
  - `backend/templates/emails/`
- All outgoing emails are automatically CC'd to:
  - `bookings@theeddiebus.org.uk`
- Booking form submissions now trigger an automatic acknowledgement email to the booking contact:
  - endpoint: `POST /bookings/create.php`
  - template: `backend/templates/emails/booking-acknowledgement.html`
  - status in that email is stage 1 (`Pending`) and explicitly states the booking is not fully confirmed until a driver is matched.
- Booking updates now trigger an automatic confirmation email to the booking contact when status moves to stage 2 (`confirmed`):
  - endpoint: `POST /admin/bookings/update.php`
  - template: `backend/templates/emails/booking-confirmed.html`
  - this sends only on transition into `confirmed` (not on unrelated edits while already confirmed).
- Booking updates now also trigger an automatic driver email when the assigned driver changes to a user:
  - endpoint: `POST /admin/bookings/update.php`
  - template: `backend/templates/emails/booking-driver-confirmed.html`
  - recipient: the newly assigned driver's `admin_users.email`
  - this sends on driver assignment/change during save.

## Setup

1. Create database tables using `sql/bookings.sql`.
2. Apply admin schema updates using `sql/admin_portal.sql`.
2. Deploy backend/public to a public URL path, such as /public_html/api.
3. Deploy backend/src, backend/sql, and backend/templates to a private path, such as /booking-api.
4. Add your private config file outside public_html.
5. Optionally set BOOKING_API_CONFIG_FILE and/or BOOKING_API_SRC_PATH if your paths differ from defaults.

## Initial admin users (no passwords in git)

Use the seed script in a trusted shell session, with passwords provided only as environment variables:

```bash
ADMIN_INITIAL_PASSWORD='set-admin-password' VIEWER_INITIAL_PASSWORD='set-viewer-password' php backend/scripts/seed_admin_users.php
```

The script creates or updates:

- `admin` (role `admin`)
- `driver` (role `viewer`)

Do not commit plaintext passwords in files, docs, commits, or CI logs.

## Admin behavior

- Session auth is cookie-based (`HttpOnly`, `Secure` when on HTTPS).
- Session CORS requires allowed origin match from config.
- Booking status supports: `pending`, `confirmed`, `journey_completed`, `customer_billed`, `booking_completed`, `cancelled_by_customer`, `cancelled_by_us`.
- Bookings can optionally be assigned to a system user via the admin-only `driver` field.
- Forgot password endpoint returns manual support instructions for `bookings@theeddiebus.org.uk`.

To manually block dates, insert rows into `booking_unavailable_dates`.

## Booking Reference Format

Each booking now stores a human-readable unique reference in `bookings.booking_ref`.

Format:

- `DDMMYY-HHMM-org-destination`
- Example: `280626-0930-eddie-bus-wigan-hosp`
- Spaces and punctuation are stripped from `org` and `destination`, so segments contain only letters and numbers.
- If the same base reference is submitted more than once, the API appends a numeric suffix such as `-2`, `-3`, etc.

For existing databases created before this change, run:

```sql
ALTER TABLE bookings ADD COLUMN booking_ref VARCHAR(128) NULL AFTER id;
UPDATE bookings SET booking_ref = CONCAT(
	DATE_FORMAT(booking_date, '%d%m%y'), '-', DATE_FORMAT(pickup_time, '%H%i'), '-', id
) WHERE booking_ref IS NULL;
ALTER TABLE bookings MODIFY booking_ref VARCHAR(128) NOT NULL;
ALTER TABLE bookings ADD UNIQUE KEY uq_bookings_booking_ref (booking_ref);
```

## Frontend connection

Set this environment variable in the Next.js build environment:

- NEXT_PUBLIC_BOOKING_API_ENDPOINT=https://api.your-domain/bookings/create.php

The site form will POST JSON to this endpoint.
