'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faArrowLeft,
  faArrowRight,
  faArrowUpRightFromSquare,
  faCalendarCheck,
  faCopy,
  faFloppyDisk,
  faKey,
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

const PAGE_SIZE = 250
const DEFAULT_PAST_WEEKS = 4
const DEFAULT_FUTURE_WEEKS = 8

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

function mapBookingToForm(booking) {
  if (!booking) return null
  return {
    id: String(booking.id || ''),
    bookingRef: String(booking.booking_ref || ''),
    status: String(booking.status || 'pending'),
    driverUserId: booking.driver_user_id !== null && booking.driver_user_id !== undefined ? String(booking.driver_user_id) : '',
    driverUsername: String(booking.driver_username || ''),
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
    adminNotes: String(booking.admin_notes || ''),
    createdAt: formatDateTimeUK(booking.created_at),
    updatedAt: formatDateTimeUK(booking.updated_at),
  }
}

function formatDateUK(dateStr) {
  if (!dateStr) return ''
  try {
    const date = new Date(dateStr + 'T00:00:00Z')
    const day = String(date.getUTCDate()).padStart(2, '0')
    const month = String(date.getUTCMonth() + 1).padStart(2, '0')
    const year = date.getUTCFullYear()

    return `${day}-${month}-${year}`
  } catch {
    return dateStr
  }
}

