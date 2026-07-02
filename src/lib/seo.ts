// (a) Import-Zeile oben ergänzen:
import { getFeaturedEvent, getPublishedEvents } from './events'

// ─────────────────────────────────────────────────────────────────────────
// (b) Diese zwei Getter ERSETZEN die Wave-1-Versionen:

export async function getWebsiteJsonLd() {
  const settings = await getSiteSettings()
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: settings.siteName,
    url: SITE_URL,
    description: settings.footerText || settings.siteName,
    inLanguage: settings.locale === 'de' ? 'de-DE' : settings.locale,
    ...(settings.socialLinks.length > 0 ? { sameAs: settings.socialLinks } : {}),
  }
}

/**
 * Organization JSON-LD, tenant-aware. `sameAs` from SiteSettings.socialLinks
 * is the single strongest Knowledge Graph anchor — it connects this org to
 * its verified external presence (Facebook, Instagram, later Wikidata).
 */
export async function getOrganizationJsonLd() {
  const settings = await getSiteSettings()
  const logo = settings.logoUrl || `${SITE_URL}/e-ventschau-logo.png`
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: settings.siteName,
    url: SITE_URL,
    logo,
    description: settings.footerText || settings.siteName,
    ...(settings.socialLinks.length > 0 ? { sameAs: settings.socialLinks } : {}),
    ...(settings.contactAddress?.email || settings.contactAddress?.telephone
      ? {
          contactPoint: {
            '@type': 'ContactPoint',
            contactType: 'general inquiry',
            ...(settings.contactAddress.telephone
              ? { telephone: settings.contactAddress.telephone }
              : {}),
            ...(settings.contactAddress.email ? { email: settings.contactAddress.email } : {}),
            availableLanguage: ['de'],
          },
        }
      : {}),
  }
}

// ─────────────────────────────────────────────────────────────────────────
// (c) Diese drei Exporte NEU anhängen:

/**
 * MusicFestival JSON-LD for the homepage. Establishes e-Ventschau as a
 * recurring named entity. The featured event provides start/end/location;
 * up to 6 published editions become subEvent entries (past ones marked
 * EventCompleted) so crawlers understand the recurrence.
 * Returns null when no featured event exists — never emit an empty festival.
 */
export async function getMusicFestivalJsonLd() {
  const [settings, featured, all] = await Promise.all([
    getSiteSettings(),
    getFeaturedEvent(),
    getPublishedEvents(),
  ])

  if (!featured) return null

  const now = new Date()
  const subEvents = all.slice(0, 6).map((event) => ({
    '@type': 'MusicEvent',
    name: event.title,
    startDate: event.startDate.toISOString(),
    ...(event.endDate ? { endDate: event.endDate.toISOString() } : {}),
    url: `${SITE_URL}/events/${event.slug}`,
    ...(event.locationName
      ? { location: { '@type': 'Place', name: event.locationName } }
      : {}),
    eventStatus:
      event.startDate < now
        ? 'https://schema.org/EventCompleted'
        : 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
  }))

  const addr = settings.contactAddress
  return {
    '@context': 'https://schema.org',
    '@type': 'MusicFestival',
    name: settings.siteName,
    url: SITE_URL,
    description: settings.footerText || `${settings.siteName} — Benefiz-Musikfestival`,
    ...(settings.logoUrl || settings.backgroundImage
      ? { image: settings.backgroundImage || settings.logoUrl }
      : {}),
    ...(settings.socialLinks.length > 0 ? { sameAs: settings.socialLinks } : {}),
    startDate: featured.startDate.toISOString(),
    ...(featured.endDate ? { endDate: featured.endDate.toISOString() } : {}),
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    ...(featured.locationName || addr
      ? {
          location: {
            '@type': 'Place',
            name: featured.locationName || settings.siteName,
            ...(addr
              ? {
                  address: {
                    '@type': 'PostalAddress',
                    ...(addr.streetAddress ? { streetAddress: addr.streetAddress } : {}),
                    ...(addr.addressLocality ? { addressLocality: addr.addressLocality } : {}),
                    ...(addr.postalCode ? { postalCode: addr.postalCode } : {}),
                    ...(addr.addressRegion ? { addressRegion: addr.addressRegion } : {}),
                    ...(addr.addressCountry ? { addressCountry: addr.addressCountry } : {}),
                  },
                  ...(addr.latitude !== undefined && addr.longitude !== undefined
                    ? {
                        geo: {
                          '@type': 'GeoCoordinates',
                          latitude: addr.latitude,
                          longitude: addr.longitude,
                        },
                      }
                    : {}),
                }
              : {}),
          },
        }
      : {}),
    organizer: {
      '@type': 'Organization',
      name: settings.siteName,
      url: SITE_URL,
    },
    ...(subEvents.length > 0 ? { subEvent: subEvents } : {}),
  }
}

/**
 * LocalBusiness JSON-LD for /kontakt and /impressum (wired up in wave 2b).
 * LocalBusiness over MusicVenue: organizer address and festival venue are
 * often different — venue specifics live on the Event JSON-LD instead.
 */
export async function getLocalBusinessJsonLd() {
  const settings = await getSiteSettings()
  const addr = settings.contactAddress
  if (!addr) return null

  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: settings.siteName,
    url: SITE_URL,
    ...(settings.logoUrl ? { image: settings.logoUrl } : {}),
    ...(addr.telephone ? { telephone: addr.telephone } : {}),
    ...(addr.email ? { email: addr.email } : {}),
    address: {
      '@type': 'PostalAddress',
      ...(addr.streetAddress ? { streetAddress: addr.streetAddress } : {}),
      ...(addr.addressLocality ? { addressLocality: addr.addressLocality } : {}),
      ...(addr.postalCode ? { postalCode: addr.postalCode } : {}),
      ...(addr.addressRegion ? { addressRegion: addr.addressRegion } : {}),
      ...(addr.addressCountry ? { addressCountry: addr.addressCountry } : {}),
    },
    ...(addr.latitude !== undefined && addr.longitude !== undefined
      ? {
          geo: {
            '@type': 'GeoCoordinates',
            latitude: addr.latitude,
            longitude: addr.longitude,
          },
        }
      : {}),
    ...(settings.socialLinks.length > 0 ? { sameAs: settings.socialLinks } : {}),
  }
}

/**
 * Speakable spec for voice search — attach as `speakable` property to
 * Event/Artist JSON-LD (wave 2b) and mark the summary paragraph with
 * data-speakable in the template.
 */
export const SPEAKABLE_SELECTORS = {
  '@type': 'SpeakableSpecification',
  cssSelector: ['h1', '[data-speakable]'],
}

// ─────────────────────────────────────────────────────────────────────────
// (d) Deprecated Re-Exports ans Dateiende (Entfernung: wave 3):

/**
 * @deprecated Use `getWebsiteJsonLd()` (async, tenant-aware). Kept only so
 * existing static imports keep compiling during the wave transition.
 */
export const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'e-Ventschau',
  url: SITE_URL,
  description: 'Benefiz-Musikfestival e-Ventschau',
  inLanguage: 'de-DE',
}

/** @deprecated Use `getOrganizationJsonLd()`. See websiteJsonLd note. */
export const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'e-Ventschau',
  url: SITE_URL,
  logo: `${SITE_URL}/e-ventschau-logo.png`,
  description: 'Benefiz-Musikfestival e-Ventschau',
  sameAs: [] as string[],
}
