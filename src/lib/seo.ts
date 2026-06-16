import type { Metadata } from 'next'
import type { ContentData, FaqItem } from './markdown'
import { getMenuItems } from './menu'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://e-ventschau.de'

export function buildMetadata(
  data: ContentData | null,
  pathname: string,
  fallback: { title: string; description: string; keywords?: string[]; ogImage?: string },
): Metadata {
  const title = data?.metadata.title || fallback.title
  const description = data?.metadata.description || fallback.description
  const keywords = data?.metadata.keywords || fallback.keywords || []
  const ogImage = data?.ogImage || fallback.ogImage

  return {
    title,
    description,
    keywords,
    openGraph: {
      title,
      description,
      url: `${SITE_URL}${pathname}`,
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
  priceTiers?: { name: string; price: number | null; currency?: string | null; buyUrl?: string | null }[] | null
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
            availability: 'https://schema.org/InStock',
            url: t.buyUrl || `${SITE_URL}/events/${event.slug}`,
          })),
        }
      : {}),
  }
}

export const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'e-Ventschau e. V.',
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
  description:
    'Das e-Ventschau-Benefiz-Festival in Ventschau (Landkreis Lüneburg) – internationale Live-Musik, Ausstellungen und Vorträge zugunsten von Opfern nuklearer Katastrophen in Tschernobyl und Fukushima.',
  sameAs: ['https://www.facebook.com/groups/436038379848640/'],
}
