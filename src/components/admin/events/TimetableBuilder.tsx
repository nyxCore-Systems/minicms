'use client'

import { useEffect, useState } from 'react'

type Stage = { id: string; name: string }
type ArtistOpt = { id: string; name: string }
type Appearance = {
  id: string; stageId: string; artistId: string | null; title: string | null
  role: string; startTime: string; endTime: string | null; sortOrder: number
  note: string | null
}

const ROLES = ['headliner', 'support', 'guest', 'break']

function toLocalInput(value: string | null): string {
  if (!value) return ''
  const d = new Date(value)
  if (isNaN(d.getTime())) return ''
  const off = d.getTimezoneOffset()
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16)
}

export default function TimetableBuilder({ eventId }: { eventId: string }) {
  const [stages, setStages] = useState<Stage[]>([])
  const [artists, setArtists] = useState<ArtistOpt[]>([])
  const [rows, setRows] = useState<Appearance[]>([])
  const [error, setError] = useState('')
  const [eventStart, setEventStart] = useState<string | null>(null)

  async function reload() {
    try {
      const res = await fetch(`/api/admin/events/${eventId}`)
      if (!res.ok) { setError('Timetable konnte nicht geladen werden.'); return }
      const e = await res.json()
      setStages(Array.isArray(e.stages) ? e.stages : [])
      if (e.startDate) setEventStart(e.startDate)
      setRows(Array.isArray(e.appearances) ? e.appearances.map((a: Appearance) => ({
        ...a,
        startTime: toLocalInput(a.startTime),
        endTime: toLocalInput(a.endTime),
        note: a.note ?? null,
      })) : [])
    } catch {
      setError('Timetable konnte nicht geladen werden.')
    }
  }

  useEffect(() => {
    reload()
    fetch('/api/admin/artists')
      .then((r) => { if (!r.ok) throw new Error('artists fetch failed'); return r.json() })
      .then((d) => {
        setArtists(Array.isArray(d) ? d.map((a: { id: string; name: string }) => ({ id: a.id, name: a.name })) : [])
      })
      .catch(() => setError('Timetable konnte nicht geladen werden.'))
  }, [eventId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function add() {
    setError('')
    if (stages.length === 0) { setError('Erst eine Bühne anlegen.'); return }
    const res = await fetch(`/api/admin/events/${eventId}/appearances`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stageId: stages[0].id, title: 'Neuer Slot', role: 'support',
        startTime: eventStart || new Date().toISOString(),
        sortOrder: rows.length,
      }),
    })
    if (!res.ok) { setError((await res.json().catch(() => ({}))).error || 'Fehler'); return }
    reload()
  }

  async function persist(row: Appearance) {
    setError('')
    const res = await fetch(`/api/admin/events/${eventId}/appearances/${row.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stageId: row.stageId,
        artistId: row.artistId || null,
        title: row.artistId ? null : (row.title || null),
        role: row.role,
        startTime: row.startTime ? new Date(row.startTime).toISOString() : null,
        endTime: row.endTime ? new Date(row.endTime).toISOString() : null,
        sortOrder: row.sortOrder,
        note: row.note || null,
      }),
    })
    if (!res.ok) {
      setError((await res.json().catch(() => ({}))).error || 'Fehler beim Speichern eines Slots')
      reload()
      return
    }
  }

  async function remove(id: string) {
    const res = await fetch(`/api/admin/events/${eventId}/appearances/${id}`, { method: 'DELETE' })
    if (!res.ok) return
    setRows((p) => p.filter((r) => r.id !== id))
  }

  function patch(id: string, changes: Partial<Appearance>) {
    setRows((p) => p.map((r) => (r.id === id ? { ...r, ...changes } : r)))
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold">Timetable</h2>
        <button type="button" onClick={add} className="btn-secondary px-3 py-1 text-sm">+ Slot</button>
      </div>
      {rows.length === 0 && <p className="text-sm text-brand-text-muted">Noch keine Slots. Lege zuerst Bühnen an, dann Slots.</p>}
      {rows.map((r, i) => (
        <div key={r.id} className="glass-card p-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-6">
            <label className="flex flex-col gap-1"><span className="sr-only" id={`ap-stage-${i}`}>Bühne</span>
              <select aria-labelledby={`ap-stage-${i}`} className="glass rounded px-2 py-1" value={r.stageId}
                onChange={(e) => patch(r.id, { stageId: e.target.value })} onBlur={() => persist(r)}>
                {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select></label>
            <label className="flex flex-col gap-1"><span className="sr-only" id={`ap-artist-${i}`}>Künstler</span>
              <select aria-labelledby={`ap-artist-${i}`} className="glass rounded px-2 py-1" value={r.artistId || ''}
                onChange={(e) => patch(r.id, { artistId: e.target.value || null, title: e.target.value ? '' : r.title })} onBlur={() => persist(r)}>
                <option value="">— Freitext —</option>
                {artists.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select></label>
            <label className="flex flex-col gap-1"><span className="sr-only" id={`ap-title-${i}`}>Titel (falls kein Künstler)</span>
              <input aria-labelledby={`ap-title-${i}`} placeholder="Titel" className="glass rounded px-2 py-1" value={r.title || ''} disabled={!!r.artistId}
                onChange={(e) => patch(r.id, { title: e.target.value })} onBlur={() => persist(r)} /></label>
            <label className="flex flex-col gap-1"><span className="sr-only" id={`ap-role-${i}`}>Rolle</span>
              <select aria-labelledby={`ap-role-${i}`} className="glass rounded px-2 py-1" value={r.role}
                onChange={(e) => patch(r.id, { role: e.target.value })} onBlur={() => persist(r)}>
                {ROLES.map((ro) => <option key={ro} value={ro}>{ro}</option>)}
              </select></label>
            <label className="flex flex-col gap-1"><span className="sr-only" id={`ap-start-${i}`}>Start</span>
              <input aria-labelledby={`ap-start-${i}`} type="datetime-local" className="glass rounded px-2 py-1" value={r.startTime}
                onChange={(e) => patch(r.id, { startTime: e.target.value })} onBlur={() => persist(r)} /></label>
            <div className="flex items-center gap-2">
              <label className="flex flex-col gap-1"><span className="sr-only" id={`ap-end-${i}`}>Ende</span>
                <input aria-labelledby={`ap-end-${i}`} type="datetime-local" className="glass rounded px-2 py-1" value={r.endTime || ''}
                  onChange={(e) => patch(r.id, { endTime: e.target.value || null })} onBlur={() => persist(r)} /></label>
              <button type="button" aria-label={`Slot ${i + 1} entfernen`} onClick={() => remove(r.id)} className="text-red-600">✕</button>
            </div>
          </div>
          <label className="sr-only" htmlFor={`ap-note-${i}`}>Notiz</label>
          <input id={`ap-note-${i}`} placeholder="Notiz (optional)" value={r.note || ''} onChange={(e) => patch(r.id, { note: e.target.value })} onBlur={() => persist(r)} className="glass rounded px-2 py-1 w-full mt-1 text-sm" />
        </div>
      ))}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
