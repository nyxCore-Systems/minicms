// Pure "upcoming event" filter — shared by the public events API and the
// :::upcoming-events::: directive. An event counts as upcoming until it has
// fully finished: its end (or its start, when there is no end) is at or after
// `now`. No Prisma import so it stays unit-testable.

type DatedEvent = { startDate: Date; endDate: Date | null }

export function isUpcomingEvent(event: DatedEvent, now: Date): boolean {
  const end = event.endDate ?? event.startDate
  return end.getTime() >= now.getTime()
}

export function filterUpcomingEvents<T extends DatedEvent>(events: T[], now: Date): T[] {
  return events.filter((e) => isUpcomingEvent(e, now))
}
