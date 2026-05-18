'use client'

import { useEffect, useMemo, useState } from 'react'
import availabilityData from '../content/bookingAvailability.json'

// Availability is sourced from static JSON for now and can be swapped to a backend feed later.

const MONTH_FORMATTER = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' })
const DAY_FORMATTER = new Intl.DateTimeFormat('en-GB', { weekday: 'short' })

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function formatReadableDate(date) {
  const weekday = WEEKDAY_NAMES[date.getDay()]
  const day = date.getDate()
  const month = MONTH_NAMES[date.getMonth()]
  const year = date.getFullYear()
  return `${weekday} ${day} ${month} ${year}`
}
const PICKUP_TIME_OPTIONS = [
  '07:00', '07:30', '08:00', '08:30', '09:00', '09:30',
  '10:00', '10:30', '11:00', '11:30', '12:00', '12:30',
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00',
]

function formatISODate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function addDays(date, amount) {
  const clone = new Date(date)
  clone.setDate(clone.getDate() + amount)
  return clone
}

function parseISODateLocal(value) {
  if (!value || typeof value !== 'string') {
    return null
  }

  const parts = value.split('-').map((part) => Number(part))
  if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) {
    return null
  }

  return new Date(parts[0], parts[1] - 1, parts[2])
}

function generateCalendarData(daysToShowOverride) {
  const defaultStart = new Date()
  defaultStart.setHours(0, 0, 0, 0)

  const configuredStart = parseISODateLocal(availabilityData.startDate)
  const start = configuredStart || defaultStart

  const firstDay = new Date(start)
  firstDay.setDate(start.getDate() - start.getDay())
  const daysToShow = Number(daysToShowOverride) || Number(availabilityData.daysToShow) || 56
  const disablePastDates = availabilityData.disablePastDates !== false
  const disabledWeekdays = new Set(Array.isArray(availabilityData.disableWeekdays) ? availabilityData.disableWeekdays : [0])
  const unavailableDates = new Set(Array.isArray(availabilityData.unavailableDates) ? availabilityData.unavailableDates : [])
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const days = []

  for (let i = 0; i < daysToShow; i += 1) {
    const date = addDays(firstDay, i)
    const iso = formatISODate(date)
    const isBeforeToday = disablePastDates && date < start
    const isUnavailableWeekday = disabledWeekdays.has(date.getDay())
    const isBooked = unavailableDates.has(iso)

    const status = isBeforeToday || isUnavailableWeekday || isBooked ? 'unavailable' : 'available'

    days.push({
      iso,
      label: String(date.getDate()),
      month: MONTH_FORMATTER.format(date),
      weekday: DAY_FORMATTER.format(date),
      readableDate: formatReadableDate(date),
      status,
    })
  }

  const months = []
  for (const day of days) {
    const current = months[months.length - 1]
    if (!current || current.name !== day.month) {
      months.push({ name: day.month, days: [day] })
    } else {
      current.days.push(day)
    }
  }

  return { days, months }
}

function createMailToBody(data) {
  return [
    'New booking request',
    '',
    `Date for booking: ${data.bookingDate}`,
    `Organisation or group: ${data.organisation}`,
    `Destination name: ${data.destinationName}`,
    `Destination address: ${data.destinationAddress || 'Not provided'}`,
    `Pickup time: ${data.pickupTime}`,
    `Contact name: ${data.contactName}`,
    `Contact email: ${data.contactEmail}`,
    `Contact number: ${data.contactNumber}`,
    `Static wheelchairs: ${data.staticWheelchairs}`,
    `Powered wheelchairs: ${data.poweredWheelchairs}`,
    `Passenger transfers (wheelchair to seat): ${data.passengerTransfers}`,
    `Special requirements: ${data.specialRequirements || 'None provided'}`,
  ].join('\n')
}

