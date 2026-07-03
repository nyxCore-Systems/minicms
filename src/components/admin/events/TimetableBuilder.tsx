'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy, useSortable, sortableKeyboardCoordinates, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  localDayKey, localClock, combineDayClock, resolveEndDate, eventDays, type DayOption,
} from '@/lib/timetable-datetime'
import { CATEGORY_LABELS, SLOT_CATEGORIES, DEFAULT_SLOT_CATEGORY } from '@/lib/lineup'

type Stage = { id: string; name: string }
type ArtistOpt = { id: string; name: string }
type Row = {
  id: string; stageId: string; artistId: string | null; title: string | null
  category: string; day: string; startClock: string; endClock: string; sortOrder: number
  note: string | null
}
type ApiAppearance = {
  id: string; stageId: string; artistId: string | null; title: string | null
  category: string; startTime: string; endTime: string | null; sortOrder: number; note: string | null
}


function toRow(a: ApiAppearance): Row {
  const start = new Date(a.startTime)
  const end = a.endTime ? new Date(a.endTime) : null
  return {
    id: a.id, stageId: a.stageId, artistId: a.artistId, title: a.title, category: a.category,
    day: isNaN(start.getTime()) ? '' : localDayKey(start),
    startClock: isNaN(start.getTime()) ? '' : localClock(start),
    endClock: end && !isNaN(end.getTime()) ? localClock(end) : '',
    sortOrder: a.sortOrder, note: a.note ?? null,
  }
}

