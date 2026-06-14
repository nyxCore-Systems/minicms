import { prisma } from './prisma'
import { getTenant } from './tenant'
import type { Artist, ArtistMedia } from '@prisma/client'

export type ArtistWithMedia = Artist & { media: ArtistMedia[] }

export async function getPublishedArtists(): Promise<ArtistWithMedia[]> {
  try {
    const tenant = await getTenant()
    if (!tenant) return []
    return await prisma.artist.findMany({
      where: { tenantId: tenant.id, isPublished: true, isActive: true },
      include: { media: { orderBy: { sortOrder: 'asc' } } },
      orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    })
  } catch (e) { console.error('getPublishedArtists failed', e); return [] }
}

export async function getPublishedArtistBySlug(slug: string): Promise<ArtistWithMedia | null> {
  try {
    const tenant = await getTenant()
    if (!tenant) return null
    const artist = await prisma.artist.findUnique({
      where: { tenantId_slug: { tenantId: tenant.id, slug } },
      include: { media: { orderBy: { sortOrder: 'asc' } } },
    })
    if (!artist || !artist.isPublished || !artist.isActive) return null
    return artist
  } catch (e) { console.error('getPublishedArtistBySlug failed', e); return null }
}

export async function getArtistsForAdmin() {
  const tenant = await getTenant()
  if (!tenant) return []
  return prisma.artist.findMany({
    where: { tenantId: tenant.id },
    include: { _count: { select: { media: true } } },
    orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }, { name: 'asc' }],
  })
}
