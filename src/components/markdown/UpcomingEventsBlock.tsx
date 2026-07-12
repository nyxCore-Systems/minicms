'use client'

import { useEffect, useState } from 'react'
import EventCard from '@/components/events/EventCard'
import type { EventSummary } from '@/lib/events'

// Raw JSON shape from /api/events — dates arrive as ISO strings.
type RawEvent = Omit<EventSummary, 'startDate' | 'endDate'> & { startDate: string; endDate: string | null }

// Renders upcoming published events as a card grid. Backs the
// :::upcoming-events::: directive.
export default function UpcomingEventsBlock() {
  const [events, setEvents] = useState<EventSummary[] | null>(null)

  useEffect(() => {
    let ignore = false
    fetch('/api/events')
      .then((r) => (r.ok ? r.json() : []))
      .then((d: RawEvent[]) => {
        if (ignore) return
        const parsed = (Array.isArray(d) ? d : []).map((e) => ({
          ...e,
          startDate: new Date(e.startDate),
          endDate: e.endDate ? new Date(e.endDate) : null,
        }))
        setEvents(parsed)
      })
      .catch(() => { if (!ignore) setEvents([]) })
    return () => { ignore = true }
  }, [])

  if (events === null) {
    return (
      <div className="my-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="aspect-[4/3] animate-pulse rounded-section glass-card" />
        ))}
      </div>
    )
  }
  if (events.length === 0) return null

  return (
    <div className="my-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {events.map((e, i) => (
        <EventCard key={e.slug} event={e} priority={i < 3} />
      ))}
    </div>
  )
}