function formatDateTimeUK(dateTimeStr) {
  if (!dateTimeStr) return ''
  try {
    const parsed = new Date(String(dateTimeStr).replace(' ', 'T'))
    if (Number.isNaN(parsed.getTime())) {
      return String(dateTimeStr)
    }

    const day = String(parsed.getDate()).padStart(2, '0')
    const month = String(parsed.getMonth() + 1).padStart(2, '0')
    const year = parsed.getFullYear()
    const hours = String(parsed.getHours()).padStart(2, '0')
    const minutes = String(parsed.getMinutes()).padStart(2, '0')

    return `${day}-${month}-${year} ${hours}:${minutes}`
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

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function formatDateWords(dateStr) {
  if (!dateStr) return ''
  try {
    const date = new Date(dateStr + 'T00:00:00Z')
    const day = date.getUTCDate()
    const month = MONTH_NAMES[date.getUTCMonth()]
    const year = date.getUTCFullYear()
    return `${day} ${month} ${year}`
  } catch {
    return dateStr
  }
}

function formatDisplayText(value, fallback = 'Not provided') {
  const normalized = String(value ?? '').trim()
  return normalized || fallback
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

export function AdminPortal({ bookingApiEndpoint = '', adminApiBase = '' }) {
  const baseUrl = useMemo(() => deriveAdminApiBase(bookingApiEndpoint, adminApiBase), [bookingApiEndpoint, adminApiBase])
  const [sessionToken, setSessionToken] = useState('')

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
  const [bookingDetailLoading, setBookingDetailLoading] = useState(false)
  const [bookingSaveLoading, setBookingSaveLoading] = useState(false)
  const [bookingDeleteLoading, setBookingDeleteLoading] = useState(false)

  const [users, setUsers] = useState([])
  const [assignableUsers, setAssignableUsers] = useState([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [userSaveLoadingId, setUserSaveLoadingId] = useState('')
  const [userDeleteLoadingId, setUserDeleteLoadingId] = useState('')
  const [userResetLoadingId, setUserResetLoadingId] = useState('')
  const [userDrafts, setUserDrafts] = useState({})
  const [resetPasswordResult, setResetPasswordResult] = useState(null)
  const [newUserForm, setNewUserForm] = useState({ username: '', role: 'viewer', password: '' })
  const [newUserLoading, setNewUserLoading] = useState(false)
  const [showCreateUserForm, setShowCreateUserForm] = useState(false)

  const [changePasswordForm, setChangePasswordForm] = useState({ currentPassword: '', newPassword: '' })
  const [changePasswordLoading, setChangePasswordLoading] = useState(false)

  const isAdmin = user?.role === 'admin'
  const isBookingsTab = activeTab === 'bookings'
  const isMyBookingsTab = activeTab === 'my-bookings'
  const myBookingsDriverUserId = isMyBookingsTab && user?.id !== undefined && user?.id !== null ? String(user.id) : ''
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
      const message = data?.message || 'Request failed.'
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
      setBookings(data.items || [])
      setBookingWindowCounts({
        pastCount: data.window?.pastCount ?? 0,
        futureCount: data.window?.futureCount ?? 0,
      })
      setSearchError('')
    } catch (error) {
      const errorMessage = error.message || 'Could not load bookings.'
      if (q.trim()) {
        setSearchError(errorMessage)
      } else {
        setBanner({ type: 'error', message: errorMessage })
      }
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
      const drafts = {}
      for (const item of data.items || []) {
        drafts[String(item.id)] = {
          username: String(item.username || ''),
          role: String(item.role || 'viewer'),
        }
      }
      setUserDrafts(drafts)
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

  const loadBookingDetail = useCallback(async (id) => {
    if (!id) return

    setSelectedBookingId(String(id))
    setBookingForm(null)
    setBookingDetailLoading(true)
    try {
      const data = await apiFetch(`/bookings/get.php?id=${encodeURIComponent(id)}`)
      setBookingForm(mapBookingToForm(data.item))
    } catch (error) {
      setSelectedBookingId('')
      setBanner({ type: 'error', message: error.message || 'Could not load booking details.' })
    } finally {
      setBookingDetailLoading(false)
    }
  }, [apiFetch])

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
    if (!user) {
      setBookings([])
      setBookingForm(null)
      setSelectedBookingId('')
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
    setBookingForm(null)
    setSelectedBookingId('')
    setActiveTab('bookings')
    setBanner({ type: 'success', message: 'You have been signed out.' })
  }

  async function handleSearchSubmit(event) {
    event.preventDefault()
    const trimmed = searchInput.trim()
    const window = getBookingWindowDates(pastWeeksVisible, futureWeeksVisible)

    setHasExecutedSearch(true)
    setSearchTerm(trimmed)
    setSelectedBookingId('')
    setBookingForm(null)
    await loadBookings({ q: trimmed, windowFrom: window.from, windowTo: window.to })
  }

  async function handleClearSearch() {
    const window = getBookingWindowDates(pastWeeksVisible, futureWeeksVisible)

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

  function handleBackToBookingResults() {
    setSelectedBookingId('')
    setBookingForm(null)
    setBookingDetailLoading(false)
  }

  function handleMyBookingsTabClick() {
    const driverUserId = user?.id !== undefined && user?.id !== null ? String(user.id) : ''
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

  async function handleBookingSave(event) {
    event.preventDefault()
    if (!bookingForm || !isAdmin) return

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
      await loadBookingDetail(bookingForm.id)
    } catch (error) {
      setBanner({ type: 'error', message: error.message || 'Could not update booking.' })
    } finally {
      setBookingSaveLoading(false)
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

      setNewUserForm({ username: '', role: 'viewer', password: '' })
      setShowCreateUserForm(false)
      setBanner({ type: 'success', message: 'User created successfully.' })
      await loadUsers()
    } catch (error) {
      setBanner({ type: 'error', message: error.message || 'Could not create user.' })
    } finally {
      setNewUserLoading(false)
    }
  }

  async function handleUpdateUser(userId) {
    const draft = userDrafts[String(userId)]
    if (!draft || !isAdmin) return

    setUserSaveLoadingId(String(userId))
    setBanner({ type: 'idle', message: '' })

    try {
      await apiFetch('/users/update.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: userId,
          username: draft.username,
          role: draft.role,
        }),
      })

      setBanner({ type: 'success', message: 'User updated successfully.' })
      await loadUsers()
      if (String(user?.id) === String(userId)) {
        await refreshSession()
      }
    } catch (error) {
      setBanner({ type: 'error', message: error.message || 'Could not update user.' })
    } finally {
      setUserSaveLoadingId('')
    }
  }

  async function handleResetUserPassword(userId) {
    if (!isAdmin) return

    setUserResetLoadingId(String(userId))
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
      setUserResetLoadingId('')
    }
  }

  async function handleCopyTemporaryPassword() {
    if (!resetPasswordResult?.temporaryPassword) return

    try {
      const copyText = `Your username is ${resetPasswordResult.username} and your password is ${resetPasswordResult.temporaryPassword}`
      await navigator.clipboard.writeText(copyText)
      setBanner({ type: 'success', message: 'Login credentials copied to clipboard.' })
    } catch {
      setBanner({ type: 'error', message: 'Could not copy the login credentials.' })
    }
  }

  async function handleDeleteUser(userId, username) {
    if (!isAdmin) return

    const confirmed = window.confirm(`Delete user ${username}? This cannot be undone.`)
    if (!confirmed) return

    setUserDeleteLoadingId(String(userId))
    setBanner({ type: 'idle', message: '' })

    try {
      await apiFetch('/users/delete.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId }),
      })

      setBanner({ type: 'success', message: 'User deleted successfully.' })
      await loadUsers()
    } catch (error) {
      setBanner({ type: 'error', message: error.message || 'Could not delete user.' })
    } finally {
      setUserDeleteLoadingId('')
    }
  }

  async function handleChangePassword(event) {
    event.preventDefault()
    setChangePasswordLoading(true)
    setBanner({ type: 'idle', message: '' })

    try {
      await apiFetch('/auth/change-password.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changePasswordForm),
      })

      setChangePasswordForm({ currentPassword: '', newPassword: '' })
      setSessionToken('')
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem('eddie_admin_session_token')
      }
      setUser(null)
      setBanner({ type: 'success', message: 'Password changed. Please sign in again.' })
    } catch (error) {
      setBanner({ type: 'error', message: error.message || 'Could not change password.' })
    } finally {
      setChangePasswordLoading(false)
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

          {banner.type !== 'idle' && (
            <p className={`admin-banner admin-banner-${banner.type}`}>{banner.message}</p>
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
              <p>Welcome {user.username}</p>
            </div>
          </div>
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

        {banner.type !== 'idle' && (
          <p className={`admin-banner admin-banner-${banner.type}`}>{banner.message}</p>
        )}

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
                <h2>{isMyBookingsTab ? 'My Bookings' : 'All Bookings'}</h2>
                {isMyBookingsTab ? (
                  <p>Bookings assigned to {user.username}.</p>
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
                        item.driver_username ? '' : 'is-missing-driver',
                      ].filter(Boolean).join(' ')}
                      onClick={() => loadBookingDetail(item.id)}
                    >
                      <td>{formatBookingDateAndTime(item.booking_date, item.pickup_time)}</td>
                      <td>{item.organisation}</td>
                      <td>{item.destination_name}</td>
                      <td>
                        {item.driver_username ? item.driver_username : <strong>Unassigned</strong>}
                      </td>
                      <td>{item.status}</td>
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
              <section className="admin-editor" aria-label="Booking details">
                <div className="admin-detail-header">
                    <button
                    className="button button-quiet"
                    type="button"
                    onClick={handleBackToBookingResults}
                  >
                    <FontAwesomeIcon icon={faArrowLeft} aria-hidden="true" />
                      Back to {isBookingsTab && hasExecutedSearch ? 'search results' : 'booking list'}
                  </button>
                  <h2>Booking Details</h2>
                </div>
              {bookingDetailLoading && <p>Loading booking details...</p>}
              {!bookingDetailLoading && !bookingForm && <p>Could not load booking details.</p>}
              {!bookingDetailLoading && bookingForm && (
                <form className="admin-form-grid" onSubmit={isAdmin ? handleBookingSave : undefined}>

                  <label>
                    <span>Status</span>
                    {isAdmin ? (
                      <select
                        value={bookingForm.status}
                        onChange={(event) => handleBookingFieldChange('status', event.target.value)}
                      >
                        <option value="pending">pending</option>
                        <option value="confirmed">confirmed</option>
                        <option value="cancelled">cancelled</option>
                        <option value="completed">completed</option>
                      </select>
                    ) : (
                      <div className="admin-readonly-value">{formatDisplayText(bookingForm.status, 'pending')}</div>
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
                          <option key={item.id} value={String(item.id)}>{item.username}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="admin-readonly-value">{formatDisplayText(bookingForm.driverUsername, 'Unassigned')}</div>
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

                  <label>
                    <span>Created at</span>
                    <div className="admin-readonly-value">{formatDisplayText(bookingForm.createdAt)}</div>
                  </label>

                  <label>
                    <span>Updated at</span>
                    <div className="admin-readonly-value">{formatDisplayText(bookingForm.updatedAt)}</div>
                  </label>

                  {isAdmin && (
                    <div className="field-full admin-inline-actions">
                      <button className="button button-primary" type="submit" disabled={bookingSaveLoading}>
                        <FontAwesomeIcon icon={faFloppyDisk} aria-hidden="true" />
                        {bookingSaveLoading ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button className="button button-danger" type="button" disabled={bookingDeleteLoading} onClick={handleBookingDelete}>
                        <FontAwesomeIcon icon={faTrash} aria-hidden="true" />
                        {bookingDeleteLoading ? 'Deleting...' : 'Delete Permanently'}
                      </button>
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
                <p>Create, edit, reset passwords, and delete users.</p>
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
                  <button className="button button-primary" type="button" onClick={handleCopyTemporaryPassword}>
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
                    <th>Username</th>
                    <th>Role</th>
                    <th>Last login</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((item) => {
                    const draft = userDrafts[String(item.id)] || { username: item.username, role: item.role }
                    return (
                      <tr key={item.id}>
                        <td>
                          <input
                            value={draft.username}
                            onChange={(event) => setUserDrafts((current) => ({
                              ...current,
                              [String(item.id)]: {
                                ...draft,
                                username: event.target.value,
                              },
                            }))}
                          />
                        </td>
                        <td>
                          <select
                            value={draft.role}
                            onChange={(event) => setUserDrafts((current) => ({
                              ...current,
                              [String(item.id)]: {
                                ...draft,
                                role: event.target.value,
                              },
                            }))}
                          >
                            <option value="viewer">viewer</option>
                            <option value="admin">admin</option>
                          </select>
                        </td>
                        <td>{item.last_login_at || 'Never'}</td>
                        <td>
                          <div className="admin-inline-actions">
                            <button className="button button-quiet" type="button" onClick={() => handleUpdateUser(item.id)} disabled={userSaveLoadingId === String(item.id)}>
                              <FontAwesomeIcon icon={faFloppyDisk} aria-hidden="true" />
                              {userSaveLoadingId === String(item.id) ? 'Saving...' : 'Save'}
                            </button>
                            <button className="button button-quiet" type="button" onClick={() => handleResetUserPassword(item.id)} disabled={userResetLoadingId === String(item.id)}>
                              <FontAwesomeIcon icon={faRotate} aria-hidden="true" />
                              {userResetLoadingId === String(item.id) ? 'Resetting...' : 'Reset Password'}
                            </button>
                            <button className="button button-danger" type="button" onClick={() => handleDeleteUser(item.id, item.username)} disabled={userDeleteLoadingId === String(item.id)}>
                              <FontAwesomeIcon icon={faTrash} aria-hidden="true" />
                              {userDeleteLoadingId === String(item.id) ? 'Deleting...' : 'Delete'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {!usersLoading && users.length === 0 && (
                    <tr>
                      <td colSpan={4}>No users found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeTab === 'account' && (
          <section className="admin-section" aria-label="My account">
            <div className="admin-section-heading">
              <div>
                <h2>Change Password</h2>
                <p>Changing your password signs you out of all current sessions.</p>
              </div>
            </div>

            <form className="admin-form-grid" onSubmit={handleChangePassword}>
              <label>
                <span>Current password</span>
                <input
                  type="password"
                  value={changePasswordForm.currentPassword}
                  onChange={(event) => setChangePasswordForm((current) => ({ ...current, currentPassword: event.target.value }))}
                  required
                />
              </label>

              <label>
                <span>New password</span>
                <input
                  type="password"
                  minLength={8}
                  value={changePasswordForm.newPassword}
                  onChange={(event) => setChangePasswordForm((current) => ({ ...current, newPassword: event.target.value }))}
                  required
                />
              </label>

              <div className="field-full admin-inline-actions">
                <button className="button button-primary" type="submit" disabled={changePasswordLoading}>
                  <FontAwesomeIcon icon={faKey} aria-hidden="true" />
                  {changePasswordLoading ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </section>
        )}
      </section>
    </main>
  )
}
