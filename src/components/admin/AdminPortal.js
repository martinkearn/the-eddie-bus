'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faArrowLeft,
  faArrowRight,
  faArrowUpRightFromSquare,
  faBars,
  faCalendarCheck,
  faCheck,
  faCopy,
  faFloppyDisk,
  faHourglassHalf,
  faMagnifyingGlass,
  faPlus,
  faRotate,
  faRightFromBracket,
  faRightToBracket,
  faRotateLeft,
  faTrash,
  faUsers,
  faUser,
  faUserPlus,
  faXmark,
} from '@fortawesome/free-solid-svg-icons'
import { faCircleCheck } from '@fortawesome/free-regular-svg-icons'

const PAGE_SIZE = 250
const DEFAULT_PAST_WEEKS = 4
const DEFAULT_FUTURE_WEEKS = 8

const BOOKING_STATUS_OPTIONS = [
  { value: 'pending', label: '1. Pending', description: 'This is a new booking. Next step is to match a driver and confirm to the customer.' },
  { value: 'confirmed', label: '2. Confirmed', description: 'This booking now has driver and has been confirmed with customer. Next step is to complete the journey.' },
  { value: 'journey_completed', label: '3. Journey Completed', description: 'This journey has been completed and mileage has been recorded. Next step is to invoice the customer.' },
  { value: 'customer_billed', label: '4. Customer Billed', description: 'The customer has been invoiced for the journey but has not yet paid. Next step is to receive payment.' },
  { value: 'booking_completed', label: '5. Booking Completed', description: 'Customer has paid and booking is completed.' },
  { value: 'cancelled_by_customer', label: 'Cancelled by Customer', description: 'Customer has cancelled the booking. Use admin notes to explain why.' },
  { value: 'cancelled_by_us', label: 'Cancelled by Us', description: 'We have cancelled the booking. Use admin notes to explain why.' },
]

const STANDARD_BOOKING_STATUS_VALUES = new Set([
  'pending',
  'confirmed',
  'journey_completed',
  'customer_billed',
  'booking_completed',
])

const STANDARD_BOOKING_STATUS_OPTIONS = BOOKING_STATUS_OPTIONS.filter((option) => STANDARD_BOOKING_STATUS_VALUES.has(option.value))

const DRIVER_MAPPING_OPTIONS_SELF = [
  { value: 'available', label: 'Available' },
  { value: 'maybe_available', label: 'Maybe Available' },
  { value: 'not_available', label: 'Not Available' },
]

const DRIVER_MAPPING_OPTIONS_ADMIN = [
  ...DRIVER_MAPPING_OPTIONS_SELF,
  { value: 'confirmed', label: 'Confirmed' },
]

const DRIVER_MAPPING_LABELS = {
  available: 'Available',
  maybe_available: 'Maybe Available',
  not_available: 'Not Available',
  confirmed: 'Confirmed',
}

function formatDriverMappingStatus(value) {
  const normalized = String(value || '').trim().toLowerCase()
  return DRIVER_MAPPING_LABELS[normalized] || 'No response yet'
}

const LEGACY_BOOKING_STATUS_ALIASES = {
  cancelled: 'cancelled_by_customer',
  completed: 'journey_completed',
}

function normalizeBookingStatus(value) {
  const normalized = String(value || '').trim().toLowerCase()
  if (!normalized) return 'pending'
  return LEGACY_BOOKING_STATUS_ALIASES[normalized] || normalized
}

function getBookingStatusMeta(value) {
  const normalized = normalizeBookingStatus(value)
  return BOOKING_STATUS_OPTIONS.find((option) => option.value === normalized) || BOOKING_STATUS_OPTIONS[0]
}

function formatBookingStatusLabel(value) {
  return getBookingStatusMeta(value).label
}

function formatBookingStatusDescription(value) {
  return getBookingStatusMeta(value).description
}

function isStandardBookingStatus(value) {
  return STANDARD_BOOKING_STATUS_VALUES.has(value)
}

function getStandardWorkflowStepNumber(value) {
  const normalized = normalizeBookingStatus(value)
  const index = STANDARD_BOOKING_STATUS_OPTIONS.findIndex((option) => option.value === normalized)
  return index >= 0 ? index + 1 : null
}

function deriveAdminApiBase(bookingApiEndpoint, explicitAdminApiBase) {
  const explicit = String(explicitAdminApiBase || '').trim()
  if (explicit) {
    return explicit.replace(/\/$/, '')
  }

  const bookingEndpoint = String(bookingApiEndpoint || '').trim()
  if (bookingEndpoint.includes('/bookings/create.php')) {
    return bookingEndpoint.replace('/bookings/create.php', '/admin')
  }

  if (typeof window !== 'undefined') {
    const host = window.location.hostname
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://127.0.0.1:8080/admin'
    }
  }

  return '/api/admin'
}

function toBooleanFlag(value) {
  if (value === true || value === 1 || value === '1') return true
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    return ['yes', 'true', '1', 'y', 'on'].includes(normalized)
  }
  return false
}

function toTriStateSelection(value) {
  if (value === true || value === 1 || value === '1') return 'yes'
  if (value === false || value === 0 || value === '0') return 'no'

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (['yes', 'true', '1', 'y', 'on'].includes(normalized)) return 'yes'
    if (['no', 'false', '0', 'n', 'off'].includes(normalized)) return 'no'
  }

  return 'not-entered'
}

function triStateLabel(value) {
  if (value === 'yes') return 'Yes'
  if (value === 'no') return 'No'
  return 'Not entered'
}

const TRI_STATE_CHECKLIST_OPTIONS = [
  { value: 'not-entered', label: 'Not entered' },
  { value: 'no', label: 'No' },
  { value: 'yes', label: 'Yes' },
]

