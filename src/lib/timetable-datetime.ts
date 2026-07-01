// Pure date/time helpers for the timetable editor. Everything works in the
// browser's local timezone (like the existing toLocalInput in TimetableBuilder),
// so a "day" is a local calendar day and clock times are wall-clock times.

const pad = (n: number) => String(n).padStart(2, '0')

/** Local calendar day of a Date as `YYYY-MM-DD`. */
export function localDayKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** Local wall-clock time of a Date as `HH:mm`. */
export function localClock(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** Combine a `YYYY-MM-DD` day and `HH:mm` clock into a local Date. */
export function combineDayClock(day: string, clock: string): Date {
  const [y, m, d] = day.split('-').map(Number)
  const [hh, mm] = clock.split(':').map(Number)
  return new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0, 0)
}

/**
 * Resolve a slot's end Date from its day + end clock, relative to its start.
 * Returns null when no end clock is given. If the end would be at or before the
 * start (late-night set crossing midnight, e.g. 23:00 -> 01:00), it rolls to the
 * next calendar day so the server's `endTime <= startTime` validation passes.
 */
export function resolveEndDate(start: Date, day: string, endClock: string): Date | null {
  if (!endClock) return null
  let end = combineDayClock(day, endClock)
  if (end.getTime() <= start.getTime()) {
    end = new Date(end.getTime())
    end.setDate(end.getDate() + 1)
  }
  return end
}

export type DayOption = { value: string; label: string }

/**
 * Build the festival day options from the event's start/end dates (inclusive,
 * one entry per local calendar day). `extraDays` (YYYY-MM-DD) are legacy slot
 * days outside the range that must stay selectable; they are merged, deduped and
 * sorted. Labels are `DD.MM.`, gaining a year (`DD.MM.YYYY`) when the range spans
 * more than one calendar year.
 */
export function eventDays(startDate: Date, endDate: Date | null, extraDays: string[] = []): DayOption[] {
  const keys = new Set<string>()
  const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate())
  const last = endDate
    ? new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate())
    : new Date(cursor.getTime())
  while (cursor.getTime() <= last.getTime()) {
    keys.add(localDayKey(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  for (const d of extraDays) if (d) keys.add(d)

  const sorted = [...keys].sort()
  const years = new Set(sorted.map((k) => k.slice(0, 4)))
  const withYear = years.size > 1
  return sorted.map((value) => {
    const [y, m, d] = value.split('-')
    return { value, label: withYear ? `${d}.${m}.${y}` : `${d}.${m}.` }
  })
}
