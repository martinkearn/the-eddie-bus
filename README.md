# the-eddie-bus

A static Next.js site for "The Eddie Bus" charity.

## Repository structure

- [app](app): Next.js App Router routes and layouts.
	- This is a Next.js convention. Files like [app/layout.js](app/layout.js) and [app/page.js](app/page.js) are framework entry points.
- [src](src): Shared frontend code used by route files.
	- This is a common project convention (not required by Next.js) used here for reusable UI and content modules like [src/components](src/components) and [src/content](src/content).
- [backend](backend): Separate PHP API and SQL assets for booking/admin features.
	- This is a repository convention, not a Next.js folder. In this project, the PHP API lives directly in [backend](backend).

In short: [app](app) is framework-conventional for Next.js, while [src](src) and [backend](backend) are organizational conventions chosen for this repo.

## Quick Start

Install dependencies:

```bash
npm install
```

Run the local dev server:

```bash
npm run dev
```

This starts both:
- Next.js on `http://localhost:3000`
- PHP API on `http://127.0.0.1:8080`

For local API access to booking availability, ensure `backend/config.private.php` contains working DB settings. This file is not in source control so will need to be created locally based on `config.example.php`.

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
- In almost all deployments (including same-host setups), you only need this build-time variable before running `npm run build`:
	- `NEXT_PUBLIC_BOOKING_API_ENDPOINT=https://your-api-domain/bookings/create.php`
- Availability is derived automatically from that value (for example `.../bookings/availability.php`).
- Optional override (only needed for unusual routing/proxy setups):
	- `NEXT_PUBLIC_BOOKING_AVAILABILITY_ENDPOINT=https://your-api-domain/bookings/availability.php`
- If this variable is not set, the form falls back to the existing mailto flow.
- PHP API implementation and SQL schema are in `backend/`.
- Copy `.env.example` to `.env.local` for local frontend variable setup.

## Admin Portal

- Admin UI route: `/admin/`
- By default, admin API endpoints are derived from `NEXT_PUBLIC_BOOKING_API_ENDPOINT`.
- Optional override variable:
	- `NEXT_PUBLIC_ADMIN_API_BASE=https://your-api-domain/admin`
- The GitHub Actions deploy workflow also mirrors `backend/public` to `/public_html/api` and `backend/src` plus `backend/sql` to the private API path used at runtime.