function TriStateButtonGroup({ value, onChange }) {
  const normalizedValue = String(value || 'not-entered')

  return (
    <div className="admin-tri-state-buttons" role="group" aria-label="Checklist response options">
      {TRI_STATE_CHECKLIST_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          className={`button admin-tri-state-btn${normalizedValue === option.value ? ' is-active' : ''}`}
          onClick={() => onChange(option.value)}
          aria-pressed={normalizedValue === option.value}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

function mapBookingToForm(booking) {
  if (!booking) return null
  return {
    id: String(booking.id || ''),
    bookingRef: String(booking.booking_ref || ''),
    status: normalizeBookingStatus(booking.status),
    driverUserId: booking.driver_user_id !== null && booking.driver_user_id !== undefined ? String(booking.driver_user_id) : '',
    driverName: String(booking.driver_name || booking.driver_display_name || booking.driver_username || ''),
    bookingDate: String(booking.booking_date || ''),
    pickupTime: String(booking.pickup_time || ''),
    organisation: String(booking.organisation || ''),
    destinationName: String(booking.destination_name || ''),
    destinationAddress: String(booking.destination_address || ''),
    contactName: String(booking.contact_name || ''),
    contactEmail: String(booking.contact_email || ''),
    contactNumber: String(booking.contact_number || ''),
    staticWheelchairs: toBooleanFlag(booking.static_wheelchairs),
    poweredWheelchairs: toBooleanFlag(booking.powered_wheelchairs),
    passengerTransfers: toBooleanFlag(booking.passenger_transfers),
    specialRequirements: String(booking.special_requirements || ''),
    startMileage: booking.start_mileage !== null && booking.start_mileage !== undefined ? String(booking.start_mileage) : '',
    finishMileage: booking.finish_mileage !== null && booking.finish_mileage !== undefined ? String(booking.finish_mileage) : '',
    nonBillableMileage: booking.non_billable_mileage !== null && booking.non_billable_mileage !== undefined ? String(booking.non_billable_mileage) : '',
    checklistLightsIndicators: toTriStateSelection(booking.checklist_lights_indicators),
    checklistTyres: toTriStateSelection(booking.checklist_tyres),
    checklistWheelNuts: toTriStateSelection(booking.checklist_wheel_nuts),
    checklistBodywork: toTriStateSelection(booking.checklist_bodywork),
    checklistMirrorsGlass: toTriStateSelection(booking.checklist_mirrors_glass),
    checklistBrakes: toTriStateSelection(booking.checklist_brakes),
    checklistSteering: toTriStateSelection(booking.checklist_steering),
    checklistWipersWashers: toTriStateSelection(booking.checklist_wipers_washers),
    checklistDashboardWarningLights: toTriStateSelection(booking.checklist_dashboard_warning_lights),
    checklistSeatsSeatbelts: toTriStateSelection(booking.checklist_seats_seatbelts),
    checklistEmergencyEquipment: toTriStateSelection(booking.checklist_emergency_equipment),
    checklistWheelchairLiftsRestraints: toTriStateSelection(booking.checklist_wheelchair_lifts_restraints),
    checklistTailLifts: toTriStateSelection(booking.checklist_tail_lifts),
    vehicleCheckDate: String(booking.vehicle_check_date || ''),
    vehicleCheckSignedBy: String(booking.vehicle_check_signed_by || ''),
    vehicleFaultsRecorded: String(booking.vehicle_faults_recorded || ''),
    adminNotes: String(booking.admin_notes || ''),
    createdAt: formatDateTimeUK(booking.created_at),
    updatedAt: formatDateTimeUK(booking.updated_at),
  }
}

const VEHICLE_CHECK_KEYS = [
  'checklist_lights_indicators',
  'checklist_tyres',
  'checklist_wheel_nuts',
  'checklist_bodywork',
  'checklist_mirrors_glass',
  'checklist_brakes',
  'checklist_steering',
  'checklist_wipers_washers',
  'checklist_dashboard_warning_lights',
  'checklist_seats_seatbelts',
  'checklist_emergency_equipment',
  'checklist_wheelchair_lifts_restraints',
  'checklist_tail_lifts',
]

function isVehicleCheckComplete(booking) {
  if (!booking) return false

  const hasDate = String(booking.vehicle_check_date || '').trim() !== ''
  const hasSignature = String(booking.vehicle_check_signed_by || '').trim() !== ''
  const hasAllChecks = VEHICLE_CHECK_KEYS.every((key) => toBooleanFlag(booking[key]))

  return hasDate && hasSignature && hasAllChecks
}

function formatDateUK(dateStr) {
  return formatDateWords(dateStr)
}

function formatDateShortNoYearUK(dateStr) {
  if (!dateStr) return ''
  try {
    const date = new Date(String(dateStr) + 'T00:00:00Z')
    if (Number.isNaN(date.getTime())) {
      return String(dateStr)
    }

    const weekday = WEEKDAY_NAMES_SHORT[date.getUTCDay()]
    const day = toOrdinalDay(date.getUTCDate())
    const month = MONTH_NAMES[date.getUTCMonth()]

    return `${weekday} ${day} ${month}`
  } catch {
    return String(dateStr)
  }
}

function formatDateTimeUK(dateTimeStr) {
  if (!dateTimeStr) return ''
  try {
    const parsed = new Date(String(dateTimeStr).replace(' ', 'T'))
    if (Number.isNaN(parsed.getTime())) {
      return String(dateTimeStr)
    }

    const dateWords = formatDateWords(parsed.toISOString().slice(0, 10))
    const hours = String(parsed.getHours()).padStart(2, '0')
    const minutes = String(parsed.getMinutes()).padStart(2, '0')

    return `${dateWords} ${hours}:${minutes}`
  } catch {
    return String(dateTimeStr)
  }
}

function formatPickupTime(timeStr) {
  if (!timeStr) return ''

  const normalized = String(timeStr)
  const match = normalized.match(/^([01]\d|2[0-3]):([0-5]\d)/)
  if (match) {
    return `${match[1]}:${match[2]}`
  }

  return normalized
}

function formatBookingDateAndTime(dateStr, timeStr) {
  const date = formatDateUK(dateStr)
  const time = formatPickupTime(timeStr)

  if (date && time) {
    return `${date} ${time}`
  }

  return date || time || ''
}

const WEEKDAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function toOrdinalDay(day) {
  const absDay = Math.abs(Number(day))
  const remainderHundred = absDay % 100
  if (remainderHundred >= 11 && remainderHundred <= 13) {
    return `${absDay}th`
  }

  const remainderTen = absDay % 10
  if (remainderTen === 1) return `${absDay}st`
  if (remainderTen === 2) return `${absDay}nd`
  if (remainderTen === 3) return `${absDay}rd`
  return `${absDay}th`
}

function formatDateWords(dateStr) {
  if (!dateStr) return ''
  try {
    const date = new Date(dateStr + 'T00:00:00Z')
    if (Number.isNaN(date.getTime())) {
      return String(dateStr)
    }

    const weekday = WEEKDAY_NAMES_SHORT[date.getUTCDay()]
    const day = date.getUTCDate()
    const dayOrdinal = toOrdinalDay(day)
    const month = MONTH_NAMES[date.getUTCMonth()]
    const year = date.getUTCFullYear()

    return `${weekday} ${dayOrdinal} ${month} ${year}`
  } catch {
    return dateStr
  }
}

function formatDisplayText(value, fallback = 'Not provided') {
  const normalized = String(value ?? '').trim()
  return normalized || fallback
}

function preferredUserLabel(user, fallback = 'Not provided') {
  if (!user || typeof user !== 'object') {
    return fallback
  }

  const displayName = String(user.displayName ?? user.display_name ?? '').trim()
  if (displayName) return displayName

  const username = String(user.username ?? user.user_name ?? user.label ?? '').trim()
  if (username) return username

  return fallback
}

function isDriverUnassigned(value) {
  const normalized = String(value ?? '').trim().toLowerCase()
  return normalized === '' || normalized === 'unassigned'
}

function formatDateForApi(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getBookingWindowDates(weeksInPast, weeksInFuture) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const fromDate = new Date(today)
  fromDate.setDate(fromDate.getDate() - (weeksInPast * 7))

  const toDate = new Date(today)
  toDate.setDate(toDate.getDate() + (weeksInFuture * 7))

  return {
    from: formatDateForApi(fromDate),
    to: formatDateForApi(toDate),
  }
}

function decodeUrlSegment(value) {
  try {
    return decodeURIComponent(String(value || '').trim())
  } catch {
    return String(value || '').trim()
  }
}

const BOOKING_DETAIL_TAB_SLUGS = {
  main: 'main',
  availability: 'youravaliability',
  'driver-assignment': 'driver-assignment',
  checklist: 'checklist',
}

function normalizeBookingDetailTab(value) {
  const normalized = String(value || '').trim().toLowerCase()
  if (normalized === 'availability' || normalized === 'youravaliability' || normalized === 'youravailability') return 'availability'
  if (normalized === 'driver-assignment' || normalized === 'driverassignment') return 'driver-assignment'
  if (normalized === 'checklist') return 'checklist'
  return 'main'
}

function getBookingDeepLinkStateFromLocation() {
  if (typeof window === 'undefined') {
    return { reference: '', detailTab: 'main' }
  }

  const currentUrl = new URL(window.location.href)
  const rawQueryReference = currentUrl.searchParams.get('bookingRef') || currentUrl.searchParams.get('bookingReference') || currentUrl.searchParams.get('ref') || ''
  const rawQueryTab = currentUrl.searchParams.get('tab') || ''
  const queryReference = decodeUrlSegment(rawQueryReference)
  if (queryReference) {
    return {
      reference: queryReference,
      detailTab: normalizeBookingDetailTab(rawQueryTab),
    }
  }

  const pathMatch = currentUrl.pathname.match(/^\/admin\/([^/]+)(?:\/([^/]+))?\/?$/i)
  if (!pathMatch || !pathMatch[1]) {
    return { reference: '', detailTab: 'main' }
  }

  return {
    reference: decodeUrlSegment(pathMatch[1]),
    detailTab: normalizeBookingDetailTab(decodeUrlSegment(pathMatch[2] || '')),
  }
}

function updateBookingReferenceInUrl(reference, { replace = false, detailTab = 'main' } = {}) {
  if (typeof window === 'undefined') {
    return
  }

  const normalizedReference = String(reference || '').trim()
  const normalizedDetailTab = normalizeBookingDetailTab(detailTab)
  const detailTabSlug = BOOKING_DETAIL_TAB_SLUGS[normalizedDetailTab] || BOOKING_DETAIL_TAB_SLUGS.main
  const currentUrl = new URL(window.location.href)
  const nextPathname = normalizedReference
    ? `/admin/${encodeURIComponent(normalizedReference)}${normalizedDetailTab !== 'main' ? `/${encodeURIComponent(detailTabSlug)}` : ''}`
    : '/admin/'
  const nextSearch = ''
  const currentPathAndQuery = `${currentUrl.pathname}${currentUrl.search}`
  const nextPathAndQuery = `${nextPathname}${nextSearch}`

  if (currentPathAndQuery === nextPathAndQuery) {
    return
  }

  const method = replace ? 'replaceState' : 'pushState'
  window.history[method](null, '', `${nextPathAndQuery}${currentUrl.hash}`)
}

export function AdminPortal({ bookingApiEndpoint = '', adminApiBase = '', initialBookingReference = '' }) {
  const baseUrl = useMemo(() => deriveAdminApiBase(bookingApiEndpoint, adminApiBase), [bookingApiEndpoint, adminApiBase])
  const initialBookingReferenceTerm = useMemo(() => String(initialBookingReference || '').trim(), [initialBookingReference])
  const [sessionToken, setSessionToken] = useState('')
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const [sessionLoading, setSessionLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [activeTab, setActiveTab] = useState('bookings')

  const [loginForm, setLoginForm] = useState({ username: '', password: '' })
  const [loginLoading, setLoginLoading] = useState(false)
  const [banner, setBanner] = useState({ type: 'idle', message: '' })

  const [searchInput, setSearchInput] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [hasExecutedSearch, setHasExecutedSearch] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [pastWeeksVisible, setPastWeeksVisible] = useState(DEFAULT_PAST_WEEKS)
  const [futureWeeksVisible, setFutureWeeksVisible] = useState(DEFAULT_FUTURE_WEEKS)
  const [bookingsLoading, setBookingsLoading] = useState(false)
  const [bookings, setBookings] = useState([])
  const [bookingWindowCounts, setBookingWindowCounts] = useState({ pastCount: 0, futureCount: 0 })

  const [selectedBookingId, setSelectedBookingId] = useState('')
  const [bookingForm, setBookingForm] = useState(null)
  const [bookingDetailTab, setBookingDetailTab] = useState('main')
  const [bookingDetailLoading, setBookingDetailLoading] = useState(false)
  const [driverMappingsLoading, setDriverMappingsLoading] = useState(false)
  const [driverMappingsSaveLoading, setDriverMappingsSaveLoading] = useState(false)
  const [driverMappings, setDriverMappings] = useState([])
  const [myDriverMappingDraft, setMyDriverMappingDraft] = useState('')
  const [adminConfirmUserIdDraft, setAdminConfirmUserIdDraft] = useState('')
  const [bookingSaveLoading, setBookingSaveLoading] = useState(false)
  const [checklistSaveLoading, setChecklistSaveLoading] = useState(false)
  const [bookingDeleteLoading, setBookingDeleteLoading] = useState(false)
  const [copyFeedbackKey, setCopyFeedbackKey] = useState('')
  const copyFeedbackTimerRef = useRef(null)
  const [pendingDeepLinkReference, setPendingDeepLinkReference] = useState(initialBookingReferenceTerm)
  const [pendingDeepLinkDetailTab, setPendingDeepLinkDetailTab] = useState('main')

  const [users, setUsers] = useState([])
  const [assignableUsers, setAssignableUsers] = useState([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [selectedUserProfileId, setSelectedUserProfileId] = useState('')
  const [selectedUserProfileDraft, setSelectedUserProfileDraft] = useState({ username: '', displayName: '', role: 'viewer', email: '', phoneNumber: '' })
  const [userProfileSaving, setUserProfileSaving] = useState(false)
  const [userDeleteLoading, setUserDeleteLoading] = useState(false)
  const [userResetLoading, setUserResetLoading] = useState(false)
  const [resetPasswordResult, setResetPasswordResult] = useState(null)
  const [newUserForm, setNewUserForm] = useState({ username: '', displayName: '', email: '', phoneNumber: '', role: 'viewer', password: '' })
  const [newUserLoading, setNewUserLoading] = useState(false)
  const [showCreateUserForm, setShowCreateUserForm] = useState(false)

  const [accountForm, setAccountForm] = useState({ displayName: '', email: '', phoneNumber: '', currentPassword: '', newPassword: '' })
  const [accountSaving, setAccountSaving] = useState(false)

  const isAdmin = user?.role === 'admin'
  const isAssignedDriver = !!bookingForm?.driverUserId && !!user?.id && String(bookingForm.driverUserId) === String(user.id)
  const canEditChecklist = isAdmin || isAssignedDriver
  const isDriverSelectionUnassigned = isDriverUnassigned(bookingForm?.driverUserId)
  const hasConfirmedDriver = !!bookingForm?.driverUserId
  const isCurrentUserConfirmedDriver = hasConfirmedDriver && !!user?.id && String(bookingForm.driverUserId) === String(user.id)
  const isBookingsTab = activeTab === 'bookings'
  const isMyBookingsTab = activeTab === 'my-bookings'
  const resolveBookingDetailTab = useCallback((value) => {
    const normalized = normalizeBookingDetailTab(value)
    if (!isAdmin && normalized === 'driver-assignment') {
      return 'main'
    }

    return normalized
  }, [isAdmin])
  const myBookingsDriverUserId = isMyBookingsTab && user?.id !== undefined && user?.id !== null ? String(user.id) : ''
  const currentUserDriverMapping = useMemo(() => {
    if (!user?.id) return null
    return driverMappings.find((item) => String(item.user_id) === String(user.id)) || null
  }, [driverMappings, user])
  const currentUserDriverMappingStatus = String(currentUserDriverMapping?.mapping_status || '')
  const getCurrentBookingsWindow = useCallback(() => getBookingWindowDates(pastWeeksVisible, futureWeeksVisible), [pastWeeksVisible, futureWeeksVisible])

  const apiFetch = useCallback(async (path, options = {}) => {
    const requestHeaders = {
      ...(options.headers || {}),
    }

    if (sessionToken) {
      requestHeaders['X-Admin-Session'] = sessionToken
    }

    const response = await fetch(`${baseUrl}${path}`, {
      credentials: 'include',
      ...options,
      headers: requestHeaders,
    })

    let data = null
    try {
      data = await response.json()
    } catch {
      data = null
    }

    if (!response.ok || !data?.ok) {
      const message = data?.message || `Request failed (HTTP ${response.status}).`
      const error = new Error(message)
      error.status = response.status
      error.details = data?.details || {}
      throw error
    }

    return data
  }, [baseUrl, sessionToken])

  const refreshSession = useCallback(async () => {
    setSessionLoading(true)
    try {
      const data = await apiFetch('/auth/me.php')
      setUser(data.user)
    } catch {
      setUser(null)
    } finally {
      setSessionLoading(false)
    }
  }, [apiFetch])

  const loadBookings = useCallback(async ({ q = '', windowFrom = '', windowTo = '', driverUserId = '' } = {}) => {
    if (!user) return

    setBookingsLoading(true)
    try {
      const fallbackWindow = getBookingWindowDates(DEFAULT_PAST_WEEKS, DEFAULT_FUTURE_WEEKS)
      const query = new URLSearchParams({
        limit: String(PAGE_SIZE),
      })
      // Only send date window when not doing a text search
      if (!q.trim()) {
        query.set('from', windowFrom || fallbackWindow.from)
        query.set('to', windowTo || fallbackWindow.to)
      }
      if (q.trim()) {
        query.set('q', q.trim())
      }
      if (String(driverUserId || '').trim()) {
        query.set('driver_user_id', String(driverUserId).trim())
      }

      const data = await apiFetch(`/bookings/list.php?${query.toString()}`)
      const items = data.items || []
      setBookings(items)
      setBookingWindowCounts({
        pastCount: data.window?.pastCount ?? 0,
        futureCount: data.window?.futureCount ?? 0,
      })
      setSearchError('')
      return items
    } catch (error) {
      const errorMessage = error.message || 'Could not load bookings.'
      if (q.trim()) {
        setSearchError(errorMessage)
      } else {
        setBanner({ type: 'error', message: errorMessage })
      }
      return []
    } finally {
      setBookingsLoading(false)
    }
  }, [apiFetch, user])

  const loadUsers = useCallback(async () => {
    if (!isAdmin) return

    setUsersLoading(true)
    try {
      const data = await apiFetch('/users/list.php')
      setUsers(data.items || [])
    } catch (error) {
      setBanner({ type: 'error', message: error.message || 'Could not load users.' })
    } finally {
      setUsersLoading(false)
    }
  }, [apiFetch, isAdmin])

  const loadAssignableUsers = useCallback(async () => {
    if (!user) return

    try {
      const data = await apiFetch('/users/options.php')
      setAssignableUsers(data.items || [])
    } catch (error) {
      setBanner({ type: 'error', message: error.message || 'Could not load Driver options.' })
    }
  }, [apiFetch, user])

  const loadDriverMappings = useCallback(async (bookingId) => {
    if (!user || !bookingId) {
      setDriverMappings([])
      setMyDriverMappingDraft('')
      setAdminConfirmUserIdDraft('')
      return
    }

    setDriverMappingsLoading(true)
    try {
      const data = await apiFetch(`/bookings/driver-mappings/get.php?booking_id=${encodeURIComponent(String(bookingId))}`)
      const mappings = data.mappings || []
      setDriverMappings(mappings)
      const selfMapping = mappings.find((item) => String(item.user_id) === String(user.id))
      setMyDriverMappingDraft(String(selfMapping?.mapping_status || ''))
      setAdminConfirmUserIdDraft(data.driverUserId !== null && data.driverUserId !== undefined ? String(data.driverUserId) : '')
    } catch (error) {
      setDriverMappings([])
      setMyDriverMappingDraft('')
      setAdminConfirmUserIdDraft('')
      setBanner({ type: 'error', message: error.message || 'Could not load driver availability right now.' })
    } finally {
      setDriverMappingsLoading(false)
    }
  }, [apiFetch, user])

  const loadBookingDetail = useCallback(async (id, bookingReferenceHint = '', { historyMode = 'none', detailTab = 'main' } = {}) => {
    if (!id) return

    const normalizedHint = String(bookingReferenceHint || '').trim()
    const normalizedDetailTab = resolveBookingDetailTab(detailTab)
    if (normalizedHint && historyMode !== 'none') {
      updateBookingReferenceInUrl(normalizedHint, { replace: historyMode === 'replace', detailTab: normalizedDetailTab })
    }

    setSelectedBookingId(String(id))
    setBookingForm(null)
    setBookingDetailTab(normalizedDetailTab)
    setDriverMappings([])
    setMyDriverMappingDraft('')
    setAdminConfirmUserIdDraft('')
    setBookingDetailLoading(true)
    try {
      const data = await apiFetch(`/bookings/get.php?id=${encodeURIComponent(id)}`)
      const nextBookingForm = mapBookingToForm(data.item)
      setBookingForm(nextBookingForm)
      if (historyMode !== 'none') {
        updateBookingReferenceInUrl(nextBookingForm?.bookingRef || normalizedHint, { replace: historyMode === 'replace', detailTab: normalizedDetailTab })
      }
      await loadDriverMappings(id)
    } catch (error) {
      setSelectedBookingId('')
      setBanner({ type: 'error', message: error.message || 'Could not load booking details.' })
    } finally {
      setBookingDetailLoading(false)
    }
  }, [apiFetch, loadDriverMappings, resolveBookingDetailTab])

  const openBookingByReference = useCallback(async (reference, { historyMode = 'replace', detailTab = 'main' } = {}) => {
    const normalizedReference = String(reference || '').trim()
    const normalizedDetailTab = resolveBookingDetailTab(detailTab)
    if (!user || !normalizedReference) {
      return
    }

    setActiveTab('bookings')
    setHasExecutedSearch(true)
    setSearchInput(normalizedReference)
    setSearchTerm(normalizedReference)
    setSearchError('')
    setSelectedBookingId('')
    setBookingForm(null)

    const window = getBookingWindowDates(pastWeeksVisible, futureWeeksVisible)
    const items = await loadBookings({ q: normalizedReference, windowFrom: window.from, windowTo: window.to })
    const normalizedReferenceLower = normalizedReference.toLowerCase()
    const exactMatch = items.find((item) => String(item.booking_ref || '').trim().toLowerCase() === normalizedReferenceLower)

    if (exactMatch) {
      await loadBookingDetail(exactMatch.id, exactMatch.booking_ref, { historyMode, detailTab: normalizedDetailTab })
      return
    }

    updateBookingReferenceInUrl(normalizedReference, { replace: historyMode === 'replace', detailTab: normalizedDetailTab })
  }, [futureWeeksVisible, loadBookingDetail, loadBookings, pastWeeksVisible, resolveBookingDetailTab, user])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const storedToken = window.localStorage.getItem('eddie_admin_session_token') || ''
    if (storedToken) {
      setSessionToken(storedToken)
    }
  }, [])

  useEffect(() => {
    refreshSession()
  }, [refreshSession])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const deepLinkState = getBookingDeepLinkStateFromLocation()
    if (deepLinkState.reference && deepLinkState.reference !== pendingDeepLinkReference) {
      setPendingDeepLinkReference(deepLinkState.reference)
    }
    if (deepLinkState.detailTab !== pendingDeepLinkDetailTab) {
      setPendingDeepLinkDetailTab(deepLinkState.detailTab)
    }
  }, [pendingDeepLinkDetailTab, pendingDeepLinkReference])

  useEffect(() => {
    if (!user) {
      setBookings([])
      setBookingForm(null)
      setSelectedBookingId('')
      setDriverMappings([])
      setMyDriverMappingDraft('')
      setAdminConfirmUserIdDraft('')
      return
    }

    const window = getBookingWindowDates(DEFAULT_PAST_WEEKS, DEFAULT_FUTURE_WEEKS)
    loadBookings({ q: '', windowFrom: window.from, windowTo: window.to, driverUserId: myBookingsDriverUserId })
  }, [user, loadBookings, myBookingsDriverUserId])

  useEffect(() => {
    if (!user || !isAdmin) {
      setUsers([])
      return
    }

    loadUsers()
  }, [user, isAdmin, loadUsers])

  useEffect(() => {
    if (!user) {
      setAssignableUsers([])
      return
    }

    loadAssignableUsers()
  }, [user, loadAssignableUsers])

  useEffect(() => {
    setAccountForm({
      displayName: String(user?.displayName || ''),
      email: String(user?.email || ''),
      phoneNumber: String(user?.phoneNumber || ''),
      currentPassword: '',
      newPassword: '',
    })
  }, [user])

  useEffect(() => {
    if (!selectedUserProfileId) {
      return
    }

    const selectedUser = users.find((item) => String(item.id) === String(selectedUserProfileId))
    if (!selectedUser) {
      return
    }

    setSelectedUserProfileDraft({
      username: String(selectedUser.username || ''),
      displayName: String(selectedUser.display_name || ''),
      role: String(selectedUser.role || 'viewer'),
      email: String(selectedUser.email || ''),
      phoneNumber: String(selectedUser.phone_number || ''),
    })
  }, [users, selectedUserProfileId])

  useEffect(() => {
    if (banner.type === 'idle') {
      return undefined
    }

    const timeoutId = window.setTimeout(() => {
      setBanner({ type: 'idle', message: '' })
    }, 5000)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [banner])

  useEffect(() => {
    return () => {
      if (copyFeedbackTimerRef.current) {
        window.clearTimeout(copyFeedbackTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    setMyDriverMappingDraft(currentUserDriverMappingStatus)
  }, [currentUserDriverMappingStatus])

  useEffect(() => {
    if (!isAdmin) return
    if (adminConfirmUserIdDraft) return
    if (bookingForm?.driverUserId) {
      setAdminConfirmUserIdDraft(String(bookingForm.driverUserId))
      return
    }
    if (assignableUsers.length > 0) {
      setAdminConfirmUserIdDraft(String(assignableUsers[0].id))
    }
  }, [isAdmin, adminConfirmUserIdDraft, bookingForm, assignableUsers])

  useEffect(() => {
    if (!user || (!isBookingsTab && !isMyBookingsTab) || (isBookingsTab && searchTerm.trim() !== '')) {
      return undefined
    }

    const pollBookings = async () => {
      try {
        const window = getCurrentBookingsWindow()
        const query = new URLSearchParams({
          limit: String(PAGE_SIZE),
          from: window.from,
          to: window.to,
        })
        if (isMyBookingsTab && myBookingsDriverUserId) {
          query.set('driver_user_id', myBookingsDriverUserId)
        }
        const data = await apiFetch(`/bookings/list.php?${query.toString()}`)
        setBookings(data.items || [])
      } catch {
        // Silently fail polling to avoid spamming errors
      }
    }

    const intervalId = window.setInterval(pollBookings, 30000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [isBookingsTab, isMyBookingsTab, searchTerm, user, apiFetch, getCurrentBookingsWindow, myBookingsDriverUserId])

  useEffect(() => {
    if (!user || !pendingDeepLinkReference) {
      return
    }

    void openBookingByReference(pendingDeepLinkReference, { historyMode: 'replace', detailTab: pendingDeepLinkDetailTab })
  }, [openBookingByReference, pendingDeepLinkDetailTab, pendingDeepLinkReference, user])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const handlePopState = () => {
      const deepLinkState = getBookingDeepLinkStateFromLocation()
      const nextReference = deepLinkState.reference
      if (!nextReference) {
        setPendingDeepLinkReference('')
        setPendingDeepLinkDetailTab('main')
        setSelectedBookingId('')
        setBookingForm(null)
        setBookingDetailTab('main')
        setDriverMappings([])
        setMyDriverMappingDraft('')
        setAdminConfirmUserIdDraft('')
        setBookingDetailLoading(false)
        setActiveTab('bookings')
        return
      }

      setPendingDeepLinkReference(nextReference)
      setPendingDeepLinkDetailTab(deepLinkState.detailTab)
      if (user) {
        void openBookingByReference(nextReference, { historyMode: 'none', detailTab: deepLinkState.detailTab })
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [openBookingByReference, user])

  async function handleLoginSubmit(event) {
    event.preventDefault()
    setLoginLoading(true)
    setBanner({ type: 'idle', message: '' })

    try {
      const data = await apiFetch('/auth/login.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: loginForm.username,
          password: loginForm.password,
        }),
      })

      const nextToken = String(data.sessionToken || '')
      setSessionToken(nextToken)
      if (typeof window !== 'undefined') {
        if (nextToken) {
          window.localStorage.setItem('eddie_admin_session_token', nextToken)
        } else {
          window.localStorage.removeItem('eddie_admin_session_token')
        }
      }

      setUser(data.user)
      setLoginForm({ username: '', password: '' })
      setBanner({ type: 'idle', message: '' })
    } catch (error) {
      setBanner({ type: 'error', message: error.message || 'Login failed.' })
    } finally {
      setLoginLoading(false)
    }
  }

  async function handleLogout() {
    try {
      await apiFetch('/auth/logout.php', { method: 'POST' })
    } catch {
      // Cookie should still be cleared client-side by refresh fallback.
    }

    setSessionToken('')
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('eddie_admin_session_token')
    }
    setUser(null)
    setBookings([])
    setUsers([])
    setSelectedUserProfileId('')
    setSelectedUserProfileDraft({ username: '', displayName: '', role: 'viewer', email: '', phoneNumber: '' })
    setAccountForm({ displayName: '', email: '', phoneNumber: '', currentPassword: '', newPassword: '' })
    setBookingForm(null)
    setSelectedBookingId('')
    setDriverMappings([])
    setMyDriverMappingDraft('')
    setAdminConfirmUserIdDraft('')
    setActiveTab('bookings')
    setBanner({ type: 'success', message: 'You have been signed out.' })
  }

  async function handleSearchSubmit(event) {
    event.preventDefault()
    const trimmed = searchInput.trim()
    const window = getBookingWindowDates(pastWeeksVisible, futureWeeksVisible)

    updateBookingReferenceInUrl('', { replace: true })
    setPendingDeepLinkReference('')
    setHasExecutedSearch(true)
    setSearchTerm(trimmed)
    setSelectedBookingId('')
    setBookingForm(null)
    await loadBookings({ q: trimmed, windowFrom: window.from, windowTo: window.to })
  }

  async function handleClearSearch() {
    const window = getBookingWindowDates(pastWeeksVisible, futureWeeksVisible)

    updateBookingReferenceInUrl('', { replace: true })
    setPendingDeepLinkReference('')
    setSearchInput('')
    setSearchTerm('')
    setHasExecutedSearch(false)
    setSearchError('')
    setSelectedBookingId('')
    setBookingForm(null)
    await loadBookings({ q: '', windowFrom: window.from, windowTo: window.to })
  }

  async function handleShowMorePast() {
    const nextPastWeeks = pastWeeksVisible + 8
    const window = getBookingWindowDates(nextPastWeeks, futureWeeksVisible)

    setPastWeeksVisible(nextPastWeeks)
    await loadBookings({ q: isBookingsTab ? searchTerm : '', windowFrom: window.from, windowTo: window.to, driverUserId: isMyBookingsTab ? myBookingsDriverUserId : '' })
  }

  async function handleShowMoreFuture() {
    const nextFutureWeeks = futureWeeksVisible + 8
    const window = getBookingWindowDates(pastWeeksVisible, nextFutureWeeks)

    setFutureWeeksVisible(nextFutureWeeks)
    await loadBookings({ q: isBookingsTab ? searchTerm : '', windowFrom: window.from, windowTo: window.to, driverUserId: isMyBookingsTab ? myBookingsDriverUserId : '' })
  }

  async function handleResetWindow() {
    const window = getBookingWindowDates(DEFAULT_PAST_WEEKS, DEFAULT_FUTURE_WEEKS)

    setPastWeeksVisible(DEFAULT_PAST_WEEKS)
    setFutureWeeksVisible(DEFAULT_FUTURE_WEEKS)
    await loadBookings({ q: isBookingsTab ? searchTerm : '', windowFrom: window.from, windowTo: window.to, driverUserId: isMyBookingsTab ? myBookingsDriverUserId : '' })
  }

  function handleMyBookingsTabClick() {
    updateBookingReferenceInUrl('', { replace: true })
    setPendingDeepLinkReference('')
    const driverUserId = user?.id !== undefined && user?.id !== null ? String(user.id) : ''
    setIsMobileMenuOpen(false)
    setActiveTab('my-bookings')
    setHasExecutedSearch(false)
    setSearchInput('')
    setSearchTerm('')
    setSearchError('')
    setSelectedBookingId('')
    setBookingForm(null)
    const window = getBookingWindowDates(pastWeeksVisible, futureWeeksVisible)
    void loadBookings({ q: '', windowFrom: window.from, windowTo: window.to, driverUserId })
  }

  function handleBookingsTabClick() {
    updateBookingReferenceInUrl('', { replace: true })
    setPendingDeepLinkReference('')
    setIsMobileMenuOpen(false)
    setActiveTab('bookings')
    setHasExecutedSearch(false)
    setSearchError('')
    setSelectedBookingId('')
    setBookingForm(null)
    const window = getBookingWindowDates(pastWeeksVisible, futureWeeksVisible)
    void loadBookings({ q: '', windowFrom: window.from, windowTo: window.to })
  }

  function handleBookingFieldChange(name, value) {
    setBookingForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  function handleBookingDetailTabChange(nextTab) {
    const normalizedTab = resolveBookingDetailTab(nextTab)
    setBookingDetailTab(normalizedTab)

    const activeBookingRef = String(bookingForm?.bookingRef || '').trim()
    if (activeBookingRef) {
      updateBookingReferenceInUrl(activeBookingRef, { replace: true, detailTab: normalizedTab })
    }
  }

  async function handleBookingSave(event) {
    event.preventDefault()
    if (!bookingForm || !isAdmin) return

    if (normalizeBookingStatus(bookingForm.status) !== 'pending' && isDriverUnassigned(bookingForm.driverUserId)) {
      setBanner({ type: 'error', message: 'Assign a driver before moving a booking beyond Pending.' })
      return
    }

    setBookingSaveLoading(true)
    setBanner({ type: 'idle', message: '' })

    try {
      await apiFetch('/bookings/update.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingForm),
      })

      const window = getBookingWindowDates(pastWeeksVisible, futureWeeksVisible)
      setBanner({ type: 'success', message: 'Booking updated successfully.' })
      await loadBookings({ q: searchTerm, windowFrom: window.from, windowTo: window.to })
      await loadBookingDetail(bookingForm.id, bookingForm.bookingRef, { historyMode: 'replace', detailTab: bookingDetailTab })
    } catch (error) {
      setBanner({ type: 'error', message: error.message || 'Could not update booking.' })
    } finally {
      setBookingSaveLoading(false)
    }
  }

  async function handleUpdateDriverMapping(mappingStatus, targetUserId = '') {
    if (!bookingForm?.id || !user?.id) return

    setDriverMappingsSaveLoading(true)
    setBanner({ type: 'idle', message: '' })

    try {
      await apiFetch('/bookings/driver-mappings/update.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: bookingForm.id,
          userId: targetUserId || user.id,
          mappingStatus,
        }),
      })

      await loadDriverMappings(bookingForm.id)
      const window = getBookingWindowDates(pastWeeksVisible, futureWeeksVisible)
      await loadBookings({
        q: isBookingsTab ? searchTerm : '',
        windowFrom: window.from,
        windowTo: window.to,
        driverUserId: isMyBookingsTab ? myBookingsDriverUserId : '',
      })
      await loadBookingDetail(bookingForm.id, bookingForm.bookingRef, { historyMode: 'replace', detailTab: bookingDetailTab })

      const baseMessage = mappingStatus === 'confirmed'
        ? 'Driver confirmed for booking.'
        : 'Your availability has been updated.'
      setBanner({ type: 'success', message: baseMessage })
    } catch (error) {
      setBanner({ type: 'error', message: error.message || 'Could not update availability right now.' })
    } finally {
      setDriverMappingsSaveLoading(false)
    }
  }

  async function handleChecklistSave() {
    if (!bookingForm || !canEditChecklist) return

    setChecklistSaveLoading(true)
    setBanner({ type: 'idle', message: '' })

    try {
      await apiFetch('/bookings/update-checklist.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: bookingForm.id,
          startMileage: bookingForm.startMileage,
          finishMileage: bookingForm.finishMileage,
          nonBillableMileage: bookingForm.nonBillableMileage,
          checklistLightsIndicators: bookingForm.checklistLightsIndicators,
          checklistTyres: bookingForm.checklistTyres,
          checklistWheelNuts: bookingForm.checklistWheelNuts,
          checklistBodywork: bookingForm.checklistBodywork,
          checklistMirrorsGlass: bookingForm.checklistMirrorsGlass,
          checklistBrakes: bookingForm.checklistBrakes,
          checklistSteering: bookingForm.checklistSteering,
          checklistWipersWashers: bookingForm.checklistWipersWashers,
          checklistDashboardWarningLights: bookingForm.checklistDashboardWarningLights,
          checklistSeatsSeatbelts: bookingForm.checklistSeatsSeatbelts,
          checklistEmergencyEquipment: bookingForm.checklistEmergencyEquipment,
          checklistWheelchairLiftsRestraints: bookingForm.checklistWheelchairLiftsRestraints,
          checklistTailLifts: bookingForm.checklistTailLifts,
          vehicleCheckDate: bookingForm.vehicleCheckDate,
          vehicleCheckSignedBy: bookingForm.vehicleCheckSignedBy,
          vehicleFaultsRecorded: bookingForm.vehicleFaultsRecorded,
        }),
      })

      setBanner({ type: 'success', message: 'Checklist saved successfully.' })
      await loadBookingDetail(bookingForm.id, bookingForm.bookingRef, { historyMode: 'replace', detailTab: bookingDetailTab })
    } catch (error) {
      setBanner({ type: 'error', message: error.message || 'Could not save checklist.' })
    } finally {
      setChecklistSaveLoading(false)
    }
  }

  async function handleBookingDelete() {
    if (!bookingForm || !isAdmin) return

    const confirmed = window.confirm('Delete this booking permanently? This cannot be undone.')
    if (!confirmed) return

    setBookingDeleteLoading(true)
    setBanner({ type: 'idle', message: '' })

    try {
      await apiFetch('/bookings/delete.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: bookingForm.id }),
      })

      setBookings((current) => current.filter((item) => String(item.id) !== String(bookingForm.id)))
      setBookingForm(null)
      setSelectedBookingId('')
      setBanner({ type: 'success', message: 'Booking deleted successfully.' })
    } catch (error) {
      setBanner({ type: 'error', message: error.message || 'Could not delete booking.' })
    } finally {
      setBookingDeleteLoading(false)
    }
  }

  async function handleCreateUser(event) {
    event.preventDefault()
    if (!isAdmin) return

    setNewUserLoading(true)
    setBanner({ type: 'idle', message: '' })

    try {
      await apiFetch('/users/create.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUserForm),
      })

      setNewUserForm({ username: '', displayName: '', email: '', phoneNumber: '', role: 'viewer', password: '' })
      setShowCreateUserForm(false)
      setBanner({ type: 'success', message: 'User created successfully.' })
      await loadUsers()
    } catch (error) {
      setBanner({ type: 'error', message: error.message || 'Could not create user.' })
    } finally {
      setNewUserLoading(false)
    }
  }

  function handleOpenUserProfile(userId) {
    const selectedUser = users.find((item) => String(item.id) === String(userId))
    if (!selectedUser) return

    setSelectedUserProfileId(String(userId))
    setSelectedUserProfileDraft({
      username: String(selectedUser.username || ''),
      displayName: String(selectedUser.display_name || ''),
      role: String(selectedUser.role || 'viewer'),
      email: String(selectedUser.email || ''),
      phoneNumber: String(selectedUser.phone_number || ''),
    })
    setActiveTab('user-profile')
    setBanner({ type: 'idle', message: '' })
  }

  function handleCloseUserProfile() {
    setSelectedUserProfileId('')
    setSelectedUserProfileDraft({ username: '', displayName: '', role: 'viewer', email: '', phoneNumber: '' })
    setActiveTab('users')
  }

  async function handleUpdateSelectedUserProfile(event) {
    event.preventDefault()
    if (!isAdmin || !selectedUserProfileId) return

    setUserProfileSaving(true)
    setBanner({ type: 'idle', message: '' })

    try {
      await apiFetch('/users/update.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedUserProfileId,
          username: selectedUserProfileDraft.username,
          displayName: selectedUserProfileDraft.displayName,
          role: selectedUserProfileDraft.role,
          email: selectedUserProfileDraft.email,
          phoneNumber: selectedUserProfileDraft.phoneNumber,
        }),
      })

      setBanner({ type: 'success', message: 'User profile updated successfully.' })
      await loadUsers()
      if (String(user?.id) === String(selectedUserProfileId)) {
        await refreshSession()
      }
    } catch (error) {
      setBanner({ type: 'error', message: error.message || 'Could not update user profile.' })
    } finally {
      setUserProfileSaving(false)
    }
  }

  async function handleUpdateAccount(event) {
    event.preventDefault()
    if (!user) return

    setAccountSaving(true)
    setBanner({ type: 'idle', message: '' })

    try {
      await apiFetch('/users/update.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: user.id,
          username: user.username,
          role: user.role,
          displayName: accountForm.displayName,
          email: accountForm.email,
          phoneNumber: accountForm.phoneNumber,
        }),
      })

      setBanner({ type: 'success', message: 'Account details updated successfully.' })
      await refreshSession()
    } catch (error) {
      setBanner({ type: 'error', message: error.message || 'Could not update your account details.' })
    } finally {
      setAccountSaving(false)
    }
  }

  async function handleResetUserPassword(userId) {
    if (!isAdmin) return

    setUserResetLoading(true)
    setBanner({ type: 'idle', message: '' })

    try {
      const data = await apiFetch('/users/reset-password.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId }),
      })

      const tempPassword = data.temporaryPassword || ''
      const targetUser = users.find((item) => String(item.id) === String(userId))
      setResetPasswordResult({
        userId: String(userId),
        username: targetUser?.username || 'User',
        temporaryPassword: tempPassword,
      })
      setBanner({ type: 'success', message: 'Password reset successfully.' })
    } catch (error) {
      setBanner({ type: 'error', message: error.message || 'Could not reset password.' })
    } finally {
      setUserResetLoading(false)
    }
  }

  async function handleCopyTemporaryPassword() {
    if (!resetPasswordResult?.temporaryPassword) return

    try {
      const copyText = `Your username is ${resetPasswordResult.username} and your password is ${resetPasswordResult.temporaryPassword}`
      await navigator.clipboard.writeText(copyText)
      setBanner({ type: 'success', message: 'Login credentials copied to clipboard.' })
      flashCopyFeedback('temporary-password')
    } catch {
      setBanner({ type: 'error', message: 'Could not copy the login credentials.' })
    }
  }

  function flashCopyFeedback(key) {
    if (copyFeedbackTimerRef.current) {
      window.clearTimeout(copyFeedbackTimerRef.current)
    }

    setCopyFeedbackKey(key)
    copyFeedbackTimerRef.current = window.setTimeout(() => {
      setCopyFeedbackKey('')
      copyFeedbackTimerRef.current = null
    }, 1400)
  }

  async function handleDeleteUser(userId, userLabel) {
    if (!isAdmin) return

    const confirmed = window.confirm(`Delete user ${userLabel}? This cannot be undone.`)
    if (!confirmed) return

    setUserDeleteLoading(true)
    setBanner({ type: 'idle', message: '' })

    try {
      await apiFetch('/users/delete.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId }),
      })

      setBanner({ type: 'success', message: 'User deleted successfully.' })
      await loadUsers()
      if (String(selectedUserProfileId) === String(userId)) {
        handleCloseUserProfile()
      }
    } catch (error) {
      setBanner({ type: 'error', message: error.message || 'Could not delete user.' })
    } finally {
      setUserDeleteLoading(false)
    }
  }

  if (sessionLoading) {
    return (
      <main className="admin-shell">
        <section className="admin-auth-card">
          <p>Loading admin portal...</p>
        </section>
      </main>
    )
  }

  if (!user) {
    return (
      <main className="admin-shell">
        <section className="admin-auth-card">
          <h1>Admin sign in</h1>
          <p>Use your admin portal username and password to continue.</p>

          {banner.type === 'error' && (
            <p className="admin-banner admin-banner-error" role="alert">{banner.message}</p>
          )}

          <form className="admin-form" onSubmit={handleLoginSubmit}>
            <label>
              <span>Username</span>
              <input
                type="text"
                value={loginForm.username}
                onChange={(event) => setLoginForm((current) => ({ ...current, username: event.target.value }))}
                autoComplete="username"
                required
              />
            </label>
            <label>
              <span>Password</span>
              <input
                type="password"
                value={loginForm.password}
                onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))}
                autoComplete="current-password"
                required
              />
            </label>
            <button className="button button-primary" type="submit" disabled={loginLoading}>
              <FontAwesomeIcon icon={faRightToBracket} aria-hidden="true" />
              {loginLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p>
            Forgot your password? <Link href="/admin/forgot-password/">Request a reset</Link>
          </p>

          <div className="admin-inline-actions">
            <Link className="button button-quiet" href="/">
              <FontAwesomeIcon icon={faArrowLeft} aria-hidden="true" />
              Back to main site
            </Link>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="admin-shell">
      <section className="admin-panel">
        <header className="admin-topbar">
          <div className="admin-brand-block">
            <Link className="admin-brand" href="/" aria-label="The EDDIE Bus home">
              <img src="/logo.png" alt="The EDDIE Bus logo" />
            </Link>
            <div>
              <h1>Admin Portal</h1>
              <p>Welcome {formatDisplayText(user?.displayName, user?.username || 'there')}</p>
            </div>
          </div>

          <button
            className="button button-quiet admin-mobile-menu-toggle"
            type="button"
            aria-expanded={isMobileMenuOpen}
            aria-controls="admin-mobile-nav"
            aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            onClick={() => setIsMobileMenuOpen((current) => !current)}
          >
            <FontAwesomeIcon icon={faBars} aria-hidden="true" />
            <span className="admin-mobile-menu-label">Menu</span>
          </button>

          <div className="admin-topbar-actions">
            <Link className="button button-quiet" href="/">
              <FontAwesomeIcon icon={faArrowUpRightFromSquare} aria-hidden="true" />
              Back To Main Site
            </Link>
            {isAdmin && (
              <Link className="button button-quiet" href="/bookings/request">
                <FontAwesomeIcon icon={faPlus} aria-hidden="true" />
                Create Booking
              </Link>
            )}
            <button className="button button-quiet" type="button" onClick={handleLogout}>
              <FontAwesomeIcon icon={faRightFromBracket} aria-hidden="true" />
              Sign Out
            </button>
          </div>
        </header>

        <section id="admin-mobile-nav" className={`admin-mobile-nav ${isMobileMenuOpen ? 'is-open' : ''}`} aria-label="Admin mobile navigation">
          <div className="admin-mobile-nav-group">
            <button
              type="button"
              className={`button button-quiet admin-mobile-tab-button ${isBookingsTab ? 'is-active' : ''}`}
              onClick={handleBookingsTabClick}
            >
              <FontAwesomeIcon icon={faCalendarCheck} aria-hidden="true" />
              All Bookings
            </button>
            <button
              type="button"
              className={`button button-quiet admin-mobile-tab-button ${isMyBookingsTab ? 'is-active' : ''}`}
              onClick={handleMyBookingsTabClick}
            >
              <FontAwesomeIcon icon={faCalendarCheck} aria-hidden="true" />
              My Bookings
            </button>
            {isAdmin && (
              <button
                type="button"
                className={`button button-quiet admin-mobile-tab-button ${activeTab === 'users' ? 'is-active' : ''}`}
                onClick={() => {
                  setActiveTab('users')
                  setIsMobileMenuOpen(false)
                }}
              >
                <FontAwesomeIcon icon={faUsers} aria-hidden="true" />
                Users
              </button>
            )}
            <button
              type="button"
              className={`button button-quiet admin-mobile-tab-button ${activeTab === 'account' ? 'is-active' : ''}`}
              onClick={() => {
                setActiveTab('account')
                setIsMobileMenuOpen(false)
              }}
            >
              <FontAwesomeIcon icon={faUser} aria-hidden="true" />
              My Account
            </button>
          </div>

          <div className="admin-mobile-nav-group">
            <Link className="button button-quiet" href="/" onClick={() => setIsMobileMenuOpen(false)}>
              <FontAwesomeIcon icon={faArrowUpRightFromSquare} aria-hidden="true" />
              Back To Main Site
            </Link>
            {isAdmin && (
              <Link className="button button-quiet" href="/bookings/request" onClick={() => setIsMobileMenuOpen(false)}>
                <FontAwesomeIcon icon={faPlus} aria-hidden="true" />
                Create Booking
              </Link>
            )}
            <button
              className="button button-quiet"
              type="button"
              onClick={() => {
                setIsMobileMenuOpen(false)
                void handleLogout()
              }}
            >
              <FontAwesomeIcon icon={faRightFromBracket} aria-hidden="true" />
              Sign Out
            </button>
          </div>
        </section>

        <nav className="admin-tabs" aria-label="Admin sections" role="tablist">
          <button type="button" role="tab" aria-selected={isBookingsTab} className={isBookingsTab ? 'is-active' : ''} onClick={handleBookingsTabClick}>
            <FontAwesomeIcon icon={faCalendarCheck} aria-hidden="true" />
            All Bookings
          </button>
          <button type="button" role="tab" aria-selected={isMyBookingsTab} className={isMyBookingsTab ? 'is-active' : ''} onClick={handleMyBookingsTabClick}>
            <FontAwesomeIcon icon={faCalendarCheck} aria-hidden="true" />
            My Bookings
          </button>
          {isAdmin && (
            <button type="button" role="tab" aria-selected={activeTab === 'users'} className={activeTab === 'users' ? 'is-active' : ''} onClick={() => setActiveTab('users')}>
              <FontAwesomeIcon icon={faUsers} aria-hidden="true" />
              Users
            </button>
          )}
          <button type="button" role="tab" aria-selected={activeTab === 'account'} className={activeTab === 'account' ? 'is-active' : ''} onClick={() => setActiveTab('account')}>
            <FontAwesomeIcon icon={faUser} aria-hidden="true" />
            My Account
          </button>
        </nav>

        {(isBookingsTab || isMyBookingsTab) && (
          <section className="admin-section" aria-label="Booking management">
            <div className="admin-section-heading">
              <div>
                <h2>{selectedBookingId
                  ? `${formatDisplayText(bookingForm?.organisation, 'Organisation')} to ${formatDisplayText(bookingForm?.destinationName, 'Destination')} on ${formatDisplayText(formatDateShortNoYearUK(bookingForm?.bookingDate), 'Date not provided')}`
                  : (isMyBookingsTab ? 'My Bookings' : 'All Bookings')}
                </h2>
                {selectedBookingId ? (
                  <p>Booking reference: {formatDisplayText(bookingForm?.bookingRef, 'Not provided')}</p>
                ) : isMyBookingsTab ? (
                  <p>Bookings assigned to {preferredUserLabel(user, 'you')}.</p>
                ) : (
                  <p>All bookings, future and past.</p>
                )}
              </div>
            </div>

            {!selectedBookingId && (
              <>
            {isBookingsTab && (
              <>
                <form className="admin-search" onSubmit={handleSearchSubmit}>
                  <input
                    type="search"
                    placeholder="Search all booking fields"
                    value={searchInput}
                    onChange={(event) => {
                      const nextValue = event.target.value
                      setSearchInput(nextValue)
                      if (searchError) {
                        setSearchError('')
                      }
                      if (hasExecutedSearch && nextValue.trim() === '') {
                        void handleClearSearch()
                      }
                    }}
                  />
                  <button className="button button-primary" type="submit" disabled={bookingsLoading}>
                    <FontAwesomeIcon icon={faMagnifyingGlass} aria-hidden="true" />
                    Search
                  </button>
                </form>
                {searchError && (
                  <p className="admin-search-error" role="alert">{searchError}</p>
                )}
              </>
            )}

            <div className="admin-window-bar">
              <span className="admin-window-label" aria-live="polite">
                {isBookingsTab && hasExecutedSearch
                  ? <>Showing {bookings.length} booking{bookings.length !== 1 ? 's' : ''} for: <strong>{searchTerm}</strong></>
                  : (() => {
                      const { from, to } = getBookingWindowDates(pastWeeksVisible, futureWeeksVisible)
                      return `Showing ${bookings.length} booking${bookings.length !== 1 ? 's' : ''} between ${formatDateWords(from)} and ${formatDateWords(to)}`
                    })()
                }
                {!isBookingsTab && (pastWeeksVisible !== DEFAULT_PAST_WEEKS || futureWeeksVisible !== DEFAULT_FUTURE_WEEKS) && (
                  <button
                    className="button button-quiet admin-window-reset"
                    type="button"
                    disabled={bookingsLoading}
                    onClick={handleResetWindow}
                  >
                    <FontAwesomeIcon icon={faRotateLeft} aria-hidden="true" />
                    Reset to default view
                  </button>
                )}
                {isBookingsTab && !hasExecutedSearch && (pastWeeksVisible !== DEFAULT_PAST_WEEKS || futureWeeksVisible !== DEFAULT_FUTURE_WEEKS) && (
                  <button
                    className="button button-quiet admin-window-reset"
                    type="button"
                    disabled={bookingsLoading}
                    onClick={handleResetWindow}
                  >
                    <FontAwesomeIcon icon={faRotateLeft} aria-hidden="true" />
                    Reset to default view
                  </button>
                )}
              </span>
                {isBookingsTab && hasExecutedSearch && (
                  <button
                    className="button button-quiet admin-search-reset"
                    type="button"
                    onClick={handleClearSearch}
                    disabled={bookingsLoading}
                  >
                    <FontAwesomeIcon icon={faXmark} aria-hidden="true" />
                    Clear search
                  </button>
                )}
              </div>

            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Date / Pickup time</th>
                    <th>Organisation</th>
                    <th>Destination</th>
                    <th>Driver</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(isBookingsTab || isMyBookingsTab) && bookingWindowCounts.futureCount > 0 && (
                    <tr className="admin-table-hint-row">
                      <td colSpan={5}>
                        <div className="admin-table-hint-content">
                          <span>{bookingWindowCounts.futureCount} more future booking{bookingWindowCounts.futureCount !== 1 ? 's' : ''} not shown</span>
                          <button
                            className="button button-quiet admin-window-btn"
                            type="button"
                            disabled={bookingsLoading}
                            onClick={handleShowMoreFuture}
                          >
                            Show more future bookings
                            <FontAwesomeIcon icon={faArrowRight} aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                  {bookings.map((item) => (
                    <tr
                      key={item.id}
                      className={[
                        String(selectedBookingId) === String(item.id) ? 'is-selected' : '',
                        item.driver_name ? '' : 'is-missing-driver',
                      ].filter(Boolean).join(' ')}
                      onClick={() => loadBookingDetail(item.id, item.booking_ref, { historyMode: 'push' })}
                    >
                      <td>{formatBookingDateAndTime(item.booking_date, item.pickup_time)}</td>
                      <td>{item.organisation}</td>
                      <td>{item.destination_name}</td>
                      <td>
                        {item.driver_name ? item.driver_name : <strong>Unassigned</strong>}
                      </td>
                      <td>
                        <div>{formatBookingStatusLabel(item.status)}</div>
                        {isVehicleCheckComplete(item) ? (
                          <span className="admin-vehicle-check-badge is-complete">Vehicle check complete</span>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                  {!bookingsLoading && bookings.length === 0 && (
                    <tr>
                      <td colSpan={5}>No bookings found.</td>
                    </tr>
                  )}
                  {(isBookingsTab || isMyBookingsTab) && bookingWindowCounts.pastCount > 0 && (
                    <tr className="admin-table-hint-row">
                      <td colSpan={5}>
                        <div className="admin-table-hint-content">
                          <span>{bookingWindowCounts.pastCount} more past booking{bookingWindowCounts.pastCount !== 1 ? 's' : ''} not shown</span>
                          <button
                            className="button button-quiet admin-window-btn"
                            type="button"
                            disabled={bookingsLoading}
                            onClick={handleShowMorePast}
                          >
                            <FontAwesomeIcon icon={faArrowLeft} aria-hidden="true" />
                            Show more past bookings
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

              </>
            )}

            {selectedBookingId && (
              <section className="admin-editor admin-editor-booking" aria-label="Booking details">
              {bookingDetailLoading && <p>Loading booking details...</p>}
              {!bookingDetailLoading && !bookingForm && <p>Could not load booking details.</p>}
              {!bookingDetailLoading && bookingForm && (
                <form className="admin-form-grid" onSubmit={isAdmin ? handleBookingSave : undefined}>

                  <label className="field-full admin-detail-tabs-mobile">
                    <span>Select view</span>
                    <select
                      value={bookingDetailTab}
                      onChange={(event) => handleBookingDetailTabChange(event.target.value)}
                      aria-label="Select booking detail view"
                    >
                      <option value="main">Main booking</option>
                      <option value="availability">Your Avaliability</option>
                      {isAdmin && <option value="driver-assignment">Driver Assignment</option>}
                      <option value="checklist">Checklist</option>
                    </select>
                  </label>

                  <nav className="field-full admin-detail-tabs" aria-label="Booking detail tabs" role="tablist">
                    <button type="button" role="tab" aria-selected={bookingDetailTab === 'main'} className={bookingDetailTab === 'main' ? 'is-active' : ''} onClick={() => handleBookingDetailTabChange('main')}>
                      Main booking
                    </button>
                    <button type="button" role="tab" aria-selected={bookingDetailTab === 'availability'} className={bookingDetailTab === 'availability' ? 'is-active' : ''} onClick={() => handleBookingDetailTabChange('availability')}>
                      Your Avaliability
                    </button>
                    {isAdmin && (
                      <button type="button" role="tab" aria-selected={bookingDetailTab === 'driver-assignment'} className={bookingDetailTab === 'driver-assignment' ? 'is-active' : ''} onClick={() => handleBookingDetailTabChange('driver-assignment')}>
                        Driver Assignment
                      </button>
                    )}
                    <button type="button" role="tab" aria-selected={bookingDetailTab === 'checklist'} className={bookingDetailTab === 'checklist' ? 'is-active' : ''} onClick={() => handleBookingDetailTabChange('checklist')}>
                      Checklist
                    </button>
                  </nav>

                  {bookingDetailTab === 'main' && (
                    <>

                  <section className="field-full admin-detail-tab-heading" aria-label="Main booking heading">
                    <h3>Main booking</h3>
                    <p>Booking reference: {formatDisplayText(bookingForm?.bookingRef, 'Not provided')}</p>
                  </section>

                  <label className="field-full">
                    <span>Status</span>
                    {isAdmin ? (
                      <>
                        <select
                          value={normalizeBookingStatus(bookingForm.status)}
                          onChange={(event) => handleBookingFieldChange('status', event.target.value)}
                        >
                          {BOOKING_STATUS_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value} disabled={option.value !== 'pending' && isDriverSelectionUnassigned}>{option.label}</option>
                          ))}
                        </select>
                        {isStandardBookingStatus(normalizeBookingStatus(bookingForm.status)) ? (
                          <div className="admin-status-workflow" aria-label="Booking status workflow">
                            <ol className="admin-status-process" role="list">
                              {STANDARD_BOOKING_STATUS_OPTIONS.map((option, index) => {
                                const stepNumber = index + 1
                                const currentStep = getStandardWorkflowStepNumber(bookingForm.status)
                                const isCompleted = currentStep !== null && stepNumber <= currentStep
                                const isNext = currentStep !== null && stepNumber === (currentStep + 1)
                                const stateClass = isCompleted ? 'is-complete' : (isNext ? 'is-next is-upcoming' : 'is-upcoming')
                                const stateIcon = isCompleted ? faCircleCheck : (isNext ? faHourglassHalf : null)

                                return (
                                  <li key={option.value} className={`admin-status-process-step ${stateClass}`}>
                                    <button
                                      className="admin-status-process-step-button"
                                      type="button"
                                      onClick={() => handleBookingFieldChange('status', option.value)}
                                      disabled={option.value !== 'pending' && isDriverSelectionUnassigned}
                                      aria-pressed={normalizeBookingStatus(bookingForm.status) === option.value}
                                    >
                                      <span className="admin-status-process-content">
                                        {stateIcon ? (
                                          <span className="admin-status-process-icon" aria-hidden="true"><FontAwesomeIcon icon={stateIcon} /></span>
                                        ) : null}
                                        <span className="admin-status-process-label">{option.label}</span>
                                      </span>
                                    </button>
                                  </li>
                                )
                              })}
                            </ol>
                          </div>
                        ) : null}
                        {isDriverSelectionUnassigned ? (
                          <small className="admin-field-help">Assign a driver before moving a booking beyond Pending.</small>
                        ) : null}
                        <small className="admin-field-help">{formatBookingStatusDescription(bookingForm.status)}</small>
                      </>
                    ) : (
                      <div className="admin-readonly-value">{formatBookingStatusLabel(bookingForm.status)}</div>
                    )}
                  </label>

                  <label>
                    <span>Driver</span>
                    {isAdmin ? (
                      <select
                        value={bookingForm.driverUserId}
                        onChange={(event) => handleBookingFieldChange('driverUserId', event.target.value)}
                      >
                        <option value="">Unassigned</option>
                        {assignableUsers.map((item) => (
                          <option key={item.id} value={String(item.id)}>{preferredUserLabel(item)}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="admin-readonly-value">{formatDisplayText(bookingForm.driverName, 'Unassigned')}</div>
                    )}
                  </label>

                  <label>
                    <span>Booking date</span>
                    {isAdmin ? (
                      <input
                        type="date"
                        value={bookingForm.bookingDate}
                        onChange={(event) => handleBookingFieldChange('bookingDate', event.target.value)}
                        required
                      />
                    ) : (
                      <div className="admin-readonly-value">{formatDisplayText(formatDateUK(bookingForm.bookingDate))}</div>
                    )}
                  </label>

                  <label>
                    <span>Pickup time</span>
                    {isAdmin ? (
                      <input
                        type="time"
                        value={bookingForm.pickupTime}
                        onChange={(event) => handleBookingFieldChange('pickupTime', event.target.value)}
                        required
                      />
                    ) : (
                      <div className="admin-readonly-value">{formatDisplayText(formatPickupTime(bookingForm.pickupTime))}</div>
                    )}
                  </label>

                  <label>
                    <span>Organisation</span>
                    {isAdmin ? (
                      <input
                        value={bookingForm.organisation}
                        onChange={(event) => handleBookingFieldChange('organisation', event.target.value)}
                        required
                      />
                    ) : (
                      <div className="admin-readonly-value">{formatDisplayText(bookingForm.organisation)}</div>
                    )}
                  </label>

                  <label>
                    <span>Destination</span>
                    {isAdmin ? (
                      <input
                        value={bookingForm.destinationName}
                        onChange={(event) => handleBookingFieldChange('destinationName', event.target.value)}
                      />
                    ) : (
                      <div className="admin-readonly-value">{formatDisplayText(bookingForm.destinationName)}</div>
                    )}
                  </label>

                  <label className="field-full">
                    <span>Destination address</span>
                    {isAdmin ? (
                      <input
                        value={bookingForm.destinationAddress}
                        onChange={(event) => handleBookingFieldChange('destinationAddress', event.target.value)}
                      />
                    ) : (
                      <div className="admin-readonly-value">{formatDisplayText(bookingForm.destinationAddress)}</div>
                    )}
                  </label>

                  <label>
                    <span>Contact name</span>
                    {isAdmin ? (
                      <input
                        value={bookingForm.contactName}
                        onChange={(event) => handleBookingFieldChange('contactName', event.target.value)}
                        required
                      />
                    ) : (
                      <div className="admin-readonly-value">{formatDisplayText(bookingForm.contactName)}</div>
                    )}
                  </label>

                  <label>
                    <span>Contact email</span>
                    {isAdmin ? (
                      <input
                        type="email"
                        value={bookingForm.contactEmail}
                        onChange={(event) => handleBookingFieldChange('contactEmail', event.target.value)}
                        required
                      />
                    ) : (
                      <div className="admin-readonly-value">{formatDisplayText(bookingForm.contactEmail)}</div>
                    )}
                  </label>

                  <label>
                    <span>Contact number</span>
                    {isAdmin ? (
                      <input
                        value={bookingForm.contactNumber}
                        onChange={(event) => handleBookingFieldChange('contactNumber', event.target.value)}
                        required
                      />
                    ) : (
                      <div className="admin-readonly-value">{formatDisplayText(bookingForm.contactNumber)}</div>
                    )}
                  </label>

                  <label>
                    <span>Static wheelchairs</span>
                    {isAdmin ? (
                      <select
                        value={bookingForm.staticWheelchairs ? 'yes' : 'no'}
                        onChange={(event) => handleBookingFieldChange('staticWheelchairs', event.target.value === 'yes')}
                      >
                        <option value="no">No</option>
                        <option value="yes">Yes</option>
                      </select>
                    ) : (
                      <div className="admin-readonly-value">{bookingForm.staticWheelchairs ? 'Yes' : 'No'}</div>
                    )}
                  </label>

                  <label>
                    <span>Powered wheelchairs</span>
                    {isAdmin ? (
                      <select
                        value={bookingForm.poweredWheelchairs ? 'yes' : 'no'}
                        onChange={(event) => handleBookingFieldChange('poweredWheelchairs', event.target.value === 'yes')}
                      >
                        <option value="no">No</option>
                        <option value="yes">Yes</option>
                      </select>
                    ) : (
                      <div className="admin-readonly-value">{bookingForm.poweredWheelchairs ? 'Yes' : 'No'}</div>
                    )}
                  </label>

                  <label>
                    <span>Passenger transfers</span>
                    {isAdmin ? (
                      <select
                        value={bookingForm.passengerTransfers ? 'yes' : 'no'}
                        onChange={(event) => handleBookingFieldChange('passengerTransfers', event.target.value === 'yes')}
                      >
                        <option value="no">No</option>
                        <option value="yes">Yes</option>
                      </select>
                    ) : (
                      <div className="admin-readonly-value">{bookingForm.passengerTransfers ? 'Yes' : 'No'}</div>
                    )}
                  </label>

                  <label className="field-full">
                    <span>Special requirements</span>
                    {isAdmin ? (
                      <textarea
                        rows={4}
                        value={bookingForm.specialRequirements}
                        onChange={(event) => handleBookingFieldChange('specialRequirements', event.target.value)}
                      />
                    ) : (
                      <div className="admin-readonly-value admin-readonly-value-multiline">{formatDisplayText(bookingForm.specialRequirements)}</div>
                    )}
                  </label>

                  <label className="field-full">
                    <span>Admin Notes</span>
                    <small style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--muted)', fontSize: '0.85rem' }}>Internal notes only shown to admin portal users</small>
                    {isAdmin ? (
                      <textarea
                        rows={4}
                        value={bookingForm.adminNotes}
                        onChange={(event) => handleBookingFieldChange('adminNotes', event.target.value)}
                      />
                    ) : (
                      <div className="admin-readonly-value admin-readonly-value-multiline">{formatDisplayText(bookingForm.adminNotes)}</div>
                    )}
                  </label>

                    </>
                  )}

                  {bookingDetailTab === 'availability' && (
                    <section className="field-full admin-availability-panel" aria-label="Driver availability">
                      <div className="admin-detail-tab-heading">
                        <h3>Your Avaliability</h3>
                        <p>Share your response for this booking and review what each option means.</p>
                      </div>

                      {isCurrentUserConfirmedDriver ? (
                        <>
                          <p className="admin-viewer-confirmed-label">You are confirmed for this booking</p>
                          <p className="admin-viewer-confirmed-note">Contact us right away if your situation changes and you cannot do the booking.</p>
                        </>
                      ) : (
                        <>
                          <p className="admin-viewer-availability-label">
                            {hasConfirmedDriver
                              ? `${formatDisplayText(bookingForm.driverName, 'Another driver')} is already the confirmed driver for this booking, but your response still helps if anything changes.`
                              : (currentUserDriverMappingStatus
                                ? `Your current response: ${formatDriverMappingStatus(currentUserDriverMappingStatus)}.`
                                : 'Please let us know your availability for this booking.')}
                          </p>

                          <div className="admin-availability-current-status" aria-live="polite">
                            <p className="admin-availability-current-status-label">Your current status</p>
                            <div className="admin-availability-current-status-main">
                              <span className={`admin-driver-mapping-badge status-${currentUserDriverMappingStatus || 'none'}`}>
                                {currentUserDriverMappingStatus ? formatDriverMappingStatus(currentUserDriverMappingStatus) : 'No response yet'}
                              </span>
                              <span className="admin-driver-mapping-updated-at">
                                {currentUserDriverMappingStatus
                                  ? `Responded: ${formatDisplayText(formatDateTimeUK(currentUserDriverMapping?.updated_at), 'Not available')}`
                                  : 'Responded: Not yet'}
                              </span>
                            </div>
                          </div>

                          <div className="admin-availability-vote-grid" role="radiogroup" aria-label="Choose your availability">
                            <button
                              className={`button admin-availability-vote admin-availability-btn-available${currentUserDriverMappingStatus === 'available' ? ' is-active' : ''}`}
                              type="button"
                              disabled={driverMappingsSaveLoading}
                              onClick={() => handleUpdateDriverMapping('available', user.id)}
                              role="radio"
                              aria-checked={currentUserDriverMappingStatus === 'available'}
                            >
                              <span className="admin-availability-vote-title">
                                <span className="admin-availability-radio-indicator" aria-hidden="true" />
                                Available
                              </span>
                              <span className="admin-availability-vote-detail">I can confidently take this booking and commit if assigned.</span>
                            </button>
                            <button
                              className={`button admin-availability-vote admin-availability-btn-maybe${currentUserDriverMappingStatus === 'maybe_available' ? ' is-active' : ''}`}
                              type="button"
                              disabled={driverMappingsSaveLoading}
                              onClick={() => handleUpdateDriverMapping('maybe_available', user.id)}
                              role="radio"
                              aria-checked={currentUserDriverMappingStatus === 'maybe_available'}
                            >
                              <span className="admin-availability-vote-title">
                                <span className="admin-availability-radio-indicator" aria-hidden="true" />
                                Maybe Available
                              </span>
                              <span className="admin-availability-vote-detail">I am unsure right now and will update to Available or Not Available as soon as I can.</span>
                            </button>
                            <button
                              className={`button admin-availability-vote admin-availability-btn-unavailable${currentUserDriverMappingStatus === 'not_available' ? ' is-active' : ''}`}
                              type="button"
                              disabled={driverMappingsSaveLoading}
                              onClick={() => handleUpdateDriverMapping('not_available', user.id)}
                              role="radio"
                              aria-checked={currentUserDriverMappingStatus === 'not_available'}
                            >
                              <span className="admin-availability-vote-title">
                                <span className="admin-availability-radio-indicator" aria-hidden="true" />
                                Not Available
                              </span>
                              <span className="admin-availability-vote-detail">I cannot take this booking</span>
                            </button>
                          </div>

                          {currentUserDriverMappingStatus === 'available' && (
                            <p className="admin-viewer-availability-note admin-viewer-availability-note-available">Look out for a confirmation that you are the assigned driver for this booking soon. This will be via email and you'll see it here.</p>
                          )}
                          {currentUserDriverMappingStatus === 'maybe_available' && (
                            <p className="admin-viewer-availability-note admin-viewer-availability-note-maybe">Please update this to Available or Not Available as soon as you can.</p>
                          )}
                        </>
                      )}
                    </section>
                  )}

                  {bookingDetailTab === 'driver-assignment' && (
                    <section className="field-full admin-driver-mapping-panel" aria-label="Driver assignment">
                      <div className="admin-detail-tab-heading">
                        <h3>Driver assignment</h3>
                        <p>Manage drivers for this booking</p>
                      </div>

                      <div className="admin-driver-mapping-list-wrap">
                        {driverMappingsLoading ? (
                          <p>Loading mappings...</p>
                        ) : driverMappings.length === 0 ? (
                          <p>No availability responses yet.</p>
                        ) : (
                          <ul className="admin-driver-mapping-list">
                            {driverMappings.map((item) => (
                              <li key={`${item.user_id}-${item.mapping_status}`}>
                                <div className="admin-driver-mapping-item-main">
                                  <strong>{preferredUserLabel(item)}</strong>
                                  <span className={`admin-driver-mapping-badge status-${item.mapping_status}`}>{formatDriverMappingStatus(item.mapping_status)}</span>
                                  <span className="admin-driver-mapping-updated-at">Last updated: {formatDisplayText(formatDateTimeUK(item.updated_at), 'Not available')}</span>
                                </div>
                                {isAdmin && !bookingForm.driverUserId && item.mapping_status === 'available' && (
                                  <button
                                    className="button button-secondary admin-driver-mapping-action-btn"
                                    type="button"
                                    disabled={driverMappingsSaveLoading}
                                    onClick={() => handleUpdateDriverMapping('confirmed', String(item.user_id))}
                                  >
                                    <FontAwesomeIcon icon={faCircleCheck} aria-hidden="true" />
                                    Confirm {preferredUserLabel(item)} as driver
                                  </button>
                                )}
                                {isAdmin && bookingForm.driverUserId && String(bookingForm.driverUserId) === String(item.user_id) && (
                                  <button
                                    className="button button-quiet admin-driver-mapping-action-btn"
                                    type="button"
                                    disabled={driverMappingsSaveLoading}
                                    onClick={() => handleUpdateDriverMapping('', String(item.user_id))}
                                  >
                                    <FontAwesomeIcon icon={faXmark} aria-hidden="true" />
                                    Remove {preferredUserLabel(item)} as driver
                                  </button>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </section>
                  )}

                  {bookingDetailTab === 'checklist' && (
                  <section className="field-full admin-vehicle-checklist-panel" aria-label="Vehicle checklist section">
                    <div className="admin-detail-tab-heading">
                      <h3>Checklist</h3>
                      <p>Record mileage and complete the post-journey checklist.</p>
                    </div>

                    <div className="admin-vehicle-checklist-grid">
                  <label>
                    <span>Start mileage</span>
                    {canEditChecklist ? (
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={bookingForm.startMileage}
                        onChange={(event) => handleBookingFieldChange('startMileage', event.target.value)}
                      />
                    ) : (
                      <div className="admin-readonly-value">{formatDisplayText(bookingForm.startMileage)}</div>
                    )}
                  </label>

                  <label>
                    <span>Finish mileage</span>
                    {canEditChecklist ? (
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={bookingForm.finishMileage}
                        onChange={(event) => handleBookingFieldChange('finishMileage', event.target.value)}
                      />
                    ) : (
                      <div className="admin-readonly-value">{formatDisplayText(bookingForm.finishMileage)}</div>
                    )}
                  </label>

                  <label>
                    <span>Non billable mileage</span>
                    {canEditChecklist ? (
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={bookingForm.nonBillableMileage}
                        onChange={(event) => handleBookingFieldChange('nonBillableMileage', event.target.value)}
                      />
                    ) : (
                      <div className="admin-readonly-value">{formatDisplayText(bookingForm.nonBillableMileage)}</div>
                    )}
                  </label>

                  <label className="admin-vehicle-checklist-item">
                    <span>Lights & indicators</span>
                    {canEditChecklist ? (
                      <TriStateButtonGroup
                        value={bookingForm.checklistLightsIndicators}
                        onChange={(nextValue) => handleBookingFieldChange('checklistLightsIndicators', nextValue)}
                      />
                    ) : (
                      <div className="admin-readonly-value">{triStateLabel(bookingForm.checklistLightsIndicators)}</div>
                    )}
                  </label>

                  <label className="admin-vehicle-checklist-item">
                    <span>Tyres</span>
                    {canEditChecklist ? (
                      <TriStateButtonGroup
                        value={bookingForm.checklistTyres}
                        onChange={(nextValue) => handleBookingFieldChange('checklistTyres', nextValue)}
                      />
                    ) : (
                      <div className="admin-readonly-value">{triStateLabel(bookingForm.checklistTyres)}</div>
                    )}
                  </label>

                  <label className="admin-vehicle-checklist-item">
                    <span>Wheel nuts</span>
                    {canEditChecklist ? (
                      <TriStateButtonGroup
                        value={bookingForm.checklistWheelNuts}
                        onChange={(nextValue) => handleBookingFieldChange('checklistWheelNuts', nextValue)}
                      />
                    ) : (
                      <div className="admin-readonly-value">{triStateLabel(bookingForm.checklistWheelNuts)}</div>
                    )}
                  </label>

                  <label className="admin-vehicle-checklist-item">
                    <span>Bodywork</span>
                    {canEditChecklist ? (
                      <TriStateButtonGroup
                        value={bookingForm.checklistBodywork}
                        onChange={(nextValue) => handleBookingFieldChange('checklistBodywork', nextValue)}
                      />
                    ) : (
                      <div className="admin-readonly-value">{triStateLabel(bookingForm.checklistBodywork)}</div>
                    )}
                  </label>

                  <label className="admin-vehicle-checklist-item">
                    <span>Mirrors & glass</span>
                    {canEditChecklist ? (
                      <TriStateButtonGroup
                        value={bookingForm.checklistMirrorsGlass}
                        onChange={(nextValue) => handleBookingFieldChange('checklistMirrorsGlass', nextValue)}
                      />
                    ) : (
                      <div className="admin-readonly-value">{triStateLabel(bookingForm.checklistMirrorsGlass)}</div>
                    )}
                  </label>

                  <label className="admin-vehicle-checklist-item">
                    <span>Brakes</span>
                    {canEditChecklist ? (
                      <TriStateButtonGroup
                        value={bookingForm.checklistBrakes}
                        onChange={(nextValue) => handleBookingFieldChange('checklistBrakes', nextValue)}
                      />
                    ) : (
                      <div className="admin-readonly-value">{triStateLabel(bookingForm.checklistBrakes)}</div>
                    )}
                  </label>

                  <label className="admin-vehicle-checklist-item">
                    <span>Steering</span>
                    {canEditChecklist ? (
                      <TriStateButtonGroup
                        value={bookingForm.checklistSteering}
                        onChange={(nextValue) => handleBookingFieldChange('checklistSteering', nextValue)}
                      />
                    ) : (
                      <div className="admin-readonly-value">{triStateLabel(bookingForm.checklistSteering)}</div>
                    )}
                  </label>

                  <label className="admin-vehicle-checklist-item">
                    <span>Wipers & washers</span>
                    {canEditChecklist ? (
                      <TriStateButtonGroup
                        value={bookingForm.checklistWipersWashers}
                        onChange={(nextValue) => handleBookingFieldChange('checklistWipersWashers', nextValue)}
                      />
                    ) : (
                      <div className="admin-readonly-value">{triStateLabel(bookingForm.checklistWipersWashers)}</div>
                    )}
                  </label>

                  <label className="admin-vehicle-checklist-item">
                    <span>Dashboard warning lights</span>
                    {canEditChecklist ? (
                      <TriStateButtonGroup
                        value={bookingForm.checklistDashboardWarningLights}
                        onChange={(nextValue) => handleBookingFieldChange('checklistDashboardWarningLights', nextValue)}
                      />
                    ) : (
                      <div className="admin-readonly-value">{triStateLabel(bookingForm.checklistDashboardWarningLights)}</div>
                    )}
                  </label>

                  <label className="admin-vehicle-checklist-item">
                    <span>Seats & seatbelts</span>
                    {canEditChecklist ? (
                      <TriStateButtonGroup
                        value={bookingForm.checklistSeatsSeatbelts}
                        onChange={(nextValue) => handleBookingFieldChange('checklistSeatsSeatbelts', nextValue)}
                      />
                    ) : (
                      <div className="admin-readonly-value">{triStateLabel(bookingForm.checklistSeatsSeatbelts)}</div>
                    )}
                  </label>

                  <label className="admin-vehicle-checklist-item">
                    <span>Emergency equipment</span>
                    {canEditChecklist ? (
                      <TriStateButtonGroup
                        value={bookingForm.checklistEmergencyEquipment}
                        onChange={(nextValue) => handleBookingFieldChange('checklistEmergencyEquipment', nextValue)}
                      />
                    ) : (
                      <div className="admin-readonly-value">{triStateLabel(bookingForm.checklistEmergencyEquipment)}</div>
                    )}
                  </label>

                  <label className="admin-vehicle-checklist-item">
                    <span>Wheelchair lifts & restraints</span>
                    {canEditChecklist ? (
                      <TriStateButtonGroup
                        value={bookingForm.checklistWheelchairLiftsRestraints}
                        onChange={(nextValue) => handleBookingFieldChange('checklistWheelchairLiftsRestraints', nextValue)}
                      />
                    ) : (
                      <div className="admin-readonly-value">{triStateLabel(bookingForm.checklistWheelchairLiftsRestraints)}</div>
                    )}
                  </label>

                  <label className="admin-vehicle-checklist-item">
                    <span>Tail lifts</span>
                    {canEditChecklist ? (
                      <TriStateButtonGroup
                        value={bookingForm.checklistTailLifts}
                        onChange={(nextValue) => handleBookingFieldChange('checklistTailLifts', nextValue)}
                      />
                    ) : (
                      <div className="admin-readonly-value">{triStateLabel(bookingForm.checklistTailLifts)}</div>
                    )}
                  </label>

                  <label className="field-full admin-vehicle-checklist-item">
                    <span>Vehicle check date</span>
                    {canEditChecklist ? (
                      <input
                        type="date"
                        value={bookingForm.vehicleCheckDate}
                        onChange={(event) => handleBookingFieldChange('vehicleCheckDate', event.target.value)}
                      />
                    ) : (
                      <div className="admin-readonly-value">{formatDisplayText(formatDateUK(bookingForm.vehicleCheckDate))}</div>
                    )}
                  </label>

                  <label className="field-full admin-vehicle-checklist-item">
                    <span>Signed</span>
                    {canEditChecklist ? (
                      <>
                        <small style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--muted)', fontSize: '0.85rem' }}>Simply type your name</small>
                        <input
                          value={bookingForm.vehicleCheckSignedBy}
                          placeholder="Type your name"
                          onChange={(event) => handleBookingFieldChange('vehicleCheckSignedBy', event.target.value)}
                        />
                      </>
                    ) : (
                      <div className="admin-readonly-value">{formatDisplayText(bookingForm.vehicleCheckSignedBy)}</div>
                    )}
                  </label>

                  <label className="field-full admin-vehicle-checklist-item">
                    <span>Faults recorded</span>
                    {canEditChecklist ? (
                      <textarea
                        rows={3}
                        value={bookingForm.vehicleFaultsRecorded}
                        onChange={(event) => handleBookingFieldChange('vehicleFaultsRecorded', event.target.value)}
                      />
                    ) : (
                      <div className="admin-readonly-value admin-readonly-value-multiline">{formatDisplayText(bookingForm.vehicleFaultsRecorded)}</div>
                    )}
                  </label>
                    </div>

                  {isAssignedDriver && (
                    <div className="admin-inline-actions" style={{ marginTop: '0.75rem' }}>
                      <button
                        className="button button-primary"
                        type="button"
                        disabled={checklistSaveLoading}
                        onClick={handleChecklistSave}
                      >
                        <FontAwesomeIcon icon={faFloppyDisk} aria-hidden="true" />
                        {checklistSaveLoading ? 'Saving...' : 'Save Checklist'}
                      </button>
                      {banner.type === 'error' && !isAdmin && (
                        <p className="admin-banner admin-banner-error field-full" role="alert">{banner.message}</p>
                      )}
                    </div>
                  )}
                  </section>
                  )}

                  <p className="field-full admin-detail-meta-text" aria-label="Booking metadata">
                    Created: {formatDisplayText(bookingForm.createdAt)} | Updated: {formatDisplayText(bookingForm.updatedAt)}
                  </p>

                  {isAdmin && (bookingDetailTab === 'main' || bookingDetailTab === 'checklist') && (
                    <div className="field-full admin-inline-actions">
                      <button className="button button-primary" type="submit" disabled={bookingSaveLoading}>
                        <FontAwesomeIcon icon={faFloppyDisk} aria-hidden="true" />
                        {bookingSaveLoading ? 'Saving...' : 'Save Changes'}
                      </button>
                      {bookingDetailTab === 'main' && (
                        <button className="button button-danger" type="button" disabled={bookingDeleteLoading} onClick={handleBookingDelete}>
                          <FontAwesomeIcon icon={faTrash} aria-hidden="true" />
                          {bookingDeleteLoading ? 'Deleting...' : 'Delete Permanently'}
                        </button>
                      )}
                      {banner.type === 'error' && (
                        <p className="admin-banner admin-banner-error field-full" role="alert">{banner.message}</p>
                      )}
                    </div>
                  )}
                </form>
              )}
              </section>
            )}
          </section>
        )}

        {activeTab === 'users' && isAdmin && (
          <section className="admin-section" aria-label="User management">
            <div className="admin-section-heading">
              <div>
                <h2>Users</h2>
                <p>Browse users and open a profile to edit details.</p>
              </div>
              <button
                className="button button-primary"
                type="button"
                onClick={() => setShowCreateUserForm((current) => !current)}
              >
                <FontAwesomeIcon icon={showCreateUserForm ? faXmark : faUserPlus} aria-hidden="true" />
                {showCreateUserForm ? 'Close Create User' : 'Create User'}
              </button>
            </div>

            {showCreateUserForm && (
              <section className="admin-editor" aria-label="Create user form">
                <h3>Create User</h3>
                <form className="admin-form-grid" onSubmit={handleCreateUser}>
                  <label>
                    <span>Username</span>
                    <input
                      value={newUserForm.username}
                      onChange={(event) => setNewUserForm((current) => ({ ...current, username: event.target.value }))}
                      required
                    />
                  </label>
                  <label>
                    <span>Display Name</span>
                    <input
                      value={newUserForm.displayName}
                      onChange={(event) => setNewUserForm((current) => ({ ...current, displayName: event.target.value }))}
                    />
                  </label>
                  <label>
                    <span>Email</span>
                    <input
                      type="email"
                      value={newUserForm.email}
                      onChange={(event) => setNewUserForm((current) => ({ ...current, email: event.target.value }))}
                    />
                  </label>
                  <label>
                    <span>Phone number</span>
                    <input
                      value={newUserForm.phoneNumber}
                      onChange={(event) => setNewUserForm((current) => ({ ...current, phoneNumber: event.target.value }))}
                    />
                  </label>
                  <label>
                    <span>Role</span>
                    <select
                      value={newUserForm.role}
                      onChange={(event) => setNewUserForm((current) => ({ ...current, role: event.target.value }))}
                    >
                      <option value="viewer">viewer</option>
                      <option value="admin">admin</option>
                    </select>
                  </label>
                  <label>
                    <span>Password</span>
                    <input
                      type="password"
                      minLength={8}
                      value={newUserForm.password}
                      onChange={(event) => setNewUserForm((current) => ({ ...current, password: event.target.value }))}
                      required
                    />
                  </label>

                  <div className="field-full admin-inline-actions">
                    <button className="button button-primary" type="submit" disabled={newUserLoading}>
                      <FontAwesomeIcon icon={faUserPlus} aria-hidden="true" />
                      {newUserLoading ? 'Creating...' : 'Create User'}
                    </button>
                    <button className="button button-quiet" type="button" onClick={() => setShowCreateUserForm(false)}>
                      <FontAwesomeIcon icon={faXmark} aria-hidden="true" />
                      Cancel
                    </button>
                  </div>
                </form>
              </section>
            )}

            <div className="admin-table-wrap">
              <table className="admin-table admin-users-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Role</th>
                    <th>Last login</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((item) => {
                    return (
                      <tr key={item.id}>
                        <td>
                          <button className="admin-link-button" type="button" onClick={() => handleOpenUserProfile(item.id)}>
                            {preferredUserLabel(item)}
                          </button>
                        </td>
                        <td>{item.role}</td>
                        <td>{item.last_login_at || 'Never'}</td>
                      </tr>
                    )
                  })}
                  {!usersLoading && users.length === 0 && (
                    <tr>
                      <td colSpan={3}>No users found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeTab === 'user-profile' && isAdmin && selectedUserProfileId && (
          <section className="admin-section" aria-label="User profile">
            <div className="admin-section-heading">
              <div>
                <h2>User Profile</h2>
                <p>Edit account details for this user.</p>
              </div>
              <button className="button button-quiet" type="button" onClick={handleCloseUserProfile}>
                <FontAwesomeIcon icon={faXmark} aria-hidden="true" />
                Back to Users
              </button>
            </div>

            <form className="admin-form-grid admin-profile-form" onSubmit={handleUpdateSelectedUserProfile}>
              <label>
                <span>Username</span>
                <input
                  value={selectedUserProfileDraft.username}
                  onChange={(event) => setSelectedUserProfileDraft((current) => ({ ...current, username: event.target.value }))}
                  required
                />
              </label>

              <label>
                <span>Display Name</span>
                <input
                  value={selectedUserProfileDraft.displayName}
                  onChange={(event) => setSelectedUserProfileDraft((current) => ({ ...current, displayName: event.target.value }))}
                />
              </label>

              <label>
                <span>Role</span>
                <select
                  value={selectedUserProfileDraft.role}
                  onChange={(event) => setSelectedUserProfileDraft((current) => ({ ...current, role: event.target.value }))}
                >
                  <option value="viewer">viewer</option>
                  <option value="admin">admin</option>
                </select>
              </label>

              <label>
                <span>Email</span>
                <input
                  type="email"
                  value={selectedUserProfileDraft.email}
                  onChange={(event) => setSelectedUserProfileDraft((current) => ({ ...current, email: event.target.value }))}
                />
              </label>

              <label>
                <span>Phone number</span>
                <input
                  value={selectedUserProfileDraft.phoneNumber}
                  onChange={(event) => setSelectedUserProfileDraft((current) => ({ ...current, phoneNumber: event.target.value }))}
                />
              </label>

              <div className="field-full admin-inline-actions">
                <button className="button button-primary" type="submit" disabled={userProfileSaving}>
                  <FontAwesomeIcon icon={faFloppyDisk} aria-hidden="true" />
                  {userProfileSaving ? 'Saving...' : 'Save Profile'}
                </button>
                <button className="button button-quiet" type="button" onClick={() => handleResetUserPassword(selectedUserProfileId)} disabled={userResetLoading}>
                  <FontAwesomeIcon icon={faRotate} aria-hidden="true" />
                  {userResetLoading ? 'Resetting...' : 'Reset Password'}
                </button>
                <button
                  className="button button-danger"
                  type="button"
                  onClick={() => handleDeleteUser(selectedUserProfileId, preferredUserLabel(selectedUserProfileDraft, selectedUserProfileDraft.username))}
                  disabled={userDeleteLoading || String(user?.id) === String(selectedUserProfileId)}
                >
                  <FontAwesomeIcon icon={faTrash} aria-hidden="true" />
                  {userDeleteLoading ? 'Deleting...' : 'Delete User'}
                </button>
              </div>
            </form>
          </section>
        )}

        {activeTab === 'account' && (
          <section className="admin-section" aria-label="My account">
            <div className="admin-section-heading">
              <div>
                <h2>My Account</h2>
                <p>Update your contact details and password.</p>
              </div>
            </div>

            <form className="admin-form-grid admin-profile-form" onSubmit={handleUpdateAccount}>
              <label>
                <span>Username</span>
                <div className="admin-readonly-value">{formatDisplayText(user?.username, 'Unknown')}</div>
              </label>

              <label>
                <span>Display Name</span>
                <input
                  value={accountForm.displayName}
                  onChange={(event) => setAccountForm((current) => ({ ...current, displayName: event.target.value }))}
                />
              </label>

              <label>
                <span>Email</span>
                <input
                  type="email"
                  value={accountForm.email}
                  onChange={(event) => setAccountForm((current) => ({ ...current, email: event.target.value }))}
                />
              </label>

              <label>
                <span>Phone number</span>
                <input
                  value={accountForm.phoneNumber}
                  onChange={(event) => setAccountForm((current) => ({ ...current, phoneNumber: event.target.value }))}
                />
              </label>

              <label>
                <span>Current password</span>
                <input
                  type="text"
                  value={accountForm.currentPassword}
                  onChange={(event) => setAccountForm((current) => ({ ...current, currentPassword: event.target.value }))}
                  placeholder="Leave blank to keep your password"
                />
              </label>

              <label>
                <span>New password</span>
                <input
                  type="text"
                  minLength={8}
                  value={accountForm.newPassword}
                  onChange={(event) => setAccountForm((current) => ({ ...current, newPassword: event.target.value }))}
                  placeholder="Leave blank to keep your password"
                />
              </label>

              <div className="field-full admin-inline-actions">
                <button className="button button-primary" type="submit" disabled={accountSaving}>
                  <FontAwesomeIcon icon={faFloppyDisk} aria-hidden="true" />
                  {accountSaving ? 'Saving...' : 'Save Details'}
                </button>
              </div>
            </form>
          </section>
        )}

        {resetPasswordResult && (
          <section className="admin-editor" aria-label="Temporary password panel">
            <h3>Temporary Password</h3>
            <p>
              Username: <strong>{resetPasswordResult.username}</strong>
            </p>
            <p>
              Temporary password: <strong>{resetPasswordResult.temporaryPassword}</strong>
            </p>
            <div className="admin-inline-actions">
              <button className={`button button-primary ${copyFeedbackKey === 'temporary-password' ? 'is-copied' : ''}`} type="button" onClick={handleCopyTemporaryPassword}>
                <FontAwesomeIcon icon={faCopy} aria-hidden="true" />
                Copy
              </button>
              <button className="button button-quiet" type="button" onClick={() => setResetPasswordResult(null)}>
                <FontAwesomeIcon icon={faXmark} aria-hidden="true" />
                Close
              </button>
            </div>
          </section>
        )}
      </section>
    </main>
  )
}
