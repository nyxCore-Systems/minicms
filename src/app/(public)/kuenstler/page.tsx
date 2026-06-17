import type { Metadata } from 'next'
import { getPublishedArtists } from '@/lib/artists'
import { buildMetadata } from '@/lib/seo'
import ArtistCard from '@/components/artists/ArtistCard'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata(null, '/kuenstler', {
    title: 'Künstler:innen',
    description: 'Alle Bands und Acts des e-Ventschau-Benefiz-Festivals.',
  })
}

export default async function ArtistIndexPage() {
  const artists = await getPublishedArtists()
  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
      <header className="mb-10 text-center">
        <h1 className="font-display text-4xl font-bold text-brand-text sm:text-5xl">Künstler:innen</h1>
        <p className="mt-3 text-brand-text-muted">Die Acts des e-Ventschau-Festivals.</p>
      </header>

      {artists.length === 0 ? (
        <p className="text-center text-brand-text-muted">Noch keine Künstler:innen veröffentlicht.</p>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {artists.map((a, i) => (
            <ArtistCard
              key={a.id}
              priority={i < 3}
              artist={{
                slug: a.slug, name: a.name, origin: a.origin, genres: a.genres,
                heroImage: a.heroImage, excerpt: a.excerpt, isFeatured: a.isFeatured,
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
