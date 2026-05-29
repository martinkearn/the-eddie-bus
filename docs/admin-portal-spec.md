# Admin Portal Specification (Agreed Scope)

Date captured: 26 May 2026

This document records the agreed requirements for the bookings admin portal before implementation.

## Security and deployment constraints

- Admin UI route is `/admin` on the same site domain.
- Admin/auth endpoints stay under the existing PHP API path.
- Frontend remains static-export Next.js.
- Authentication is server-side session based.
- Passwords are stored as secure hashes only (never plain text).
- Initial passwords and any reset passwords must never be committed to git.

## Roles and permissions

- Roles: `admin` and `viewer` only.
- `admin` can:
  - View all bookings
  - Edit all booking fields
  - Permanently delete bookings
  - Fully manage users (create, edit, role changes, username changes, password reset, delete)
- `viewer` can:
  - View all booking data including full booking details
  - Search bookings
  - Not edit or delete bookings
  - Not manage users

## Auth and session behavior

- Login identifier: `username`.
- No idle timeout policy for admin sessions.
- Sessions end on:
  - Manual logout
  - Password change
  - User deactivation/removal event that invalidates access
- Forgot password flow (v1):
  - No email automation yet
  - UI instructs users to manually email `bookings@theeddiebus.org.uk`
  - Admins can reset passwords on behalf of users from admin UI

## Password policy

- Minimum length: 8 characters.
- No additional complexity rules in v1.
- No lockout policy in v1.

## Booking management functionality

- Default list view: all bookings.
- Default sort: newest booking date first.
- Status values include: `pending`, `confirmed`, `journey_completed`, `customer_billed`, `booking_completed`, `cancelled_by_customer`, `cancelled_by_us`.
- Search model:
  - Primary interaction is global search (not a heavy filter UI)
  - Partial/fuzzy matching
  - Search applies across all booking fields
- Table behavior:
  - Responsive layout required
  - Priority column order:
    1. `booking_ref`
    2. `booking_date`
    3. `status`
    4. `organisation`
    5. `destination_name`
  - Pagination style: `Load more` button
- Edit/delete behavior:
  - All booking fields are editable by admins
  - Delete is permanent hard delete
  - Delete confirmation uses a simple confirmation dialog
  - After delete: show success banner and remove item from list immediately
- Bulk actions: not required in v1.
- Export: not required in v1.

## User management functionality

- Managed inside the admin portal.
- In v1, admin can change everything about other users.
- No active/inactive management UI requirement was requested; deleting users is required.
- Last-admin safety rules required:
  - Prevent deleting the last remaining admin
  - Prevent demoting the last remaining admin
  - Prevent deactivating the last remaining admin (if deactivation is implemented)

## Logging (minimal recommended scope)

Record only minimal recommended security events in v1:

- Login success/failure
- Password reset actions
- User role/status changes

No broad operational logging requirement beyond the above for this phase.

## Initial account provisioning (secrets handling)

- Initial users are planned as `admin` and `driver`.
- Initial passwords must be provisioned outside git (private deployment config, private CLI seed script input, or direct DB admin process).
- Do not place any real passwords in repo files, docs, commits, or CI logs.

## Mobile and UX expectations

- Admin portal should be usable on mobile.
- No dashboard metrics required in v1.
