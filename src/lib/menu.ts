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
  maintenanceMode: boolean
}

const defaultSettings: SiteSettingsData = {
  siteName: 'e-Ventschau',
  logoUrl: null,
  darkMode: false,
  footerText: null,
  primaryColor: '#0E5A57',
  accentColor: '#E0A11E',
  backgroundColor: '#FAFAF6',
  fontHeading: 'Playfair Display',
  fontBody: 'Inter',
  faviconUrl: null,
  backgroundImage: null,
  themeSlug: 'eventschau',
  defaultDarkMode: false,
  ctaButtonLabel: null,
  ctaButtonHref: null,
  locale: 'de',
  logoMode: 'auto',
  maintenanceMode: false,
}

export async function getMenuItems(location: string = 'header'): Promise<MenuItemData[]> {
  const tenant = await getTenant()
  if (!tenant) return []

  const items = await withRetry(() =>
    prisma.menuItem.findMany({
      where: {
        tenantId: tenant.id,
        isVisible: true,
        parentId: null,
        location,
      },
      include: {
        children: {
          where: { isVisible: true },
          orderBy: { sortOrder: 'asc' },
        },
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
    prisma.siteSettings.findUnique({
      where: { tenantId: tenant.id },
    })
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
    maintenanceMode: settings.maintenanceMode,
  }
}
