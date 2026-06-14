'use client'

import { useCallback } from 'react'
import { usePathname } from 'next/navigation'

function getSessionId(): string {
  const key = '_dm_sid'
  let sid = sessionStorage.getItem(key)
  if (!sid) {
    sid = Math.random().toString(36).substring(2) + Date.now().toString(36)
    sessionStorage.setItem(key, sid)
  }
  return sid
}

interface VendorClickTrackerProps {
  vendorId: string
  clickType: string
  targetUrl?: string
  children: React.ReactNode
  className?: string
  href?: string
}

export default function VendorClickTracker({
  vendorId,
  clickType,
  targetUrl,
  children,
  className,
  href,
}: VendorClickTrackerProps) {
  const pathname = usePathname()

  const trackClick = useCallback(() => {
    const payload = JSON.stringify({
      vendorId,
      clickType,
      path: pathname,
      targetUrl: targetUrl || href,
      sessionId: getSessionId(),
    })

    if (navigator.sendBeacon) {
      navigator.sendBeacon(
        '/api/tracking/vendor-click',
        new Blob([payload], { type: 'application/json' })
      )
    } else {
      fetch('/api/tracking/vendor-click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      }).catch(() => {})
    }
  }, [vendorId, clickType, targetUrl, href, pathname])

  if (href) {
    return (
      <a
        href={href}
        className={className}
        target="_blank"
        rel="noopener noreferrer"
        onClick={trackClick}
      >
        {children}
      </a>
    )
  }

  return (
    <div
      onClick={trackClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          trackClick()
        }
      }}
      className={className}
      role="button"
      tabIndex={0}
    >
      {children}
    </div>
  )
}
