"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function RouteRedirect({ to }) {
  const router = useRouter()

  useEffect(() => {
    router.replace(to)
  }, [router, to])

  return null
}