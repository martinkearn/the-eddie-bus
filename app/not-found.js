'use client'

import { useEffect } from 'react'

const legacyRoutes = {
  'about us': '/about-us/',
  contacts: '/contact-us/',
  gallery: '/about-us/',
  home: '/',
  'latest news': '/',
  'what we do': '/about-us/',
}

function getLegacyRedirect(pathname) {
  const trimmedPath = decodeURIComponent(pathname)
    .replace(/^\/+|\/+$/g, '')
    .replace(/\.html$/i, '')

  const adminMatch = trimmedPath.match(/^admin\/(.+)$/i)
  if (adminMatch && adminMatch[1]) {
    return `/admin/?bookingRef=${encodeURIComponent(adminMatch[1])}`
  }

  const legacyKey = trimmedPath
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()

  return legacyRoutes[legacyKey] || '/'
}

export default function NotFound() {
  useEffect(() => {
    window.location.replace(getLegacyRedirect(window.location.pathname))
  }, [])

  return null
}
