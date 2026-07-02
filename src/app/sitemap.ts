import { MetadataRoute } from 'next'
import { prisma } from '@/lib/prisma'
import { getTenant } from '@/lib/tenant'
import { getProductTags } from '@/lib/products-db'
import { getPublishedEvents } from '@/lib/events'
import { getPublishedArtists } from '@/lib/artists'

export const dynamic = 'force-dynamic'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://e-ventschau.de'

/**
 * Static route entries not tied to a DB row (or that need a fixed priority).
 * DB-managed pages come in via the Page table below; keep this list small.
 */
const STATIC_ROUTES: Array<{
  path: string
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']
  priority: number
}> = [
  { path: '', changeFrequency: 'weekly', priority: 1.0 },
  { path: '/events', changeFrequency: 'weekly', priority: 0.9 },
  { path: '/kuenstler', changeFrequency: 'weekly', priority: 0.9 },
  { path: '/rueckschau', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/haendler', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/produkte', changeFrequency: 'weekly', priority: 0.5 },
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  const staticPages: MetadataRoute.Sitemap = STATIC_ROUTES.map((r) => ({
    url: `${SITE_URL}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }))

  const tenant = await getTenant()
  if (!tenant) return staticPages

  // DB-managed markdown Pages. `Page.path` is the canonical URL (falls back to
  // /:slug when null). Publishing state drives inclusion.
  const pages = await prisma.page.findMany({
    where: { tenantId: tenant.id, isPublished: true, noIndex: false },
    select: { slug: true, path: true, updatedAt: true },
  })

  const dbPages: MetadataRoute.Sitemap = pages.map((page) => ({
    url: `${SITE_URL}${page.path || `/${page.slug}`}`,
    lastModified: page.updatedAt,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  // Events + Artists — the two entities that carry Rich Result eligibility
  // (Event / MusicGroup JSON-LD). Include them explicitly so Google discovers
  // /events/[slug] and /kuenstler/[slug] without relying on link-crawling.
  const [events, artists] = await Promise.all([
    getPublishedEvents(),
    getPublishedArtists(),
  ])

  const eventPages: MetadataRoute.Sitemap = events.map((event) => ({
    url: `${SITE_URL}/events/${event.slug}`,
    lastModified: event.startDate, // best proxy we have without updatedAt in the summary
    changeFrequency: 'weekly' as const,
    priority: event.isFeatured ? 0.95 : 0.85,
  }))

  const artistPages: MetadataRoute.Sitemap = artists.map((artist) => ({
    url: `${SITE_URL}/kuenstler/${artist.slug}`,
    lastModified: artist.updatedAt,
    changeFrequency: 'monthly' as const,
    priority: artist.isFeatured ? 0.85 : 0.75,
  }))

  // Product tag pages retained from the skeleton — cheap, and harmless if the
  // tenant has no products (returns []).
  const tags = await getProductTags()
  const tagPages: MetadataRoute.Sitemap = tags.map((tag) => ({
    url: `${SITE_URL}/produkte/${tag.slug}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.5,
  }))

  return [...staticPages, ...dbPages, ...eventPages, ...artistPages, ...tagPages]
}
