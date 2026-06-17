import type { Metadata } from 'next'
import { getPublishedEvents } from '@/lib/events'
import { buildMetadata } from '@/lib/seo'
import EventCard from '@/components/events/EventCard'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata(null, '/events', {
    title: 'Events & Programm',
    description: 'Alle Veranstaltungen des e-Ventschau-Benefiz-Festivals – Termine, Line-up und Tickets.',
  })
}

export default async function EventsIndexPage() {
  const events = await getPublishedEvents()
  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
      <div className="mb-10 text-center">
        <h1 className="font-display text-3xl font-bold text-brand-text sm:text-4xl">Events</h1>
        <p className="mt-3 text-brand-text-muted">Termine, Line-up und Tickets für die e-Ventschau.</p>
      </div>
      {events.length === 0 ? (
        <p className="text-center text-brand-text-muted">Aktuell sind keine Veranstaltungen angekündigt.</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event, i) => (
            <EventCard key={event.slug} event={event} priority={i < 3} />
          ))}
        </div>
      )}
    </div>
  )
}
