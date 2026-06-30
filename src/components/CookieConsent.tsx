'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useConsent, OPEN_EVENT } from '@/lib/consent'

// Opt-in consent banner for the site's own analytics. Reject is offered with
// the same prominence as accept (TTDSG/GDPR). It appears until the visitor
// decides, and can be re-opened from the footer to withdraw consent.
export default function CookieConsent() {
  const { status, accept, decline } = useConsent()
  const [mounted, setMounted] = useState(false)
  const [reopened, setReopened] = useState(false)

  useEffect(() => {
    setMounted(true)
    const open = () => setReopened(true)
    window.addEventListener(OPEN_EVENT, open)
    return () => window.removeEventListener(OPEN_EVENT, open)
  }, [])

  // Hide until we know the stored decision (avoids SSR/first-paint flash).
  if (!mounted) return null
  const visible = status === 'unset' || reopened
  if (!visible) return null

  const choose = (fn: () => void) => {
    fn()
    setReopened(false)
  }

  return (
    <div className="nh-cc" role="dialog" aria-modal="false" aria-label="Cookie-Einstellungen">
      <div className="nh-cc-inner">
        <div className="nh-cc-text">
          <strong>Wir messen anonym, wie die Seite genutzt wird.</strong>{' '}
          Nur eigene Statistik (keine Werbe-Tracker, keine Weitergabe an Dritte).
          Du entscheidest – jederzeit widerrufbar.{' '}
          <Link href="/datenschutz" className="nh-cc-link">
            Datenschutz
          </Link>
        </div>
        <div className="nh-cc-actions">
          <button type="button" className="nh-cc-btn nh-cc-decline" onClick={() => choose(decline)}>
            Ablehnen
          </button>
          <button type="button" className="nh-cc-btn nh-cc-accept" onClick={() => choose(accept)}>
            Akzeptieren
          </button>
        </div>
      </div>
    </div>
  )
}
