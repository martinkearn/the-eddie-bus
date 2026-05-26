import Link from 'next/link'

export const metadata = {
  title: 'Forgot Password | Admin Portal | The EDDIE Bus',
  description: 'How admin portal users can request a password reset.',
}

export default function AdminForgotPasswordPage() {
  return (
    <main className="admin-shell">
      <section className="admin-auth-card">
        <h1>Forgot your password?</h1>
        <p>
          Please email bookings@theeddiebus.org.uk and request a password reset.
        </p>
        <p>
          Include your username and a short note so an administrator can verify and reset your account.
        </p>
        <div className="admin-inline-actions">
          <a className="button button-primary" href="mailto:bookings@theeddiebus.org.uk">Email bookings@theeddiebus.org.uk</a>
          <Link className="button button-quiet" href="/admin/">Back to admin login</Link>
        </div>
      </section>
    </main>
  )
}
