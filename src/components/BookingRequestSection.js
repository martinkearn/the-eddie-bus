'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

// Availability is fetched live from the API. When no endpoint is set, a sensible default is used (all days available except Sundays).

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

function mondayColumnIndex(date) {
  return (date.getDay() + 6) % 7
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

const INITIAL_DAYS = 70
const MORE_DAYS_STEP = 70

function buildCalendarDays(startDate, daysToShow, disabledWeekdays, unavailableDatesSet) {
  const start = new Date(startDate)
  start.setHours(0, 0, 0, 0)

  const days = []
  for (let i = 0; i < daysToShow; i += 1) {
    const date = addDays(start, i)
    const iso = formatISODate(date)
    const isBeforeToday = date < start
    const isUnavailableWeekday = disabledWeekdays.has(date.getDay())
    const isBooked = unavailableDatesSet.has(iso)
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
      const [year, month] = day.iso.split('-').map(Number)
      const firstOfMonth = new Date(year, month - 1, 1)
      months.push({
        name: day.month,
        leadingBlanks: mondayColumnIndex(firstOfMonth),
        days: [day],
      })
    } else {
      current.days.push(day)
    }
  }

  return { days, months }
}

function defaultAvailabilityConfig() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return {
    startDate: today,
    disabledWeekdays: new Set(),
    unavailableDates: new Set(),
  }
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

