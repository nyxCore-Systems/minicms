'use client'

import { openConsentSettings } from '@/lib/consent'

// Lets visitors re-open the consent banner to change or withdraw their choice.
export default function CookieSettingsLink({ className }: { className?: string }) {
  return (
    <button type="button" onClick={openConsentSettings} className={className}>
      Cookie-Einstellungen
    </button>
  )
}
