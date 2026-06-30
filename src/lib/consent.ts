'use client'

import { useEffect, useState } from 'react'

// Opt-in analytics consent (TTDSG §25 / GDPR). The festival site runs only
// first-party analytics (own /api/tracking) — no third-party scripts. Storing
// the consent decision itself is "strictly necessary" and needs no consent.
export const CONSENT_KEY = '_dm_consent'

export type ConsentStatus = 'granted' | 'denied' | 'unset'

export const CHANGE_EVENT = 'dm-consent-change'
export const OPEN_EVENT = 'dm-consent-open'

export function getConsent(): ConsentStatus {
  if (typeof window === 'undefined') return 'unset'
  try {
    const v = localStorage.getItem(CONSENT_KEY)
    return v === 'granted' ? 'granted' : v === 'denied' ? 'denied' : 'unset'
  } catch {
    return 'unset'
  }
}

export function setConsent(status: 'granted' | 'denied'): void {
  try {
    localStorage.setItem(CONSENT_KEY, status)
  } catch {
    /* storage blocked — decision simply isn't persisted */
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: status }))
  }
}

// Single guard every tracking call site checks before sending anything.
export function isTrackingAllowed(): boolean {
  return getConsent() === 'granted'
}

// Re-open the banner so the user can withdraw or change consent (GDPR: must be
// as easy to withdraw as to give). A footer link dispatches this.
export function openConsentSettings(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(OPEN_EVENT))
  }
}

// Reactive hook for the banner + any component that should respond to consent.
export function useConsent() {
  const [status, setStatus] = useState<ConsentStatus>('unset')

  useEffect(() => {
    setStatus(getConsent())
    const sync = () => setStatus(getConsent())
    window.addEventListener(CHANGE_EVENT, sync)
    window.addEventListener('storage', sync) // cross-tab
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  return {
    status,
    accept: () => setConsent('granted'),
    decline: () => setConsent('denied'),
  }
}
