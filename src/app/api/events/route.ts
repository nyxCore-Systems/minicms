import { NextResponse } from 'next/server'
import { getPublishedEvents } from '@/lib/events'
import { filterUpcomingEvents } from '@/lib/upcomingEvents'

// Public: upcoming (not-yet-finished) published events, for the
// :::upcoming-events::: block. Dates serialize to ISO strings in JSON.
export async function GET() {
  const events = await getPublishedEvents()
  const upcoming = filterUpcomingEvents(events, new Date())
  return NextResponse.json(upcoming, {
    headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
  })
}
