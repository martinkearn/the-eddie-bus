# the-eddie-bus

A static Next.js site for "The Eddie Bus" charity.

## Quick Start

Install dependencies:

```bash
npm install
```

Run the local dev server:

```bash
npm run dev
```

Build the static export:

```bash
npm run build
```

## Notes

- The site uses Next.js static export, so the build output is safe to host on a file-based web server.
- Interactive features should be added as client-side React components.
- Deployment mirrors the generated `out/` directory to the FTP host and also uploads the PHP API public/runtime files.

## Booking API Integration

- Booking form submissions can be posted to a separate PHP API.
- Configure this build-time variable before running `npm run build`:
	- `NEXT_PUBLIC_BOOKING_API_ENDPOINT=https://your-api-domain/bookings/create.php`
- If this variable is not set, the form falls back to the existing mailto flow.
- PHP API implementation and SQL schema are in `backend/php-api/`.

## Admin Portal

- Admin UI route: `/admin/`
- By default, admin API endpoints are derived from `NEXT_PUBLIC_BOOKING_API_ENDPOINT`.
- Optional override variable:
	- `NEXT_PUBLIC_ADMIN_API_BASE=https://your-api-domain/admin`
- The GitHub Actions deploy workflow also mirrors `backend/php-api/public` to `/public_html/api` and `backend/php-api/src` plus `backend/php-api/sql` to the private API path used at runtime.
