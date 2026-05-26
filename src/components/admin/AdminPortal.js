'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'

const PAGE_SIZE = 25

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
    sourceIp: String(booking.source_ip || ''),
    userAgent: String(booking.user_agent || ''),
    createdAt: String(booking.created_at || ''),
    updatedAt: String(booking.updated_at || ''),
  }
}

function formatDateUK(dateStr) {
  if (!dateStr) return ''
  try {
    const date = new Date(dateStr + 'T00:00:00Z')
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    
    const day = date.getUTCDate()
    const dayOfWeek = date.getUTCDay()
    const month = date.getUTCMonth()
    const year = date.getUTCFullYear()
    
    const ordinal = day === 1 || day === 21 || day === 31 ? 'st' : day === 2 || day === 22 ? 'nd' : day === 3 || day === 23 ? 'rd' : 'th'
    
    return `${dayNames[dayOfWeek]} ${day}${ordinal} ${monthNames[month]} ${year}`
  } catch {
    return dateStr
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
  const [bookingsLoading, setBookingsLoading] = useState(false)
  const [bookings, setBookings] = useState([])
  const [nextOffset, setNextOffset] = useState(0)
  const [hasMore, setHasMore] = useState(false)

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

  const loadBookings = useCallback(async ({ reset = false, q = searchTerm } = {}) => {
    if (!user) return

    setBookingsLoading(true)
    try {
      const offset = reset ? 0 : nextOffset
      const query = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(offset),
      })
      if (q.trim()) {
        query.set('q', q.trim())
      }

      const data = await apiFetch(`/bookings/list.php?${query.toString()}`)
      setBookings((current) => (reset ? data.items : [...current, ...data.items]))
      setNextOffset(data.pagination?.nextOffset || 0)
      setHasMore(Boolean(data.pagination?.hasMore))
    } catch (error) {
      setBanner({ type: 'error', message: error.message || 'Could not load bookings.' })
    } finally {
      setBookingsLoading(false)
    }
  }, [apiFetch, nextOffset, searchTerm, user])

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

    if (String(selectedBookingId) === String(id)) {
      setSelectedBookingId('')
      setBookingForm(null)
      return
    }

    setBookingDetailLoading(true)
    try {
      const data = await apiFetch(`/bookings/get.php?id=${encodeURIComponent(id)}`)
      setSelectedBookingId(String(id))
      setBookingForm(mapBookingToForm(data.item))
    } catch (error) {
      setBanner({ type: 'error', message: error.message || 'Could not load booking details.' })
    } finally {
      setBookingDetailLoading(false)
    }
  }, [apiFetch, selectedBookingId])

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

    loadBookings({ reset: true, q: '' })
  }, [user, loadBookings])

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
    if (activeTab !== 'bookings' || searchTerm.trim() !== '' || !user) {
      return undefined
    }

    const pollBookings = async () => {
      try {
        const query = new URLSearchParams({
          limit: String(PAGE_SIZE),
          offset: '0',
        })
        const data = await apiFetch(`/bookings/list.php?${query.toString()}`)
        const newItems = data.items || []

        setBookings((current) => {
          const existingIds = new Set(current.map((b) => b.id))
          const genuinelyNew = newItems.filter((b) => !existingIds.has(b.id))
          return [...genuinelyNew, ...current]
        })
      } catch {
        // Silently fail polling to avoid spamming errors
      }
    }

    const intervalId = window.setInterval(pollBookings, 30000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [activeTab, searchTerm, user, apiFetch])

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
      setBanner({ type: 'success', message: 'Signed in successfully.' })
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
    setBanner({ type: 'success', message: 'You have been signed out.' })
  }

  async function handleSearchSubmit(event) {
    event.preventDefault()
    const trimmed = searchInput.trim()
    setSearchTerm(trimmed)
    setSelectedBookingId('')
    setBookingForm(null)
    setNextOffset(0)
    await loadBookings({ reset: true, q: trimmed })
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

      setBanner({ type: 'success', message: 'Booking updated successfully.' })
      await loadBookings({ reset: true, q: searchTerm })
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
              {loginLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p>
            Forgot your password? <Link href="/admin/forgot-password/">Request a reset</Link>
          </p>
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
            <Link className="button button-quiet" href="/">Back To Main Site</Link>
            <button className="button button-quiet" type="button" onClick={handleLogout}>Sign Out</button>
          </div>
        </header>

        {banner.type !== 'idle' && (
          <p className={`admin-banner admin-banner-${banner.type}`}>{banner.message}</p>
        )}

        <nav className="admin-tabs" aria-label="Admin sections" role="tablist">
          <button type="button" role="tab" aria-selected={activeTab === 'bookings'} className={activeTab === 'bookings' ? 'is-active' : ''} onClick={() => setActiveTab('bookings')}>Bookings</button>
          {isAdmin && (
            <button type="button" role="tab" aria-selected={activeTab === 'users'} className={activeTab === 'users' ? 'is-active' : ''} onClick={() => setActiveTab('users')}>Users</button>
          )}
          <button type="button" role="tab" aria-selected={activeTab === 'account'} className={activeTab === 'account' ? 'is-active' : ''} onClick={() => setActiveTab('account')}>My Account</button>
        </nav>

        {activeTab === 'bookings' && (
          <section className="admin-section" aria-label="Booking management">
            <div className="admin-section-heading">
              <div>
                <h2>Bookings</h2>
              </div>
              <Link className="button button-primary" href="/bookings/">Create Booking</Link>
            </div>

            <form className="admin-search" onSubmit={handleSearchSubmit}>
              <input
                type="search"
                placeholder="Search all booking fields"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
              />
              <button className="button button-primary" type="submit" disabled={bookingsLoading}>Search</button>
            </form>

            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Booking Ref</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Driver</th>
                    <th>Organisation</th>
                    <th>Destination</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((item) => (
                    <tr
                      key={item.id}
                      className={String(selectedBookingId) === String(item.id) ? 'is-selected' : ''}
                      onClick={() => loadBookingDetail(item.id)}
                    >
                      <td>{item.booking_ref}</td>
                      <td>{formatDateUK(item.booking_date)}</td>
                      <td>{item.status}</td>
                      <td>{item.driver_username || 'Unassigned'}</td>
                      <td>{item.organisation}</td>
                      <td>{item.destination_name}</td>
                    </tr>
                  ))}
                  {!bookingsLoading && bookings.length === 0 && (
                    <tr>
                      <td colSpan={6}>No bookings found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="admin-inline-actions">
              <button
                className="button button-quiet"
                type="button"
                disabled={bookingsLoading || !hasMore}
                onClick={() => loadBookings({ reset: false, q: searchTerm })}
              >
                {bookingsLoading ? 'Loading...' : hasMore ? 'Load More' : 'No More Bookings'}
              </button>
            </div>

            <section className="admin-editor" aria-label="Booking details">
              <h2>Booking Details</h2>
              {bookingDetailLoading && <p>Loading booking details...</p>}
              {!bookingDetailLoading && !bookingForm && <p>Select a booking row to view details.</p>}
              {!bookingDetailLoading && bookingForm && (
                <form className="admin-form-grid" onSubmit={handleBookingSave}>
                  <label>
                    <span>Booking reference</span>
                    <input
                      value={bookingForm.bookingRef}
                      onChange={(event) => handleBookingFieldChange('bookingRef', event.target.value)}
                      disabled={!isAdmin}
                      required
                    />
                  </label>

                  <label>
                    <span>Status</span>
                    <select
                      value={bookingForm.status}
                      onChange={(event) => handleBookingFieldChange('status', event.target.value)}
                      disabled={!isAdmin}
                    >
                      <option value="pending">pending</option>
                      <option value="confirmed">confirmed</option>
                      <option value="cancelled">cancelled</option>
                      <option value="completed">completed</option>
                    </select>
                  </label>

                  <label>
                    <span>Driver</span>
                    <select
                      value={bookingForm.driverUserId}
                      onChange={(event) => handleBookingFieldChange('driverUserId', event.target.value)}
                      disabled={!isAdmin}
                    >
                      <option value="">Unassigned</option>
                      {assignableUsers.map((item) => (
                        <option key={item.id} value={String(item.id)}>{item.username}</option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span>Booking date</span>
                    <input
                      type="date"
                      value={bookingForm.bookingDate}
                      onChange={(event) => handleBookingFieldChange('bookingDate', event.target.value)}
                      disabled={!isAdmin}
                      required
                    />
                  </label>

                  <label>
                    <span>Pickup time</span>
                    <input
                      type="time"
                      value={bookingForm.pickupTime}
                      onChange={(event) => handleBookingFieldChange('pickupTime', event.target.value)}
                      disabled={!isAdmin}
                      required
                    />
                  </label>

                  <label>
                    <span>Organisation</span>
                    <input
                      value={bookingForm.organisation}
                      onChange={(event) => handleBookingFieldChange('organisation', event.target.value)}
                      disabled={!isAdmin}
                      required
                    />
                  </label>

                  <label>
                    <span>Destination</span>
                    <input
                      value={bookingForm.destinationName}
                      onChange={(event) => handleBookingFieldChange('destinationName', event.target.value)}
                      disabled={!isAdmin}
                      required
                    />
                  </label>

                  <label className="field-full">
                    <span>Destination address</span>
                    <input
                      value={bookingForm.destinationAddress}
                      onChange={(event) => handleBookingFieldChange('destinationAddress', event.target.value)}
                      disabled={!isAdmin}
                    />
                  </label>

                  <label>
                    <span>Contact name</span>
                    <input
                      value={bookingForm.contactName}
                      onChange={(event) => handleBookingFieldChange('contactName', event.target.value)}
                      disabled={!isAdmin}
                      required
                    />
                  </label>

                  <label>
                    <span>Contact email</span>
                    <input
                      type="email"
                      value={bookingForm.contactEmail}
                      onChange={(event) => handleBookingFieldChange('contactEmail', event.target.value)}
                      disabled={!isAdmin}
                      required
                    />
                  </label>

                  <label>
                    <span>Contact number</span>
                    <input
                      value={bookingForm.contactNumber}
                      onChange={(event) => handleBookingFieldChange('contactNumber', event.target.value)}
                      disabled={!isAdmin}
                      required
                    />
                  </label>

                  <label>
                    <span>Static wheelchairs</span>
                    <select
                      value={bookingForm.staticWheelchairs ? 'yes' : 'no'}
                      onChange={(event) => handleBookingFieldChange('staticWheelchairs', event.target.value === 'yes')}
                      disabled={!isAdmin}
                    >
                      <option value="no">No</option>
                      <option value="yes">Yes</option>
                    </select>
                  </label>

                  <label>
                    <span>Powered wheelchairs</span>
                    <select
                      value={bookingForm.poweredWheelchairs ? 'yes' : 'no'}
                      onChange={(event) => handleBookingFieldChange('poweredWheelchairs', event.target.value === 'yes')}
                      disabled={!isAdmin}
                    >
                      <option value="no">No</option>
                      <option value="yes">Yes</option>
                    </select>
                  </label>

                  <label>
                    <span>Passenger transfers</span>
                    <select
                      value={bookingForm.passengerTransfers ? 'yes' : 'no'}
                      onChange={(event) => handleBookingFieldChange('passengerTransfers', event.target.value === 'yes')}
                      disabled={!isAdmin}
                    >
                      <option value="no">No</option>
                      <option value="yes">Yes</option>
                    </select>
                  </label>

                  <label className="field-full">
                    <span>Special requirements</span>
                    <textarea
                      rows={4}
                      value={bookingForm.specialRequirements}
                      onChange={(event) => handleBookingFieldChange('specialRequirements', event.target.value)}
                      disabled={!isAdmin}
                    />
                  </label>

                  <label className="field-full">
                    <span>Admin Notes</span>
                    <small style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--muted)', fontSize: '0.85rem' }}>Internal notes only shown to admin portal users</small>
                    <textarea
                      rows={4}
                      value={bookingForm.adminNotes}
                      onChange={(event) => handleBookingFieldChange('adminNotes', event.target.value)}
                      disabled={!isAdmin}
                    />
                  </label>

                  <label className="field-full">
                    <span>Source IP</span>
                    <input value={bookingForm.sourceIp} disabled />
                  </label>

                  <label className="field-full">
                    <span>User agent</span>
                    <textarea value={bookingForm.userAgent} rows={2} disabled />
                  </label>

                  <label>
                    <span>Created at</span>
                    <input value={bookingForm.createdAt} disabled />
                  </label>

                  <label>
                    <span>Updated at</span>
                    <input value={bookingForm.updatedAt} disabled />
                  </label>

                  {isAdmin && (
                    <div className="field-full admin-inline-actions">
                      <button className="button button-primary" type="submit" disabled={bookingSaveLoading}>
                        {bookingSaveLoading ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button className="button button-danger" type="button" disabled={bookingDeleteLoading} onClick={handleBookingDelete}>
                        {bookingDeleteLoading ? 'Deleting...' : 'Delete Permanently'}
                      </button>
                    </div>
                  )}
                </form>
              )}
            </section>
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
                    Copy
                  </button>
                  <button className="button button-quiet" type="button" onClick={() => setResetPasswordResult(null)}>
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
                      {newUserLoading ? 'Creating...' : 'Create User'}
                    </button>
                    <button className="button button-quiet" type="button" onClick={() => setShowCreateUserForm(false)}>
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
                              {userSaveLoadingId === String(item.id) ? 'Saving...' : 'Save'}
                            </button>
                            <button className="button button-quiet" type="button" onClick={() => handleResetUserPassword(item.id)} disabled={userResetLoadingId === String(item.id)}>
                              {userResetLoadingId === String(item.id) ? 'Resetting...' : 'Reset Password'}
                            </button>
                            <button className="button button-danger" type="button" onClick={() => handleDeleteUser(item.id, item.username)} disabled={userDeleteLoadingId === String(item.id)}>
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
            <h2>Change Password</h2>
            <p>Changing your password signs you out of all current sessions.</p>

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
