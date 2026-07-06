'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { site } from '../content/site'

const BOOKING_ACKNOWLEDGEMENT_STORAGE_KEY = 'eddie_booking_acknowledgement'

function formatSubmittedAt(value) {
  if (!value) return ''
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return ''
  }
  return parsed.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function BookingAcknowledgementPanel() {
  const [details, setDetails] = useState(null)
  const [bookingRefFromQuery, setBookingRefFromQuery] = useState('')

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    try {
      const queryParams = new URLSearchParams(window.location.search)
      setBookingRefFromQuery(queryParams.get('bookingRef') || '')
    } catch {
      setBookingRefFromQuery('')
    }

    const raw = window.sessionStorage.getItem(BOOKING_ACKNOWLEDGEMENT_STORAGE_KEY)
    if (!raw) {
      return
    }

    try {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') {
        setDetails(parsed)
      }
    } catch {
      setDetails(null)
    }
  }, [])

  const bookingRef = details?.bookingReference || bookingRefFromQuery || ''
  const submittedAt = formatSubmittedAt(details?.submittedAt || '')

  return (
    <section className="section-band booking-info-showcase" aria-label="Booking acknowledgement">
      <div className="booking-info-header">
        <p className="eyebrow">Booking acknowledgement</p>
        <h2>Your booking request has been received</h2>
        <p>
          {details?.summaryMessage || 'Thank you for your booking request. We will now check driver availability before confirming your final booking.'}
        </p>
      </div>

      <article className="info-card booking-info-card booking-info-card-full">
        <h3>Status</h3>
        <p>
          <strong>Booking status:</strong> {details?.bookingStatusLabel || 'Pending (Stage 1)'}<br />
          <strong>Booking reference:</strong> {bookingRef || 'Not available'}<br />
          {submittedAt ? (<><strong>Submitted at:</strong> {submittedAt}<br /></>) : null}
        </p>
        <p>
          Your booking is <strong>not fully confirmed</strong> until a driver is matched.
          We will contact you by email or phone as soon as we can confirm.
        </p>
      </article>

      <article className="info-card booking-info-card booking-info-card-full">
        <h3>Booking details submitted</h3>
        <p>
          <strong>Organisation:</strong> {details?.organisation || 'Not available'}<br />
          <strong>Destination name:</strong> {details?.destinationName || 'Not available'}<br />
          <strong>Destination address:</strong> {details?.destinationAddress || 'Not available'}<br />
          <strong>Booking date:</strong> {details?.bookingDate || 'Not available'}<br />
          <strong>Pickup time:</strong> {details?.pickupTime || 'Not available'}
        </p>
      </article>

      <article className="info-card booking-info-card booking-info-card-full">
        <h3>Contact details submitted</h3>
        <p>
          <strong>Name:</strong> {details?.contactName || 'Not available'}<br />
          <strong>Email:</strong> {details?.contactEmail || 'Not available'}<br />
          <strong>Phone:</strong> {details?.contactNumber || 'Not available'}
        </p>
      </article>

      <article className="info-card booking-info-card booking-info-card-full">
        <h3>Accessibility and special requirements</h3>
        <p>
          <strong>Static wheelchairs:</strong> {details?.staticWheelchairs || 'Not available'}<br />
          <strong>Powered wheelchairs:</strong> {details?.poweredWheelchairs || 'Not available'}<br />
          <strong>Passenger transfers:</strong> {details?.passengerTransfers || 'Not available'}<br />
          <strong>Special requirements:</strong> {details?.specialRequirements || 'Not available'}
        </p>
      </article>

      <article className="info-card booking-info-card booking-info-card-full">
        <h3>Need to change anything?</h3>
        <p>
          Please contact us at <a href={site.emailHref}>{site.email}</a> or <a href={site.phoneHref}>{site.phone}</a>.
        </p>
        <p>
          <Link href="/bookings/request/">Submit another booking request</Link>
        </p>
      </article>
    </section>
  )
}
