import type { Metadata } from 'next'
import type { ContentData, FaqItem } from './markdown'
import { getMenuItems, getSiteSettings } from './menu'
import { getFeaturedEvent, getPublishedEvents } from './events'
import type { ContactAddress } from './settings-normalize'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://e-ventschau.de'

// Legal organizer entity and its stable description. The festival's public
// contact address and social profiles are editable in /admin/setup; DEFAULT_SAME_AS
// keeps the Facebook link present even before that list is filled.
const ORGANIZER_NAME = 'e-Ventschau e. V.'
const ORG_DESCRIPTION =
  'Das e-Ventschau-Benefiz-Festival in Ventschau (Landkreis Lüneburg) – internationale Live-Musik, Ausstellungen und Vorträge zugunsten von Opfern nuklearer Katastrophen in Tschernobyl und Fukushima.'
const DEFAULT_SAME_AS = ['https://www.facebook.com/groups/436038379848640/']

/**
 * Union of URL lists, de-duplicated, order-preserving (earlier lists win).
 * Trailing slashes are ignored when de-duping (admin-entered URL vs. fallback),
 * but the first-seen original form is kept.
 */
export function mergeSameAs(...lists: string[][]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const list of lists) {
    for (const url of list) {
      if (!url) continue
      const key = url.replace(/\/+$/, '')
      if (!seen.has(key)) {
        seen.add(key)
        out.push(url)
      }
    }
  }
  return out
}

export function buildMetadata(
  data: ContentData | null,
  pathname: string,
  fallback: { title: string; description: string; keywords?: string[]; ogImage?: string },
): Metadata {
  const title = data?.metadata.title || fallback.title
  const description = data?.metadata.description || fallback.description
  const keywords = data?.metadata.keywords || fallback.keywords || []
  const ogImage = data?.ogImage || fallback.ogImage
  const canonicalUrl = `${SITE_URL}${pathname}`

  return {
    title,
    description,
    keywords,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      ...(ogImage ? { images: [{ url: ogImage }] } : {}),
    },
  }
}

export function buildFaqJsonLd(faqItems: FaqItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  }
}

export async function buildBreadcrumbJsonLd(pathname: string) {
  try {
    const menuItems = await getMenuItems()
    const items: { name: string; url: string }[] = [
      { name: 'Startseite', url: SITE_URL },
    ]

    for (const item of menuItems) {
      if (item.href === pathname) {
        items.push({ name: item.label, url: `${SITE_URL}${item.href}` })
        break
      }

      for (const child of item.children) {
        if (child.href === pathname) {
          if (item.href !== '#') {
            items.push({ name: item.label, url: `${SITE_URL}${item.href}` })
          }
          items.push({ name: child.label, url: `${SITE_URL}${child.href}` })
          break
        }
      }
    }

    if (items.length <= 1) return null

    return {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: items.map((item, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: item.name,
        item: item.url,
      })),
    }
  } catch (error) {
    console.error('[buildBreadcrumbJsonLd] Failed:', error)
    return null
  }
}

export const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'e-Ventschau',
  url: SITE_URL,
  description: 'Das e-Ventschau-Benefiz-Festival – internationale Musik für den guten Zweck im Landkreis Lüneburg.',
  inLanguage: 'de-DE',
}

export function buildVendorJsonLd(vendor: {
  name: string
  slug: string
  description: string | null
  website: string | null
  imageUrl: string | null
  detail: { street?: string | null; city?: string | null; zip?: string | null; country?: string | null } | null
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: vendor.name,
    url: vendor.website || `${SITE_URL}/haendler/${vendor.slug}`,
    description: vendor.description || undefined,
    ...(vendor.imageUrl ? { logo: vendor.imageUrl, image: vendor.imageUrl } : {}),
    ...(vendor.detail
      ? {
          address: {
            '@type': 'PostalAddress',
            streetAddress: vendor.detail.street || undefined,
            addressLocality: vendor.detail.city || undefined,
            postalCode: vendor.detail.zip || undefined,
            addressCountry: vendor.detail.country || 'DE',
          },
        }
      : {}),
  }
}

export function buildArtistJsonLd(artist: {
  name: string; slug: string; origin?: string | null; genres?: string[]
  heroImage?: string | null; excerpt?: string | null; socials?: { platform: string; url: string }[] | null
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'MusicGroup',
    name: artist.name,
    url: `${SITE_URL}/kuenstler/${artist.slug}`,
    ...(artist.genres?.length ? { genre: artist.genres } : {}),
    ...(artist.heroImage ? { image: artist.heroImage } : {}),
    ...(artist.excerpt ? { description: artist.excerpt } : {}),
    ...(artist.origin ? { foundingLocation: artist.origin } : {}),
    ...(artist.socials?.length ? { sameAs: artist.socials.map((s) => s.url) } : {}),
  }
}

export function buildEventJsonLd(event: {
  title: string
  slug: string
  startDate: string | Date
  endDate?: string | Date | null
  excerpt?: string | null
  heroImage?: string | null
  locationName?: string | null
  locationAddress?: string | null
  performers?: { name: string; slug: string }[] | null
  priceTiers?: { name: string; price: number | null; currency?: string | null; buyUrl?: string | null; isSoldOut?: boolean }[] | null
}) {
  const iso = (d: string | Date) => (typeof d === 'string' ? d : d.toISOString())
  return {
    '@context': 'https://schema.org',
    '@type': 'MusicEvent',
    name: event.title,
    url: `${SITE_URL}/events/${event.slug}`,
    startDate: iso(event.startDate),
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    ...(event.endDate ? { endDate: iso(event.endDate) } : {}),
    ...(event.excerpt ? { description: event.excerpt } : {}),
    ...(event.heroImage ? { image: event.heroImage } : {}),
    ...(event.locationName
      ? {
          location: {
            '@type': 'Place',
            name: event.locationName,
            ...(event.locationAddress ? { address: event.locationAddress } : {}),
          },
        }
      : {}),
    ...(event.performers?.length
      ? { performer: event.performers.map((p) => ({ '@type': 'MusicGroup', name: p.name, url: `${SITE_URL}/kuenstler/${p.slug}` })) }
      : {}),
    ...(event.priceTiers?.length
      ? {
          offers: event.priceTiers.map((t) => ({
            '@type': 'Offer',
            name: t.name,
            ...(t.price !== null && t.price !== undefined ? { price: t.price, priceCurrency: t.currency || 'EUR' } : {}),
            availability: t.isSoldOut ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock',
            url: t.buyUrl || `${SITE_URL}/events/${event.slug}`,
          })),
        }
      : {}),
  }
}

