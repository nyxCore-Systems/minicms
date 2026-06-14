'use client'

import { useEffect, useRef, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { onCLS, onFCP, onINP, onLCP, onTTFB } from 'web-vitals'

function getSessionId(): string {
  const key = '_dm_sid'
  let sid = sessionStorage.getItem(key)
  if (!sid) {
    sid = Math.random().toString(36).substring(2) + Date.now().toString(36)
    sessionStorage.setItem(key, sid)
  }
  return sid
}

function sendEvent(
  eventType: string,
  path: string,
  eventData: Record<string, unknown>,
  beacon = false,
) {
  const payload = JSON.stringify({
    eventType,
    path,
    sessionId: getSessionId(),
    eventData,
  })

  if (beacon && navigator.sendBeacon) {
    navigator.sendBeacon(
      '/api/tracking',
      new Blob([payload], { type: 'application/json' }),
    )
    return
  }

  fetch('/api/tracking', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
    keepalive: true,
  }).catch(() => {})
}

export default function TrackPageView() {
  const pathname = usePathname()
  const pageEntryTime = useRef<number>(0)
  const scrollMilestones = useRef<Set<number>>(new Set())
  const vitalsReported = useRef(false)

  const trackTimeOnPage = useCallback(
    (beacon: boolean) => {
      if (!pageEntryTime.current) return
      const duration = Math.round(
        (Date.now() - pageEntryTime.current) / 1000,
      )
      if (duration < 1) return
      sendEvent('time_on_page', pathname, { duration }, beacon)
    },
    [pathname],
  )

  // Pageview tracking
  useEffect(() => {
    if (pathname.startsWith('/admin')) return

    sendEvent('pageview', pathname, {
      referrer: document.referrer || null,
      userAgent: navigator.userAgent,
    })
  }, [pathname])

  // Scroll depth tracking
  useEffect(() => {
    if (pathname.startsWith('/admin')) return

    scrollMilestones.current = new Set()

    const handleScroll = () => {
      const scrollTop = window.scrollY
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      if (docHeight <= 0) return

      const percent = Math.round((scrollTop / docHeight) * 100)

      for (const milestone of [25, 50, 75, 100]) {
        if (
          percent >= milestone &&
          !scrollMilestones.current.has(milestone)
        ) {
          scrollMilestones.current.add(milestone)
          sendEvent('scroll_depth', pathname, { depth: milestone })
        }
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [pathname])

  // Time on page tracking
  useEffect(() => {
    if (pathname.startsWith('/admin')) return

    pageEntryTime.current = Date.now()

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        trackTimeOnPage(true)
      }
    }

    const handleBeforeUnload = () => {
      trackTimeOnPage(true)
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      trackTimeOnPage(false)
      pageEntryTime.current = 0
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [pathname, trackTimeOnPage])

  // Web Vitals tracking (report once per session)
  useEffect(() => {
    if (vitalsReported.current) return
    vitalsReported.current = true

    const reportVital = ({
      name,
      value,
      rating,
    }: {
      name: string
      value: number
      rating: string
    }) => {
      sendEvent('web_vital', pathname, {
        metric: name,
        value: Math.round(value * 100) / 100,
        rating,
      })
    }

    onCLS(reportVital)
    onFCP(reportVital)
    onINP(reportVital)
    onLCP(reportVital)
    onTTFB(reportVital)
  }, [pathname])

  return null
}
