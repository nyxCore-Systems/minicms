import Link from 'next/link'
import Image from 'next/image'
import type { EventSummary } from '@/lib/events'

function formatRange(start: Date, end: Date | null): string {
  const fmt = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })
  if (!end || start.toDateString() === end.toDateString()) return fmt.format(start)
  const dayFmt = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: 'long' })
  return `${dayFmt.format(start)} – ${fmt.format(end)}`
}

export default function EventCard({ event, priority = false }: { event: EventSummary; priority?: boolean }) {
  return (
    <Link href={`/events/${event.slug}`} className="glass-card group block overflow-hidden rounded-section transition-all hover:shadow-card-hover">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-brand-primary/10">
        {event.heroImage ? (
          <Image src={event.heroImage} alt={event.title} width={600} height={450} priority={priority}
            className="h-full w-full object-cover transition-transform motion-safe:group-hover:scale-105" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl text-brand-primary/40">♪</div>
        )}
      </div>
      <div className="p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-accent">{formatRange(event.startDate, event.endDate)}</p>
        <h3 className="mt-2 font-display text-xl font-bold leading-snug text-brand-text">{event.title}</h3>
        {event.isFeatured && (
          <span className="mt-2 inline-block rounded-pill bg-brand-accent/10 px-3 py-0.5 text-xs font-semibold text-brand-accent">Hauptevent</span>
        )}
        {event.locationName && <p className="mt-1 text-sm text-brand-text-muted">{event.locationName}</p>}
        {event.excerpt && <p className="mt-3 line-clamp-2 text-sm text-brand-text-muted">{event.excerpt}</p>}
      </div>
    </Link>
  )
}
