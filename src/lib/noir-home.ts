import { cache } from 'react'
import { getFeaturedEvent, getFeaturedEventLineup, getPublishedEventBySlug } from '@/lib/events'
import type { NoirDay } from '@/components/noir/NoirTimetable'

// Single source of truth for the event-driven data behind the Noir homepage
// elements (hero dates, marquee, line-up, timetable). Wrapped in React `cache`
// so multiple elements rendered on one request share a single DB round-trip.

const TZ = 'Europe/Berlin'
const fmtTime = (d: Date) =>
  new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit', timeZone: TZ }).format(d)
const fmtDayShort = (d: Date) =>
  new Intl.DateTimeFormat('de-DE', { weekday: 'short', timeZone: TZ }).format(d).replace('.', '')
const fmtWeekdayLong = (d: Date) =>
  new Intl.DateTimeFormat('de-DE', { weekday: 'long', timeZone: TZ }).format(d)
const fmtDayNum = (d: Date) => new Intl.DateTimeFormat('de-DE', { day: '2-digit', timeZone: TZ }).format(d)
const fmtMonthNum = (d: Date) => new Intl.DateTimeFormat('de-DE', { month: '2-digit', timeZone: TZ }).format(d)
const fmtMonthShort = (d: Date) =>
  new Intl.DateTimeFormat('de-DE', { month: 'short', timeZone: TZ }).format(d).replace('.', '').toUpperCase()
const dayKey = (d: Date) =>
  new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: TZ }).format(d)

const ROLE_TYPE: Record<string, string> = {
  headliner: 'Headliner',
  support: 'Musik',
  guest: 'Gast',
  break: 'Pause',
}

export type NoirLineupItem = Awaited<ReturnType<typeof getFeaturedEventLineup>>[number]

export interface NoirHomeData {
  /** A published, active event exists (line-up / timetable have content). */
  hasEvent: boolean
  lineup: NoirLineupItem[]
  /** First 2 acts (rendered as xl cards). The remaining acts render as md
   *  cards straight from `lineup` — the line-up section shows ALL acts. */
  features: NoirLineupItem[]
  /** artist slug → "Fr · 22:00 · Hauptbühne" for the line-up cards. */
  apMetaBySlug: Map<string, string>
  /** Timetable grouped by calendar day. */
  days: NoirDay[]
  stageCount: number
  /** Hero kicker, e.g. "11. Ausgabe // 07–08 AUG 2026 // HOF THIELE, VENTSCHAU". */
  kicker: string
  /** Hero meta tile date string, e.g. "Fr–Sa, 07.–08. AUG". */
  dateMeta: string
}

export const getNoirHomeData = cache(async (): Promise<NoirHomeData> => {
  const featured = await getFeaturedEvent()
  const [lineup, event] = await Promise.all([
    getFeaturedEventLineup(),
    featured ? getPublishedEventBySlug(featured.slug) : Promise.resolve(null),
  ])

  // Map artist slug → richer summary (origin/genres) for timetable subtitles
  const lineupBySlug = new Map(lineup.map((a) => [a.slug, a]))

  // Per-artist appearance meta (earliest slot) for the line-up cards
  const apMetaBySlug = new Map<string, string>()
  if (event) {
    for (const ap of event.appearances) {
      if (!ap.artist || apMetaBySlug.has(ap.artist.slug)) continue
      const parts = [fmtDayShort(ap.startTime), fmtTime(ap.startTime)]
      if (ap.stage?.name) parts.push(ap.stage.name)
      apMetaBySlug.set(ap.artist.slug, parts.join(' · '))
    }
  }

  // Timetable days grouped by calendar day (Europe/Berlin)
  const days: NoirDay[] = []
  if (event) {
    const byDay = new Map<string, typeof event.appearances>()
    for (const ap of event.appearances) {
      const k = dayKey(ap.startTime)
      if (!byDay.has(k)) byDay.set(k, [])
      byDay.get(k)!.push(ap)
    }
    for (const [, aps] of [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b))) {
      const first = aps[0].startTime
      days.push({
        id: dayKey(first).replace(/-/g, ''),
        label: `${fmtWeekdayLong(first)} · ${fmtDayNum(first)}.${fmtMonthNum(first)}.`,
        rows: aps.map((ap) => {
          const sum = ap.artist ? lineupBySlug.get(ap.artist.slug) : undefined
          const subParts: string[] = []
          if (sum?.genres?.length) subParts.push(sum.genres.join(' / '))
          if (sum?.origin) subParts.push(sum.origin)
          if (ap.note) subParts.push(ap.note)
          if (ap.stage?.name) subParts.push(ap.stage.name)
          return {
            time: fmtTime(ap.startTime),
            title: ap.artist?.name ?? ap.title ?? '—',
            subtitle: subParts.join(' · '),
            type: ROLE_TYPE[ap.role] ?? 'Programm',
            highlight: ap.role === 'headliner',
          }
        }),
      })
    }
  }

  const start = featured?.startDate
  const end = featured?.endDate ?? start
  const location = featured?.locationName ?? 'Hof Thiele, Ventschau'
  const year = start ? new Intl.DateTimeFormat('de-DE', { year: 'numeric', timeZone: TZ }).format(start) : ''
  const kicker = start
    ? `11. Ausgabe // ${fmtDayNum(start)}–${fmtDayNum(end!)} ${fmtMonthShort(start)} ${year} // ${location.toUpperCase()}`
    : '11. Ausgabe // Benefiz-Festival'
  const dateMeta = start
    ? `${fmtDayShort(start)}–${fmtDayShort(end!)}, ${fmtDayNum(start)}.–${fmtDayNum(end!)}. ${fmtMonthShort(start)}`
    : '7.–8. Aug'

  return {
    hasEvent: !!event,
    lineup,
    features: lineup.slice(0, 2),
    apMetaBySlug,
    days,
    stageCount: event?.stages.length ?? 0,
    kicker,
    dateMeta,
  }
})
