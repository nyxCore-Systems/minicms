import Link from 'next/link'
import type { EventWithRelations } from '@/lib/events'

type Appearance = EventWithRelations['appearances'][number]

const BERLIN_TZ = 'Europe/Berlin'
const dayKey = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: BERLIN_TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
const dayLabel = (d: Date) => new Intl.DateTimeFormat('de-DE', { timeZone: BERLIN_TZ, weekday: 'short', day: '2-digit', month: '2-digit' }).format(d)
const timeLabel = (d: Date) => new Intl.DateTimeFormat('de-DE', { timeZone: BERLIN_TZ, hour: '2-digit', minute: '2-digit' }).format(d)

function slotLabel(a: Appearance) {
  return a.artist ? a.artist.name : (a.title ?? '')
}

function Slot({ a }: { a: Appearance }) {
  if (a.artist) {
    return (
      <Link href={`/kuenstler/${a.artist.slug}`} className="block rounded-pill px-2 py-1 text-sm font-medium text-brand-text hover:text-brand-accent">
        {a.artist.name}
      </Link>
    )
  }
  return <span className="block px-2 py-1 text-sm text-brand-text-muted">{a.title}</span>
}

export default function EventTimetable({ event }: { event: EventWithRelations }) {
  const { stages, appearances } = event
  if (appearances.length === 0) return null

  const days = Array.from(new Set(appearances.map((a) => dayKey(a.startTime)))).sort()
  const sortedStages = [...stages].sort((s1, s2) => s1.sortOrder - s2.sortOrder)

  return (
    <section className="mb-10">
      <h2 className="mb-4 font-display text-2xl font-bold text-brand-text">Timetable</h2>

      {/* Mobile: agenda list */}
      <div className="space-y-6 md:hidden">
        {days.map((day) => {
          const rows = appearances.filter((a) => dayKey(a.startTime) === day)
          return (
            <div key={day}>
              <h3 className="mb-2 border-b border-brand-text/10 pb-1 font-display text-lg font-bold text-brand-text">
                {dayLabel(rows[0].startTime)}
              </h3>
              <ul className="space-y-1">
                {rows.map((a) => (
                  <li key={a.id} className="flex items-baseline gap-3 text-sm">
                    <span className="w-12 shrink-0 tabular-nums text-brand-text-muted">{timeLabel(a.startTime)}</span>
                    <span className="flex-1">{slotLabel(a) || '—'}</span>
                    <span className="shrink-0 text-xs text-brand-text-muted">{a.stage?.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>

      {/* Desktop: grid per day (Bühne × Zeit) */}
      <div className="hidden space-y-8 md:block">
        {days.map((day) => {
          const dayRows = appearances.filter((a) => dayKey(a.startTime) === day)
          const times = Array.from(new Set(dayRows.map((a) => a.startTime.toISOString()))).sort()
          return (
            <div key={day} className="overflow-x-auto">
              <h3 className="mb-3 font-display text-lg font-bold text-brand-text">{dayLabel(dayRows[0].startTime)}</h3>
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr>
                    <th className="w-20 border-b border-brand-text/10 p-2 text-xs uppercase tracking-wider text-brand-text-muted">Zeit</th>
                    {sortedStages.map((s) => (
                      <th key={s.id} className="border-b border-brand-text/10 p-2 text-xs uppercase tracking-wider text-brand-text-muted"
                        style={s.color ? { color: s.color } : undefined}>
                        {s.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {times.map((t) => (
                    <tr key={t}>
                      <td className="border-b border-brand-text/5 p-2 align-top text-sm tabular-nums text-brand-text-muted">
                        {timeLabel(new Date(t))}
                      </td>
                      {sortedStages.map((s) => {
                        const cell = dayRows.filter((a) => a.stageId === s.id && a.startTime.toISOString() === t)
                        return (
                          <td key={s.id} className="border-b border-brand-text/5 p-1 align-top">
                            {cell.map((a) => <Slot key={a.id} a={a} />)}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        })}
      </div>
      <p className="mt-3 text-xs text-brand-text-muted">klickbare Slots führen zur Künstler-Seite</p>
    </section>
  )
}
