import { AdminPortal } from '../../src/components/admin/AdminPortal'

export const metadata = {
  title: 'Admin Portal | The EDDIE Bus',
  description: 'Secure admin portal for managing bookings and user accounts.',
}

export default function AdminPage({ searchParams }) {
  const rawBookingReference = searchParams?.bookingRef ?? searchParams?.bookingReference ?? searchParams?.ref ?? ''
  const bookingReference = Array.isArray(rawBookingReference)
    ? String(rawBookingReference[0] || '').trim()
    : String(rawBookingReference || '').trim()

  return (
    <AdminPortal
      bookingApiEndpoint={process.env.NEXT_PUBLIC_BOOKING_API_ENDPOINT || ''}
      adminApiBase={process.env.NEXT_PUBLIC_ADMIN_API_BASE || ''}
      initialBookingReference={bookingReference}
    />
  )
}
