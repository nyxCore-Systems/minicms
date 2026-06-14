import type { Metadata } from 'next'
import { cache } from 'react'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import { getPublishedArtistBySlug } from '@/lib/artists'
import { buildMetadata, buildArtistJsonLd } from '@/lib/seo'
import JsonLd from '@/components/JsonLd'
import MarkdownContent from '@/components/MarkdownContent'
import SocialLinks from '@/components/artists/SocialLinks'
import ArtistGallery from '@/components/artists/ArtistGallery'

export const dynamic = 'force-dynamic'

const getArtist = cache(getPublishedArtistBySlug)

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const artist = await getArtist(slug)
  if (!artist) return buildMetadata(null, `/kuenstler/${slug}`, { title: 'Künstler nicht gefunden', description: '' })
  return buildMetadata(null, `/kuenstler/${slug}`, {
    title: artist.metaTitle || `${artist.name} – e-Ventschau`,
    description: artist.metaDescription || artist.excerpt || `${artist.name} beim e-Ventschau-Festival.`,
    ogImage: artist.heroImage || undefined,
  })
}

export default async function ArtistDetailPage({ params }: Props) {
  const { slug } = await params
  const artist = await getArtist(slug)
  if (!artist) notFound()

  const socials = Array.isArray(artist.socials) ? (artist.socials as { platform: string; url: string }[]) : []

  return (
    <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6 lg:px-8">
      <JsonLd data={buildArtistJsonLd({ ...artist, socials })} />

      <header className="mb-8">
        {artist.heroImage && (
          <div className="relative mb-6 aspect-[16/9] overflow-hidden rounded-section">
            <Image src={artist.heroImage} alt={artist.name} fill priority className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          </div>
        )}
        {artist.origin && <p className="text-sm font-semibold uppercase tracking-wider text-brand-accent">{artist.origin}</p>}
        <h1 className="mt-1 font-display text-4xl font-bold text-brand-text sm:text-5xl">{artist.name}</h1>
        {artist.genres.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2" aria-label="Genres">
            {artist.genres.map((g) => (
              <li key={g} className="rounded-pill bg-brand-accent/10 px-3 py-1 text-sm text-brand-accent">{g}</li>
            ))}
          </ul>
        )}
      </header>

      {artist.bio && (
        <section className="mb-10">
          <MarkdownContent content={artist.bio} />
        </section>
      )}

      {socials.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 font-display text-2xl font-bold text-brand-text">Links</h2>
          <SocialLinks links={socials} />
        </section>
      )}

      {artist.media.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-4 font-display text-2xl font-bold text-brand-text">Galerie</h2>
          <ArtistGallery items={artist.media} artistName={artist.name} />
        </section>
      )}

      {/* "Auftritte"-Sektion wird erst in Spec 2 (Events) befüllt — bis dahin bewusst nicht gerendert. */}
    </div>
  )
}