export function BookingRequestSection({ emailHref, fallbackPhone, fallbackPhoneHref, bookingApiEndpoint = '', showIntro = true, sectionId = 'booking-request' }) {
  const phoneHref = fallbackPhoneHref || '#'
  const apiEndpoint = useMemo(() => {
    const explicitEndpoint = String(bookingApiEndpoint || '').trim()
    if (explicitEndpoint) return explicitEndpoint

    if (typeof window !== 'undefined') {
      const host = window.location.hostname
      if (host === 'localhost' || host === '127.0.0.1') {
        return 'http://127.0.0.1:8080/bookings/create.php'
      }
    }

    return ''
  }, [bookingApiEndpoint])
  const availabilityEndpoint = apiEndpoint ? apiEndpoint.replace('create.php', 'availability.php') : ''

  const [hasMounted, setHasMounted] = useState(false)
  const [availabilityLoading, setAvailabilityLoading] = useState(false)
  const [calendarConfig, setCalendarConfig] = useState(null)
  const [daysToShow, setDaysToShow] = useState(INITIAL_DAYS)

  const { days, months } = useMemo(() => {
    if (!hasMounted || !calendarConfig) return { days: [], months: [] }
    return buildCalendarDays(
      calendarConfig.startDate,
      daysToShow,
      calendarConfig.disabledWeekdays,
      calendarConfig.unavailableDates
    )
  }, [hasMounted, calendarConfig, daysToShow])

  const firstAvailable = days.find((day) => day.status === 'available')

  const [selectedDate, setSelectedDate] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitState, setSubmitState] = useState({ type: 'idle', message: '' })

  const fetchAvailability = useCallback(async (startDate, days, existingUnavailable) => {
    if (!availabilityEndpoint) return null
    try {
      const url = `${availabilityEndpoint}?startDate=${formatISODate(startDate)}&daysToShow=${days}`
      const res = await fetch(url)
      if (!res.ok) return null
      const data = await res.json()
      const merged = new Set(existingUnavailable)
      if (Array.isArray(data.unavailableDates)) {
        for (const d of data.unavailableDates) merged.add(d)
      }
      return {
        startDate,
        disabledWeekdays: new Set(),
        unavailableDates: merged,
      }
    } catch {
      return null
    }
  }, [availabilityEndpoint])

  useEffect(() => {
    setHasMounted(true)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (availabilityEndpoint) {
      setAvailabilityLoading(true)
      fetchAvailability(today, INITIAL_DAYS, new Set()).then((config) => {
        setCalendarConfig(config || defaultAvailabilityConfig())
        setAvailabilityLoading(false)
      })
    } else {
      setCalendarConfig(defaultAvailabilityConfig())
    }
  }, [availabilityEndpoint, fetchAvailability])

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
    setSelectedDate(isoDate)
    setSubmitState({ type: 'idle', message: '' })
  }

  async function handleAddMoreDates() {
    const nextDays = daysToShow + MORE_DAYS_STEP
    setDaysToShow(nextDays)

    if (availabilityEndpoint && calendarConfig) {
      setAvailabilityLoading(true)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const updated = await fetchAvailability(today, nextDays, calendarConfig.unavailableDates)
      if (updated) setCalendarConfig(updated)
      setAvailabilityLoading(false)
    }
  }

  const selectedDateLabel = selectedDate
    ? formatReadableDate(parseISODateLocal(selectedDate))
    : 'Select a date from the calendar'
  const isSelectedDateUnavailable = Boolean(selectedDate && !isAvailable(selectedDate))

  async function handleSubmit(event) {
    event.preventDefault()
    const formElement = event.currentTarget

    const form = new FormData(formElement)
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

    if (!apiEndpoint) {
      const subject = encodeURIComponent(`Booking request for ${payload.organisation}`)
      const body = encodeURIComponent(createMailToBody(payload))
      const recipient = (emailHref || 'mailto:').replace(/^mailto:/, '')

      window.location.href = `mailto:${recipient}?subject=${subject}&body=${body}`

      setSubmitState({
        type: 'success',
        message: `Your email app should now open. If it does not, please phone ${fallbackPhone}.`,
      })
      return
    }

    setIsSubmitting(true)
    setSubmitState({ type: 'idle', message: '' })

    try {
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const result = await response.json().catch(() => null)

      if (!response.ok || !result?.ok) {
        const message = result?.message || 'We could not send your booking request at the moment. Please try again or call us.'
        throw new Error(message)
      }

      const bookingIdText = typeof result.bookingId === 'number'
        ? ` Your reference is booking #${result.bookingId}.`
        : ''

      setSubmitState({
        type: 'success',
        message: `Your booking request has been sent successfully.${bookingIdText} We will contact you soon to confirm details.`,
      })
      formElement.reset()

      if (availabilityEndpoint) {
        setAvailabilityLoading(true)
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const refreshed = await fetchAvailability(today, daysToShow, new Set())
        if (refreshed) {
          setCalendarConfig(refreshed)
          if (refreshed.unavailableDates.has(payload.bookingDate)) {
            setSelectedDate('')
          }
        }

        setAvailabilityLoading(false)
      }
    } catch (error) {
      setSubmitState({
        type: 'error',
        message: error instanceof Error ? error.message : 'We could not send your booking request at the moment.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section id={sectionId} className="booking-request section-band" aria-label="Booking request form">
      {showIntro ? (
        <div className="booking-request-head">
          <p className="eyebrow">Primary Booking Option</p>
          <h2>Complete the booking request form</h2>
          <p>
            Use the calendar to pick an available date, then complete your journey details. This is the quickest way for us to
            review your request and confirm availability with a volunteer driver.
          </p>
        </div>
      ) : null}

      <div className="booking-request-layout">
        <div className="booking-calendar-card" aria-label="Booking availability calendar">
          <div className="booking-calendar-head">
            <h3>Pick an available date</h3>
            <p>Use the date picker or calendar below to select your preferred date.</p>
          </div>

          {/* Shared Date Picker */}
          <div className="date-picker-section">
            <label htmlFor="date-input">
              <span>Select date</span>
              <input
                id="date-input"
                type="date"
                value={selectedDate}
                onChange={(e) => handleDatePick(e.target.value)}
                min={days.length > 0 ? days[0].iso : undefined}
                max={days.length > 0 ? days[days.length - 1].iso : undefined}
              />
            </label>

            {selectedDate && (
              <div className={`date-status date-status-${days.find(d => d.iso === selectedDate)?.status || 'unknown'}`} role="status" aria-live="polite">
                <div className="status-dot" />
                <div className="status-text">
                  {days.find(d => d.iso === selectedDate)?.status === 'available' ? (
                    <>
                      <p className="status-label">✓ Available</p>
                      <p className="status-date">{formatReadableDate(parseISODateLocal(selectedDate))}</p>
                    </>
                  ) : (
                    <>
                      <p className="status-label">⚠ Not available</p>
                      <p className="status-message">This date is not available for booking. Please select another date.</p>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Desktop Calendar View */}
          <div className="calendar-desktop-view">
            <div className="booking-calendar-legend" role="list" aria-label="Calendar legend">
              <span role="listitem"><strong className="calendar-dot available" aria-hidden="true" />Available</span>
              <span role="listitem"><strong className="calendar-dot unavailable" aria-hidden="true" />Unavailable</span>
              <span role="listitem"><strong className="calendar-dot selected" aria-hidden="true" />Selected</span>
            </div>

            <div className="calendar-months" role="list" aria-label="Upcoming availability by month">
              {availabilityLoading && !months.length ? <p aria-live="polite">Loading availability…</p> : null}
              {!availabilityLoading && !months.length ? <p>No dates to show.</p> : null}
              {months.map((month) => (
                <section key={month.name} className="calendar-month" role="listitem" aria-label={month.name}>
                  <h4>{month.name}</h4>
                  <div className="calendar-grid">
                    {Array.from({ length: month.leadingBlanks }).map((_, index) => (
                      <span key={`${month.name}-blank-${index}`} className="calendar-day-spacer" aria-hidden="true" />
                    ))}
                    {month.days.map((day) => {
                      const isSelected = day.iso === selectedDate

                      return (
                        <button
                          key={day.iso}
                          type="button"
                          className={`calendar-day ${day.status} ${isSelected ? 'is-selected' : ''}`}
                          onClick={() => handleDatePick(day.iso)}
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
              <button type="button" className="button button-secondary" onClick={handleAddMoreDates} disabled={availabilityLoading}>
                {availabilityLoading ? 'Loading…' : 'Add more dates'}
              </button>
            </div>
          </div>
        </div>

        <form className="booking-form-card" onSubmit={handleSubmit} noValidate>
          <h2>Booking request form</h2>
          <p className="booking-form-intro">Fields marked required must be completed before sending your request.</p>
          <p className="booking-form-alternative">
            Prefer not to use the form? You can still book by <a href={emailHref}>email</a> or <a href={phoneHref}>{fallbackPhone}</a>.
          </p>

          <div className="booking-form-grid">
            <div className="booking-date-statement">
              <input type="hidden" name="bookingDate" value={selectedDate} />
              <p aria-live="polite">
                You are booking: <strong>{selectedDateLabel}</strong>
              </p>
              {isSelectedDateUnavailable ? (
                <p className="booking-status error" role="alert">Warning: this date is not available. Please choose an available date to continue.</p>
              ) : null}
            </div>

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
            <button 
              type="submit" 
              className="button button-primary" 
              disabled={isSubmitting || !selectedDate || isSelectedDateUnavailable}
              aria-disabled={isSubmitting || !selectedDate || isSelectedDateUnavailable}
            >
              {isSubmitting ? 'Sending...' : 'Send booking request'}
            </button>
            {isSelectedDateUnavailable ? (
              <p className="booking-status error" role="alert">The selected date is not available. You cannot submit this booking request until you choose an available date.</p>
            ) : null}
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
