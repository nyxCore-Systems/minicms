// Pure normalizers for the two free-form JSON columns on SiteSettings
// (`socialLinks`, `contactAddress`). Kept import-free so both getSiteSettings
// (server) and the unit tests can use them without pulling in Prisma.

export interface ContactAddress {
  venueName?: string
  street?: string
  postalCode?: string
  locality?: string
  region?: string
  country?: string
  lat?: number
  lng?: number
}

/** Keep only clean, non-empty URL strings; anything else is dropped. */
export function normalizeSocialLinks(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
    .map((x) => x.trim())
}

function toStr(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim().length > 0 ? v.trim() : undefined
}

function toNum(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string' && v.trim().length > 0) {
    const n = Number(v)
    if (Number.isFinite(n)) return n
  }
  return undefined
}

/**
 * Coerce the stored JSON into a typed ContactAddress. Strings are trimmed,
 * geo coordinates are parsed to finite numbers (the admin form submits them as
 * text), empty fields are dropped. Returns null when nothing usable remains.
 */
export function normalizeContactAddress(raw: unknown): ContactAddress | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const addr: ContactAddress = {
    venueName: toStr(r.venueName),
    street: toStr(r.street),
    postalCode: toStr(r.postalCode),
    locality: toStr(r.locality),
    region: toStr(r.region),
    country: toStr(r.country),
    lat: toNum(r.lat),
    lng: toNum(r.lng),
  }
  const hasAny = Object.values(addr).some((v) => v !== undefined)
  return hasAny ? addr : null
}
