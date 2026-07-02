import { prisma, withRetry } from './prisma'
import { getTenant } from './tenant'

export interface MenuItemChild {
  id: string
  label: string
  href: string
  sortOrder: number
  isVisible: boolean
  parentId: string | null
}

export interface MenuItemData {
  id: string
  label: string
  href: string
  sortOrder: number
  isVisible: boolean
  parentId: string | null
  children: MenuItemChild[]
}

/** Contact address block persisted as JSON on SiteSettings (wave 2). */
export interface ContactAddress {
  streetAddress?: string
  addressLocality?: string
  postalCode?: string
  addressRegion?: string
  addressCountry?: string
  latitude?: number
  longitude?: number
  telephone?: string
  email?: string
}

export interface SiteSettingsData {
  siteName: string
  logoUrl: string | null
  darkMode: boolean
  footerText: string | null
  primaryColor: string
  accentColor: string
  backgroundColor: string
  fontHeading: string
  fontBody: string
  faviconUrl: string | null
  backgroundImage: string | null
  themeSlug: string
  defaultDarkMode: boolean
  ctaButtonLabel: string | null
  ctaButtonHref: string | null
  locale: string
  logoMode: string
  socialLinks: string[]
  contactAddress: ContactAddress | null
}

const defaultSettings: SiteSettingsData = {
  siteName: 'e-Ventschau',
  logoUrl: null,
  darkMode: false,
  footerText: null,
  primaryColor: '#051A2E',
  accentColor: '#FAB90C',
  backgroundColor: '#faf8f0',
  fontHeading: 'Georgia',
  fontBody: 'Inter',
  faviconUrl: null,
  backgroundImage: null,
  themeSlug: 'noir',
  defaultDarkMode: true,
  ctaButtonLabel: null,
  ctaButtonHref: null,
  locale: 'de',
  logoMode: 'auto',
  socialLinks: [],
  contactAddress: null,
}

/**
 * Best-effort validation of the socialLinks JSON column. Only https URLs
 * survive — `sameAs` must stay clean for Knowledge Graph matching, and a
 * single bad row must never break JSON-LD emission site-wide.
 */
function normalizeSocialLinks(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  const out: string[] = []
  for (const entry of raw) {
    if (typeof entry !== 'string') continue
    const trimmed = entry.trim()
    if (!trimmed) continue
    try {
      const url = new URL(trimmed)
      if (url.protocol !== 'https:') continue
      out.push(url.toString())
    } catch {
      // ignore malformed entries
    }
  }
  return out
}

function normalizeContactAddress(raw: unknown): ContactAddress | null {
  if (!raw || typeof raw !== 'object') return null
  const src = raw as Record<string, unknown>
  const pick = (k: string): string | undefined =>
    typeof src[k] === 'string' && (src[k] as string).trim().length > 0
      ? (src[k] as string).trim()
      : undefined
  const num = (k: string): number | undefined =>
    typeof src[k] === 'number' && Number.isFinite(src[k]) ? (src[k] as number) : undefined

  const addr: ContactAddress = {
    streetAddress: pick('streetAddress'),
    addressLocality: pick('addressLocality'),
    postalCode: pick('postalCode'),
    addressRegion: pick('addressRegion'),
    addressCountry: pick('addressCountry'),
    latitude: num('latitude'),
    longitude: num('longitude'),
    telephone: pick('telephone'),
    email: pick('email'),
  }
  const anyValue = Object.values(addr).some((v) => v !== undefined)
  return anyValue ? addr : null
}

export async function getMenuItems(location: string = 'header'): Promise<MenuItemData[]> {
  const tenant = await getTenant()
  if (!tenant) return []

  const items = await withRetry(() =>
    prisma.menuItem.findMany({
      where: { tenantId: tenant.id, isVisible: true, parentId: null, location },
      include: {
        children: { where: { isVisible: true }, orderBy: { sortOrder: 'asc' } },
      },
      orderBy: { sortOrder: 'asc' },
    })
  )

  return items
}

export async function getSiteSettings(): Promise<SiteSettingsData> {
  const tenant = await getTenant()
  if (!tenant) return defaultSettings

  const settings = await withRetry(() =>
    prisma.siteSettings.findUnique({ where: { tenantId: tenant.id } })
  )

  if (!settings) return defaultSettings

  return {
    siteName: settings.siteName,
    logoUrl: settings.logoUrl,
    darkMode: settings.darkMode,
    footerText: settings.footerText,
    primaryColor: settings.primaryColor,
    accentColor: settings.accentColor,
    backgroundColor: settings.backgroundColor,
    fontHeading: settings.fontHeading,
    fontBody: settings.fontBody,
    faviconUrl: settings.faviconUrl,
    backgroundImage: settings.backgroundImage,
    themeSlug: settings.themeSlug,
    defaultDarkMode: settings.defaultDarkMode,
    ctaButtonLabel: settings.ctaButtonLabel,
    ctaButtonHref: settings.ctaButtonHref,
    locale: settings.locale,
    logoMode: settings.logoMode,
    socialLinks: normalizeSocialLinks(settings.socialLinks),
    contactAddress: normalizeContactAddress(settings.contactAddress),
  }
}
