'use client'

import { useEffect, useState } from 'react'

type Stage = { id: string; name: string; color: string | null; sortOrder: number }

export default function StageManager({ eventId }: { eventId: string }) {
  const [stages, setStages] = useState<Stage[]>([])
  const [newName, setNewName] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/admin/events/${eventId}`).then((r) => r.json()).then((e) => {
      setStages(Array.isArray(e.stages) ? e.stages : [])
    })
  }, [eventId])

  async function add() {
    setError('')
    if (!newName.trim()) return
    const res = await fetch(`/api/admin/events/${eventId}/stages`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), sortOrder: stages.length }),
    })
    if (!res.ok) { setError((await res.json().catch(() => ({}))).error || 'Fehler'); return }
    const stage = await res.json()
    setStages((p) => [...p, stage])
    setNewName('')
  }

  async function rename(stage: Stage, name: string) {
    const res = await fetch(`/api/admin/events/${eventId}/stages/${stage.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, color: stage.color, sortOrder: stage.sortOrder }),
    })
    if (!res.ok) return
    setStages((p) => p.map((s) => (s.id === stage.id ? { ...s, name } : s)))
  }

  async function remove(id: string) {
    if (!confirm('Bühne löschen? Zugehörige Timetable-Slots werden mitgelöscht.')) return
    const res = await fetch(`/api/admin/events/${eventId}/stages/${id}`, { method: 'DELETE' })
    if (!res.ok) return
    setStages((p) => p.filter((s) => s.id !== id))
  }

  return (
    <div className="space-y-3">
      <h2 className="font-display text-lg font-bold">Bühnen</h2>
      <div className="space-y-2">
        {stages.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2">
            <label className="sr-only" htmlFor={`stage-name-${i}`}>Bühnenname</label>
            <input id={`stage-name-${i}`} className="glass flex-1 rounded px-2 py-1" value={s.name}
              onChange={(e) => setStages((p) => p.map((x) => (x.id === s.id ? { ...x, name: e.target.value } : x)))}
              onBlur={(e) => rename(s, e.target.value)} />
            <button type="button" aria-label={`Bühne ${i + 1} löschen`} onClick={() => remove(s.id)} className="text-red-600">✕</button>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <label className="sr-only" htmlFor="new-stage">Neue Bühne</label>
        <input id="new-stage" className="glass flex-1 rounded px-2 py-1" placeholder="Neue Bühne…" value={newName} onChange={(e) => setNewName(e.target.value)} />
        <button type="button" onClick={add} className="btn-secondary px-3 py-1 text-sm">+ Bühne</button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
