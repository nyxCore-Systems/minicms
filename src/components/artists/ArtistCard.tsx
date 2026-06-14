import Link from 'next/link'
import Image from 'next/image'

export type ArtistSummary = {
  slug: string
  name: string
  origin?: string | null
  genres?: string[]
  heroImage?: string | null
  excerpt?: string | null
  isFeatured?: boolean
}

export default function ArtistCard({
  artist, variant = 'grid', priority = false,
}: { artist: ArtistSummary; variant?: 'grid' | 'list' | 'carousel'; priority?: boolean }) {
  // 'carousel' shares grid styling in Spec 1; carousel layout is handled by the parent Swiper later.
  const isList = variant === 'list'
  return (
    <Link
      href={`/kuenstler/${artist.slug}`}
      className={`glass-card group block overflow-hidden rounded-section motion-safe:transition-all motion-safe:hover:shadow-card-hover ${isList ? 'flex items-center gap-4' : ''}`}
    >
      <div className={isList ? 'h-24 w-24 flex-shrink-0 overflow-hidden' : 'aspect-[4/3] w-full overflow-hidden'}>
        {artist.heroImage ? (
          <Image
            src={artist.heroImage}
            alt={artist.name}
            width={600}
            height={450}
            priority={priority}
            className="h-full w-full object-cover motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:scale-105"
          />
        ) : (
          <div aria-hidden="true" className="flex h-full w-full items-center justify-center bg-brand-primary/10 text-brand-primary">♪</div>
        )}
      </div>
      <div className="p-5">
        {artist.origin && <p className="text-xs font-semibold uppercase tracking-wider text-brand-accent">{artist.origin}</p>}
        <h3 className="mt-1 font-display text-xl font-bold leading-snug text-brand-text">{artist.name}</h3>
        {artist.isFeatured && (
          <span className="mt-1 inline-block rounded-pill bg-brand-accent/10 px-2 py-0.5 text-xs font-medium text-brand-accent">Headliner</span>
        )}
        {artist.genres?.length ? (
          <p className="mt-2 text-sm text-brand-text-muted">{artist.genres.join(' · ')}</p>
        ) : null}
      </div>
    </Link>
  )
}