export function BookingRequestSection({ emailHref, fallbackPhone }) {
  const [hasMounted, setHasMounted] = useState(false)
  const initialDaysToShow = Number(availabilityData.daysToShow) || 56
  const addMoreStep = Number(availabilityData.daysIncrement) || 28
  const [daysToShow, setDaysToShow] = useState(initialDaysToShow)
  const { days, months } = useMemo(() => {
    if (!hasMounted) {
      return { days: [], months: [] }
    }

    return generateCalendarData(daysToShow)
  }, [daysToShow, hasMounted])

  const firstAvailable = days.find((day) => day.status === 'available')

  const [selectedDate, setSelectedDate] = useState(firstAvailable ? firstAvailable.iso : '')
  const [submitState, setSubmitState] = useState({ type: 'idle', message: '' })

  useEffect(() => {
    setHasMounted(true)
  }, [])

  useEffect(() => {
    if (!selectedDate && firstAvailable) {
      setSelectedDate(firstAvailable.iso)
    }
  }, [firstAvailable, selectedDate])

  function isAvailable(isoDate) {
    const match = days.find((day) => day.iso === isoDate)
    return Boolean(match && match.status === 'available')
  }

  function handleDatePick(isoDate) {
    if (!isAvailable(isoDate)) {
      return
    }

    setSelectedDate(isoDate)
    setSubmitState({ type: 'idle', message: '' })
  }

  function handleAddMoreDates() {
    setDaysToShow((current) => current + addMoreStep)
  }

  const selectedDateLabel = selectedDate
    ? formatReadableDate(parseISODateLocal(selectedDate))
    : 'Select a date from the calendar'

  function handleSubmit(event) {
    event.preventDefault()

    const form = new FormData(event.currentTarget)
    const payload = {
      bookingDate: String(form.get('bookingDate') || ''),
      organisation: String(form.get('organisation') || ''),
      destinationName: String(form.get('destinationName') || ''),
      destinationAddress: String(form.get('destinationAddress') || ''),
      pickupTime: String(form.get('pickupTime') || ''),
      contactName: String(form.get('contactName') || ''),
      contactEmail: String(form.get('contactEmail') || ''),
      contactNumber: String(form.get('contactNumber') || ''),
      staticWheelchairs: String(form.get('staticWheelchairs') || 'No'),
      poweredWheelchairs: String(form.get('poweredWheelchairs') || 'No'),
      passengerTransfers: String(form.get('passengerTransfers') || 'No'),
      specialRequirements: String(form.get('specialRequirements') || ''),
    }

    if (!payload.bookingDate || !isAvailable(payload.bookingDate)) {
      setSubmitState({
        type: 'error',
        message: 'Please choose an available booking date before sending your request.',
      })
      return
    }

    const subject = encodeURIComponent(`Booking request for ${payload.organisation}`)
    const body = encodeURIComponent(createMailToBody(payload))
    const recipient = (emailHref || 'mailto:').replace(/^mailto:/, '')

    window.location.href = `mailto:${recipient}?subject=${subject}&body=${body}`

    setSubmitState({
      type: 'success',
      message: `Your email app should now open. If it does not, please phone ${fallbackPhone}.`,
    })
  }

  return (
    <section className="booking-request section-band" aria-labelledby="booking-request-heading">
      <div className="booking-request-head">
        <p className="eyebrow">Online Booking Request</p>
        <h2 id="booking-request-heading">Check availability and send a request</h2>
        <p>
          Use the calendar to pick an available date, then complete your journey details. We will confirm availability with a
          volunteer driver and contact you by email or phone.
        </p>
      </div>

      <div className="booking-request-layout">
        <div className="booking-calendar-card" aria-label="Booking availability calendar">
          <div className="booking-calendar-head">
            <h3>Availability calendar</h3>
            <p>Green dates are currently available to request. Grey dates are unavailable.</p>
          </div>

          <div className="booking-calendar-legend" role="list" aria-label="Calendar legend">
            <span role="listitem"><strong className="calendar-dot available" aria-hidden="true" />Available</span>
            <span role="listitem"><strong className="calendar-dot unavailable" aria-hidden="true" />Unavailable</span>
            <span role="listitem"><strong className="calendar-dot selected" aria-hidden="true" />Selected</span>
          </div>

          <div className="calendar-months" role="list" aria-label="Upcoming availability by month">
            {!months.length ? <p>Loading availability...</p> : null}
            {months.map((month) => (
              <section key={month.name} className="calendar-month" role="listitem" aria-label={month.name}>
                <h4>{month.name}</h4>
                <div className="calendar-grid">
                  {month.days.map((day) => {
                    const isSelected = day.iso === selectedDate
                    const unavailable = day.status === 'unavailable'

                    return (
                      <button
                        key={day.iso}
                        type="button"
                        className={`calendar-day ${day.status} ${isSelected ? 'is-selected' : ''}`}
                        onClick={() => handleDatePick(day.iso)}
                        disabled={unavailable}
                        aria-pressed={isSelected}
                        aria-label={`${day.readableDate}: ${day.status}`}
                      >
                        <span>{day.label}</span>
                        <small>{day.weekday}</small>
                      </button>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>

          <div className="booking-calendar-actions">
            <button type="button" className="button button-secondary" onClick={handleAddMoreDates}>Add more dates</button>
          </div>
        </div>

        <form className="booking-form-card" onSubmit={handleSubmit} noValidate>
          <h3>Booking request form</h3>
          <p className="booking-form-intro">Fields marked required must be completed before sending your request.</p>

          <div className="booking-form-grid">
            <label>
              <span>Date for booking *</span>
              <input type="hidden" name="bookingDate" value={selectedDate} />
              <p className="booking-date-display" aria-live="polite">{selectedDateLabel}</p>
            </label>

            <label>
              <span>Approx Pickup time *</span>
              <small className="field-prompt">Times between 07:00 and 16:00. We're flexible and can discuss alternatives.</small>
              <select name="pickupTime" required defaultValue="">
                <option value="" disabled>Select pickup time</option>
                {PICKUP_TIME_OPTIONS.map((time) => (
                  <option key={time} value={time}>{time}</option>
                ))}
              </select>
            </label>

            <label className="field-full">
              <span>Name of organisation or group *</span>
              <small className="field-prompt">e.g. Care home name or group name</small>
              <input type="text" name="organisation" required autoComplete="organization" />
            </label>

            <label className="field-full">
              <span>Destination name *</span>
              <small className="field-prompt">e.g. Garden centers, Museums, Parks, Community Centre</small>
              <input type="text" name="destinationName" required />
            </label>

            <label className="field-full">
              <span>Destination address</span>
              <small className="field-prompt">Optional. If you have it, the postcode is the most important bit for route planning.</small>
              <input type="text" name="destinationAddress" />
            </label>

            <label className="field-full">
              <span>Contact name *</span>
              <small className="field-prompt">Who is coordinating this booking?</small>
              <input type="text" name="contactName" required autoComplete="name" />
            </label>

            <label className="field-full">
              <span>Contact email *</span>
              <small className="field-prompt">We'll send confirmation and next steps here</small>
              <input type="email" name="contactEmail" required autoComplete="email" />
            </label>

            <label className="field-full">
              <span>Contact number *</span>
              <small className="field-prompt">In case we need to clarify details quickly</small>
              <input type="tel" name="contactNumber" required autoComplete="tel" />
            </label>

            <div className="field-full mobility-support-group" aria-labelledby="mobility-support-heading">
              <h4 id="mobility-support-heading">Mobility and transfer details</h4>
              <p>
                Please share your best estimate now. These details help us plan safe seating, wheelchair spaces and boarding
                arrangements before confirming your trip.
              </p>

              <div className="mobility-support-grid">
                <fieldset>
                  <legend>Static wheelchairs</legend>
                  <p className="fieldset-prompt">Will you have passengers who remain in their static wheelchair throughout the trip?</p>
                  <div className="booking-radios">
                    <label><input type="radio" name="staticWheelchairs" value="Yes" required /> Yes</label>
                    <label><input type="radio" name="staticWheelchairs" value="No" /> No</label>
                  </div>
                </fieldset>

                <fieldset>
                  <legend>Powered wheelchairs</legend>
                  <p className="fieldset-prompt">Will you have passengers who use powered wheelchairs who will stay in them for the trip?</p>
                  <div className="booking-radios">
                    <label><input type="radio" name="poweredWheelchairs" value="Yes" required /> Yes</label>
                    <label><input type="radio" name="poweredWheelchairs" value="No" /> No</label>
                  </div>
                </fieldset>

                <fieldset className="field-full">
                  <legend>Wheelchair transfers</legend>
                  <p className="fieldset-prompt">Will you have passengers who will transfer from a wheelchair to a bus seat?</p>
                  <div className="booking-radios">
                    <label><input type="radio" name="passengerTransfers" value="Yes" required /> Yes</label>
                    <label><input type="radio" name="passengerTransfers" value="No" /> No</label>
                  </div>
                </fieldset>
              </div>
            </div>

            <label className="field-full">
              <span>Any comments</span>
              <small className="field-prompt">Add any comments or notes here, such as access considerations or special needs</small>
              <textarea name="specialRequirements" rows={4} />
            </label>
          </div>

          <div className="booking-form-actions">
            <button type="submit" className="button button-primary">Send booking request</button>
            <p className="booking-form-actions-note">After you submit your booking request, we'll check driver availability and contact you by email or phone to confirm your final booking.</p>
          </div>

          {submitState.message ? (
            <p className={`booking-status ${submitState.type}`} role="status">{submitState.message}</p>
          ) : null}
        </form>
      </div>
    </section>
  )
}
