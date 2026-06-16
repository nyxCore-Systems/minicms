import { prisma } from './prisma'
import { getTenant } from './tenant'
import type { Prisma } from '@prisma/client'
import type { ArtistSummary } from '@/components/artists/ArtistCard'

export type EventWithRelations = Prisma.EventGetPayload<{
  include: {
    stages: true
    priceTiers: true
    appearances: { include: { artist: { select: { slug: true; name: true } }; stage: true } }
  }
}>

export type EventSummary = {
  slug: string
  title: string
  subtitle: string | null
  startDate: Date
  endDate: Date | null
  locationName: string | null
  heroImage: string | null
  excerpt: string | null
  isFeatured: boolean
}

const ROLE_RANK: Record<string, number> = { headliner: 0, support: 1, guest: 2, break: 3 }

export async function getPublishedEvents(): Promise<EventSummary[]> {
  try {
    const tenant = await getTenant()
    if (!tenant) return []
    return await prisma.event.findMany({
      where: { tenantId: tenant.id, isPublished: true, isActive: true },
      select: {
        slug: true, title: true, subtitle: true, startDate: true, endDate: true,
        locationName: true, heroImage: true, excerpt: true, isFeatured: true,
      },
      orderBy: [{ startDate: 'asc' }],
    })
  } catch (e) { console.error('getPublishedEvents failed', e); return [] }
}

export async function getPublishedEventBySlug(slug: string): Promise<EventWithRelations | null> {
  try {
    const tenant = await getTenant()
    if (!tenant) return null
    const event = await prisma.event.findUnique({
      where: { tenantId_slug: { tenantId: tenant.id, slug } },
      include: {
        stages: { orderBy: { sortOrder: 'asc' } },
        priceTiers: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
        appearances: {
          include: { artist: { select: { slug: true, name: true } }, stage: true },
          orderBy: [{ startTime: 'asc' }, { sortOrder: 'asc' }],
        },
      },
    })
    if (!event || !event.isPublished || !event.isActive) return null
    return event
  } catch (e) { console.error('getPublishedEventBySlug failed', e); return null }
}

export async function getEventsForAdmin() {
  const tenant = await getTenant()
  if (!tenant) return []
  return prisma.event.findMany({
    where: { tenantId: tenant.id },
    include: { _count: { select: { stages: true, appearances: true, priceTiers: true } } },
    orderBy: [{ isFeatured: 'desc' }, { startDate: 'asc' }],
  })
}

export async function getFeaturedEvent() {
  try {
    const tenant = await getTenant()
    if (!tenant) return null
    return await prisma.event.findFirst({
      where: { tenantId: tenant.id, isPublished: true, isActive: true },
      orderBy: [{ isFeatured: 'desc' }, { startDate: 'asc' }],
    })
  } catch (e) { console.error('getFeaturedEvent failed', e); return null }
}

export async function getFeaturedEventLineup(): Promise<ArtistSummary[]> {
  try {
    const tenant = await getTenant()
    if (!tenant) return []
    const event = await prisma.event.findFirst({
      where: { tenantId: tenant.id, isPublished: true, isActive: true },
      orderBy: [{ isFeatured: 'desc' }, { startDate: 'asc' }],
      select: { id: true },
    })
    if (!event) return []
    const appearances = await prisma.appearance.findMany({
      where: {
        eventId: event.id,
        artistId: { not: null },
        artist: { isPublished: true, isActive: true },
      },
      include: {
        artist: { select: { slug: true, name: true, origin: true, genres: true, heroImage: true, excerpt: true, isFeatured: true } },
      },
      orderBy: [{ startTime: 'asc' }],
    })
    const sorted = [...appearances].sort((a, b) => (ROLE_RANK[a.role] ?? 9) - (ROLE_RANK[b.role] ?? 9))
    const seen = new Set<string>()
    const lineup: ArtistSummary[] = []
    for (const ap of sorted) {
      if (!ap.artist || seen.has(ap.artist.slug)) continue
      seen.add(ap.artist.slug)
      lineup.push({
        slug: ap.artist.slug,
        name: ap.artist.name,
        origin: ap.artist.origin,
        genres: ap.artist.genres,
        heroImage: ap.artist.heroImage,
        excerpt: ap.artist.excerpt,
        isFeatured: ap.artist.isFeatured,
      })
    }
    return lineup
  } catch (e) { console.error('getFeaturedEventLineup failed', e); return [] }
}

export type ArtistAppearance = Prisma.AppearanceGetPayload<{
  include: { event: { select: { slug: true; title: true; startDate: true } }; stage: { select: { name: true } } }
}>

export async function getArtistAppearances(artistId: string): Promise<ArtistAppearance[]> {
  try {
    const tenant = await getTenant()
    if (!tenant) return []
    return await prisma.appearance.findMany({
      where: { artistId, event: { tenantId: tenant.id, isPublished: true, isActive: true } },
      include: {
        event: { select: { slug: true, title: true, startDate: true } },
        stage: { select: { name: true } },
      },
      orderBy: [{ startTime: 'asc' }],
    })
  } catch (e) { console.error('getArtistAppearances failed', e); return [] }
}
