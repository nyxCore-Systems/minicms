'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type EventRow = {
  id: string
  title: string
  slug: string
  startDate: string
  isPublished: boolean
  isActive: boolean
  isFeatured: boolean
  _count?: { stages: number; appearances: number; priceTiers: number }
}

export default function AdminEventsPage() {
  const [events, setEvents] = useState<EventRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/events')
      .then((r) => r.json())
      .then((d) => setEvents(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false))
  }, [])

  async function toggleField(id: string, field: 'isPublished' | 'isActive' | 'isFeatured', current: boolean) {
    const res = await fetch(`/api/admin/events/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: !current }),
    })
    if (!res.ok) return
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, [field]: !current } : e)))
  }

  async function remove(id: string) {
    if (!confirm('Veranstaltung wirklich löschen? Bühnen, Timetable und Preise werden mitgelöscht.')) return
    const res = await fetch(`/api/admin/events/${id}`, { method: 'DELETE' })
    if (!res.ok) return
    setEvents((prev) => prev.filter((e) => e.id !== id))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Events</h1>
        <Link href="/admin/events/new" className="btn-primary px-4 py-2">+ Neues Event</Link>
      </div>

      {loading ? (
        <p>Lädt…</p>
      ) : events.length === 0 ? (
        <p className="text-brand-text-muted">Noch keine Events angelegt.</p>
      ) : (
        <div className="grid gap-4">
          {events.map((e) => (
            <div key={e.id} className="glass-card flex items-center justify-between gap-4 p-4">
              <div>
                <p className="font-semibold">{e.title}</p>
                <p className="text-sm text-brand-text-muted">
                  /{e.slug} · {new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium' }).format(new Date(e.startDate))}
                  {e._count ? ` · ${e._count.appearances} Slots · ${e._count.stages} Bühnen` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <button onClick={() => toggleField(e.id, 'isPublished', e.isPublished)} aria-pressed={e.isPublished} aria-label="Veröffentlichungsstatus" className="rounded-pill px-3 py-1 glass">
                  {e.isPublished ? 'Veröffentlicht' : 'Entwurf'}
                </button>
                <button onClick={() => toggleField(e.id, 'isFeatured', e.isFeatured)} aria-pressed={e.isFeatured} aria-label="Hauptevent-Status" className="rounded-pill px-3 py-1 glass">
                  {e.isFeatured ? '★ Hauptevent' : '☆'}
                </button>
                <Link href={`/admin/events/${e.id}`} className="btn-secondary px-3 py-1">Bearbeiten</Link>
                <button onClick={() => remove(e.id)} className="px-3 py-1 text-red-600">Löschen</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