/**
 * Organization JSON-LD (rendered on every page via the root layout).
 * Name/description are the stable legal-entity strings; `logo` and `sameAs`
 * are data-driven — `sameAs` merges the admin-editable social list with the
 * Facebook fallback so the site-wide entity never loses it.
 */
export async function getOrganizationJsonLd() {
  const settings = await getSiteSettings()
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: ORGANIZER_NAME,
    url: SITE_URL,
    logo: settings.logoUrl || `${SITE_URL}/logo.png`,
    description: ORG_DESCRIPTION,
    sameAs: mergeSameAs(settings.socialLinks, DEFAULT_SAME_AS),
  }
}

export interface MusicFestivalInput {
  siteUrl: string
  name: string
  description?: string | null
  image?: string | null
  organizerName: string
  sameAs: string[]
  address: ContactAddress | null
  /** The upcoming/featured edition — anchors the festival's dates. */
  featured: {
    title: string
    slug: string
    startDate: Date
    endDate: Date | null
    locationName: string | null
  } | null
  /** All published editions, rendered as subEvents (recurring-brand signal). */
  editions: { title: string; slug: string; startDate: Date; endDate: Date | null }[]
}

/** Build a schema.org Place from the venue address, or undefined if empty. */
function buildPlace(address: ContactAddress | null, fallbackName: string | null) {
  const name = address?.venueName || fallbackName || undefined
  const hasAddress = !!address && !!(address.street || address.postalCode || address.locality)
  const hasGeo = !!address && typeof address.lat === 'number' && typeof address.lng === 'number'
  if (!name && !hasAddress && !hasGeo) return undefined

  return {
    '@type': 'Place',
    ...(name ? { name } : {}),
    ...(hasAddress
      ? {
          address: {
            '@type': 'PostalAddress',
            ...(address!.street ? { streetAddress: address!.street } : {}),
            ...(address!.postalCode ? { postalCode: address!.postalCode } : {}),
            ...(address!.locality ? { addressLocality: address!.locality } : {}),
            ...(address!.region ? { addressRegion: address!.region } : {}),
            addressCountry: address!.country || 'DE',
          },
        }
      : {}),
    ...(hasGeo
      ? { geo: { '@type': 'GeoCoordinates', latitude: address!.lat, longitude: address!.lng } }
      : {}),
  }
}

/**
 * Pure builder for the homepage `MusicFestival` entity — establishes e-Ventschau
 * as a recurring festival brand (venue, organizer, edition chain, social links).
 * Returns null when there is no featured edition to anchor the required dates.
 */
export function buildMusicFestivalJsonLd(input: MusicFestivalInput) {
  const { featured } = input
  if (!featured) return null
  const iso = (d: Date) => d.toISOString()
  const place = buildPlace(input.address, featured.locationName)

  const subEvent = input.editions.map((e) => ({
    '@type': 'MusicEvent',
    name: e.title,
    url: `${input.siteUrl}/events/${e.slug}`,
    startDate: iso(e.startDate),
    ...(e.endDate ? { endDate: iso(e.endDate) } : {}),
  }))

  return {
    '@context': 'https://schema.org',
    '@type': 'MusicFestival',
    name: input.name,
    url: `${input.siteUrl}/`,
    ...(input.description ? { description: input.description } : {}),
    ...(input.image ? { image: input.image } : {}),
    startDate: iso(featured.startDate),
    ...(featured.endDate ? { endDate: iso(featured.endDate) } : {}),
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    ...(place ? { location: place } : {}),
    organizer: { '@type': 'Organization', name: input.organizerName, url: `${input.siteUrl}/` },
    ...(subEvent.length ? { subEvent } : {}),
    ...(input.sameAs.length ? { sameAs: input.sameAs } : {}),
  }
}

/**
 * Fetch the data-driven inputs and build the homepage MusicFestival entity.
 * Pulls stable identity from SiteSettings and dynamic dates/editions from the
 * event helpers. Returns null when there is no published event.
 */
export async function getMusicFestivalJsonLd() {
  const [settings, featured, editions] = await Promise.all([
    getSiteSettings(),
    getFeaturedEvent(),
    getPublishedEvents(),
  ])

  return buildMusicFestivalJsonLd({
    siteUrl: SITE_URL,
    name: settings.siteName || 'e-Ventschau',
    description: settings.footerText,
    image: settings.logoUrl || settings.backgroundImage,
    organizerName: ORGANIZER_NAME,
    sameAs: mergeSameAs(settings.socialLinks, DEFAULT_SAME_AS),
    address: settings.contactAddress,
    featured: featured
      ? {
          title: featured.title,
          slug: featured.slug,
          startDate: featured.startDate,
          endDate: featured.endDate,
          locationName: featured.locationName,
        }
      : null,
    editions: editions.map((e) => ({
      title: e.title,
      slug: e.slug,
      startDate: e.startDate,
      endDate: e.endDate,
    })),
  })
}
