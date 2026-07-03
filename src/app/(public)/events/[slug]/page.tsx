import type { Metadata } from 'next'
import { cache } from 'react'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { getPublishedEventBySlug } from '@/lib/events'
import { buildMetadata, buildEventJsonLd } from '@/lib/seo'
import JsonLd from '@/components/JsonLd'
import MarkdownContent from '@/components/MarkdownContent'
import ArtistCard from '@/components/artists/ArtistCard'
import EventTimetable from '@/components/events/EventTimetable'

export const dynamic = 'force-dynamic'

const getEvent = cache(getPublishedEventBySlug)

type Props = { params: Promise<{ slug: string }> }

function formatRange(start: Date, end: Date | null): string {
  const fmt = new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', day: '2-digit', month: 'long', year: 'numeric' })
  if (!end || start.toDateString() === end.toDateString()) return fmt.format(start)
  const dayFmt = new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', day: '2-digit', month: 'long' })
  return `${dayFmt.format(start)} – ${fmt.format(end)}`
}

function formatPrice(price: number | null, currency: string): string {
  if (price === null) return 'auf Anfrage'
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency }).format(price)
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const event = await getEvent(slug)
  if (!event) return buildMetadata(null, `/events/${slug}`, { title: 'Event nicht gefunden', description: '' })
  return buildMetadata(null, `/events/${slug}`, {
    title: event.metaTitle || event.title,
    description: event.metaDescription || event.excerpt || `${event.title} beim e-Ventschau-Festival.`,
    ogImage: event.heroImage || undefined,
  })
}

export default async function EventDetailPage({ params }: Props) {
  const { slug } = await params
  const event = await getEvent(slug)
  if (!event) notFound()

  const lineup = event.appearances.filter((a) => a.artist)
  const seenArtists = new Set<string>()
  const uniqueLineup = lineup.filter((a) => {
    if (!a.artist || seenArtists.has(a.artist.slug)) return false
    seenArtists.add(a.artist.slug)
    return true
  })

  return (
    <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6 lg:px-8">
      <JsonLd
        data={buildEventJsonLd({
          title: event.title,
          slug: event.slug,
          startDate: event.startDate,
          endDate: event.endDate,
          excerpt: event.excerpt,
          heroImage: event.heroImage,
          locationName: event.locationName,
          locationAddress: event.locationAddress,
          performers: uniqueLineup.map((a) => ({ name: a.artist!.name, slug: a.artist!.slug })),
          priceTiers: event.priceTiers.map((t) => ({ name: t.name, price: t.price, currency: t.currency, buyUrl: t.buyUrl, isSoldOut: t.isSoldOut })),
        })}
      />

      {/* Hero */}
      <header className="mb-10">
        {event.heroImage && (
          <div className="relative mb-6 aspect-[16/9] w-full overflow-hidden rounded-section bg-brand-primary/10">
            <Image src={event.heroImage} alt={event.title} fill priority className="object-cover" />
          </div>
        )}
        <p className="text-sm font-semibold uppercase tracking-wider text-brand-accent">{formatRange(event.startDate, event.endDate)}</p>
        <h1 className="mt-2 font-display text-3xl font-bold text-brand-text sm:text-5xl">{event.title}</h1>
        {event.subtitle && <p className="mt-3 text-lg text-brand-text-muted">{event.subtitle}</p>}
        {event.locationName && (
          <p className="mt-3 text-brand-text-muted">
            {event.locationUrl ? (
              <a href={event.locationUrl} target="_blank" rel="noopener noreferrer nofollow" className="underline hover:text-brand-accent">
                {event.locationName}
              </a>
            ) : event.locationName}
            {event.locationAddress ? ` · ${event.locationAddress}` : ''}
          </p>
        )}
      </header>

      {/* Beschreibung */}
      {event.description && (
        <section className="mb-10">
          <MarkdownContent content={event.description} />
        </section>
      )}

      {/* Timetable */}
      <EventTimetable event={event} />

      {/* Line-up */}
      {uniqueLineup.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-4 font-display text-2xl font-bold text-brand-text">Line-up</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {uniqueLineup.map((a) => (
              <ArtistCard key={a.artist!.slug} artist={{ slug: a.artist!.slug, name: a.artist!.name, isFeatured: a.artist?.isFeatured ?? false }} />
            ))}
          </div>
        </section>
      )}

      {/* Preise */}
      {event.priceTiers.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-4 font-display text-2xl font-bold text-brand-text">Preise</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {event.priceTiers.map((t) => (
              <div key={t.id} className="glass-card rounded-section p-5">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="font-display text-lg font-bold text-brand-text">{t.name}</h3>
                  <span className="shrink-0 font-semibold text-brand-accent">{formatPrice(t.price, t.currency)}</span>
                </div>
                {t.description && <p className="mt-1 text-sm text-brand-text-muted">{t.description}</p>}
                {t.isSoldOut && <span className="mt-2 inline-block rounded-pill bg-red-100 px-3 py-0.5 text-xs font-semibold text-red-700">Ausverkauft</span>}
                {t.buyUrl && !t.isSoldOut && (
                  <a href={t.buyUrl} target="_blank" rel="noopener noreferrer nofollow" className="btn-secondary mt-3 inline-block px-4 py-1.5 text-sm">
                    Ticket kaufen
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Ticket-CTA */}
      {event.ticketUrl && (
        <section className="text-center">
          <a href={event.ticketUrl} target="_blank" rel="noopener noreferrer nofollow" className="btn-primary px-7 py-3 text-base">
            Tickets sichern
          </a>
        </section>
      )}
    </div>
  )
}
