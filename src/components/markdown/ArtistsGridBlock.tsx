'use client'

import { useEffect, useState } from 'react'
import ArtistCard, { type ArtistSummary } from '@/components/artists/ArtistCard'

// Renders all published artists as a card grid. Backs the :::artists-grid:::
// directive; fetches client-side like SliderBlock/ProductsBlock because
// MarkdownContent is a client component.
export default function ArtistsGridBlock() {
  const [artists, setArtists] = useState<ArtistSummary[] | null>(null)

  useEffect(() => {
    let ignore = false
    fetch('/api/artists')
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => { if (!ignore) setArtists(Array.isArray(d) ? d : []) })
      .catch(() => { if (!ignore) setArtists([]) })
    return () => { ignore = true }
  }, [])

  if (artists === null) {
    return (
      <div className="my-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="aspect-[4/3] animate-pulse rounded-section glass-card" />
        ))}
      </div>
    )
  }
  if (artists.length === 0) return null

  return (
    <div className="my-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {artists.map((a, i) => (
        <ArtistCard key={a.slug} artist={a} priority={i < 3} />
      ))}
    </div>
  )
}
