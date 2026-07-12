import { NextResponse } from 'next/server'
import { getPublishedArtists } from '@/lib/artists'

// Public: all published artists as ArtistSummary[], for the :::artists-grid::: block.
export async function GET() {
  const artists = await getPublishedArtists()
  const items = artists.map((a) => ({
    slug: a.slug,
    name: a.name,
    origin: a.origin,
    genres: a.genres,
    heroImage: a.heroImage,
    excerpt: a.excerpt,
    isFeatured: a.isFeatured,
  }))
  return NextResponse.json(items, {
    headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
  })
}
