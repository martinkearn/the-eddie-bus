import { AdminPortal } from '../../src/components/admin/AdminPortal'

export const metadata = {
  title: 'Admin Portal | The EDDIE Bus',
  description: 'Secure admin portal for managing bookings and user accounts.',
}

export default function AdminPage() {
  return (
    <AdminPortal
      bookingApiEndpoint={process.env.NEXT_PUBLIC_BOOKING_API_ENDPOINT || ''}
      adminApiBase={process.env.NEXT_PUBLIC_ADMIN_API_BASE || ''}
    />
  )
}