export default function TimetableBuilder({ eventId }: { eventId: string }) {
  const [stages, setStages] = useState<Stage[]>([])
  const [artists, setArtists] = useState<ArtistOpt[]>([])
  const [rows, setRows] = useState<Row[]>([])
  const [error, setError] = useState('')
  const [eventStart, setEventStart] = useState<string | null>(null)
  const [eventEnd, setEventEnd] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const dayOptions = useMemo<DayOption[]>(() => {
    const rowDays = rows.map((r) => r.day).filter(Boolean)
    if (eventStart) {
      return eventDays(new Date(eventStart), eventEnd ? new Date(eventEnd) : null, rowDays)
    }
    if (rowDays.length) {
      const uniq = [...new Set(rowDays)].sort()
      return eventDays(combineDayClock(uniq[0], '00:00'), combineDayClock(uniq[uniq.length - 1], '00:00'), rowDays)
    }
    return []
  }, [eventStart, eventEnd, rows])

  async function reload() {
    try {
      const res = await fetch(`/api/admin/events/${eventId}`)
      if (!res.ok) { setError('Timetable konnte nicht geladen werden.'); return }
      const e = await res.json()
      setStages(Array.isArray(e.stages) ? e.stages : [])
      if (e.startDate) setEventStart(e.startDate)
      setEventEnd(e.endDate ?? null)
      const loaded: Row[] = Array.isArray(e.appearances) ? e.appearances.map(toRow) : []
      loaded.sort((a, b) => a.sortOrder - b.sortOrder)
      setRows(loaded)
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
    const defaultDay = dayOptions[0]?.value || (eventStart ? localDayKey(new Date(eventStart)) : '')
    const startTime = defaultDay ? combineDayClock(defaultDay, '20:00').toISOString() : new Date().toISOString()
    const res = await fetch(`/api/admin/events/${eventId}/appearances`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stageId: stages[0].id, title: 'Neuer Slot', category: DEFAULT_SLOT_CATEGORY,
        startTime, sortOrder: rows.length,
      }),
    })
    if (!res.ok) { setError((await res.json().catch(() => ({}))).error || 'Fehler'); return }
    reload()
  }

  async function persist(row: Row) {
    setError('')
    if (!row.day || !row.startClock) { setError('Tag und Startzeit sind erforderlich.'); return }
    const start = combineDayClock(row.day, row.startClock)
    const end = resolveEndDate(start, row.day, row.endClock)
    const res = await fetch(`/api/admin/events/${eventId}/appearances/${row.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stageId: row.stageId,
        artistId: row.artistId || null,
        title: row.artistId ? null : (row.title || null),
        category: row.category,
        startTime: start.toISOString(),
        endTime: end ? end.toISOString() : null,
        sortOrder: row.sortOrder,
        note: row.note || null,
      }),
    })
    if (!res.ok) {
      setError((await res.json().catch(() => ({}))).error || 'Fehler beim Speichern eines Slots')
      reload()
    }
  }

  async function remove(id: string) {
    const res = await fetch(`/api/admin/events/${eventId}/appearances/${id}`, { method: 'DELETE' })
    if (!res.ok) return
    setRows((p) => p.filter((r) => r.id !== id))
  }

  function patch(id: string, changes: Partial<Row>) {
    setRows((p) => p.map((r) => (r.id === id ? { ...r, ...changes } : r)))
  }

  async function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const oldIndex = rows.findIndex((r) => r.id === active.id)
    const newIndex = rows.findIndex((r) => r.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    const reordered = arrayMove(rows, oldIndex, newIndex).map((r, i) => ({ ...r, sortOrder: i }))
    setRows(reordered)
    setError('')
    const res = await fetch(`/api/admin/events/${eventId}/appearances/reorder`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: reordered.map((r) => r.id) }),
    })
    if (!res.ok) {
      setError((await res.json().catch(() => ({}))).error || 'Sortierung konnte nicht gespeichert werden.')
      reload()
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold">Timetable</h2>
        <button type="button" onClick={add} className="btn-secondary px-3 py-1 text-sm">+ Slot</button>
      </div>
      {rows.length === 0 && <p className="text-sm text-brand-text-muted">Noch keine Slots. Lege zuerst Bühnen an, dann Slots.</p>}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={rows.map((r) => r.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {rows.map((r, i) => (
              <SortableRow
                key={r.id} row={r} index={i}
                stages={stages} artists={artists} dayOptions={dayOptions}
                patch={patch} persist={persist} remove={remove}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}

function SortableRow({
  row, index, stages, artists, dayOptions, patch, persist, remove,
}: {
  row: Row; index: number; stages: Stage[]; artists: ArtistOpt[]; dayOptions: DayOption[]
  patch: (id: string, changes: Partial<Row>) => void
  persist: (row: Row) => void
  remove: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: row.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }
  const i = index
  // Ensure the row's own day is always selectable even if outside the option list.
  const dayValues = dayOptions.map((o) => o.value)
  const options = row.day && !dayValues.includes(row.day)
    ? [{ value: row.day, label: row.day }, ...dayOptions]
    : dayOptions

  return (
    <div ref={setNodeRef} style={style} className="glass-card p-3">
      <div className="flex items-start gap-2">
        <button
          type="button" aria-label={`Slot ${i + 1} verschieben`}
          className="cursor-grab touch-none px-1 py-1 text-brand-text-muted select-none active:cursor-grabbing"
          {...attributes} {...listeners}
        >⠿</button>
        <div className="flex-1">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-7">
            <label className="flex flex-col gap-1"><span className="sr-only" id={`ap-stage-${i}`}>Bühne</span>
              <select aria-labelledby={`ap-stage-${i}`} className="glass rounded px-2 py-1" value={row.stageId}
                onChange={(e) => patch(row.id, { stageId: e.target.value })} onBlur={() => persist(row)}>
                {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select></label>
            <label className="flex flex-col gap-1"><span className="sr-only" id={`ap-artist-${i}`}>Künstler</span>
              <select aria-labelledby={`ap-artist-${i}`} className="glass rounded px-2 py-1" value={row.artistId || ''}
                onChange={(e) => patch(row.id, { artistId: e.target.value || null, title: e.target.value ? '' : row.title })} onBlur={() => persist(row)}>
                <option value="">— Freitext —</option>
                {artists.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select></label>
            <label className="flex flex-col gap-1"><span className="sr-only" id={`ap-title-${i}`}>Titel (falls kein Künstler)</span>
              <input aria-labelledby={`ap-title-${i}`} placeholder="Titel" className="glass rounded px-2 py-1" value={row.title || ''} disabled={!!row.artistId}
                onChange={(e) => patch(row.id, { title: e.target.value })} onBlur={() => persist(row)} /></label>
            <label className="flex flex-col gap-1"><span className="sr-only" id={`ap-category-${i}`}>Kategorie</span>
              <select aria-labelledby={`ap-category-${i}`} className="glass rounded px-2 py-1" value={row.category}
                onChange={(e) => patch(row.id, { category: e.target.value })} onBlur={() => persist(row)}>
                {SLOT_CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
              </select></label>
            <label className="flex flex-col gap-1"><span className="sr-only" id={`ap-day-${i}`}>Tag</span>
              <select aria-labelledby={`ap-day-${i}`} className="glass rounded px-2 py-1" value={row.day}
                onChange={(e) => patch(row.id, { day: e.target.value })} onBlur={() => persist(row)}>
                {options.length === 0 && <option value="">—</option>}
                {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select></label>
            <label className="flex flex-col gap-1"><span className="sr-only" id={`ap-start-${i}`}>Start</span>
              <input aria-labelledby={`ap-start-${i}`} type="time" className="glass rounded px-2 py-1" value={row.startClock}
                onChange={(e) => patch(row.id, { startClock: e.target.value })} onBlur={() => persist(row)} /></label>
            <div className="flex items-end gap-2">
              <label className="flex flex-1 flex-col gap-1"><span className="sr-only" id={`ap-end-${i}`}>Ende</span>
                <input aria-labelledby={`ap-end-${i}`} type="time" className="glass rounded px-2 py-1" value={row.endClock}
                  onChange={(e) => patch(row.id, { endClock: e.target.value })} onBlur={() => persist(row)} /></label>
              <button type="button" aria-label={`Slot ${i + 1} entfernen`} onClick={() => remove(row.id)} className="pb-1 text-red-600">✕</button>
            </div>
          </div>
          <label className="sr-only" htmlFor={`ap-note-${i}`}>Notiz</label>
          <input id={`ap-note-${i}`} placeholder="Notiz (optional)" value={row.note || ''} onChange={(e) => patch(row.id, { note: e.target.value })} onBlur={() => persist(row)} className="glass rounded px-2 py-1 w-full mt-1 text-sm" />
        </div>
      </div>
    </div>
  )
}
