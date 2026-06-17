'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import type { TElement } from '@udecode/plate'
import { markdownToPlate } from '@/components/admin/editor/serialization/markdownToPlate'
import { plateToMarkdown } from '@/components/admin/editor/serialization/plateToMarkdown'
import MediaPickerDialog from '@/components/admin/MediaPickerDialog'
import StageManager from '@/components/admin/events/StageManager'
import TimetableBuilder from '@/components/admin/events/TimetableBuilder'

const PlateEditor = dynamic(
  () => import('@/components/admin/editor/PlateEditor').then((m) => ({ default: m.PlateEditor })),
  { ssr: false },
)

type TierRow = {
  id?: string; name: string; description?: string | null; price?: number | null
  currency?: string; validFrom?: string | null; validUntil?: string | null
  isSoldOut?: boolean; isActive?: boolean; buyUrl?: string | null
}

const EVENT_TYPES = ['festival', 'concert', 'workshop', 'other']

function toLocalInput(value: string | null | undefined): string {
  if (!value) return ''
  const d = new Date(value)
  if (isNaN(d.getTime())) return ''
  // datetime-local wants YYYY-MM-DDTHH:mm in local time
  const off = d.getTimezoneOffset()
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16)
}

export default function EditEventPage() {
  const params = useParams()
  const id = params.id as string

  const [form, setForm] = useState({
    title: '', slug: '', subtitle: '', eventType: 'festival', startDate: '', endDate: '',
    locationName: '', locationAddress: '', locationUrl: '', ticketUrl: '',
    heroImage: '', excerpt: '', metaTitle: '', metaDescription: '',
    isPublished: false, isFeatured: false, isActive: true,
  })
  const [descJson, setDescJson] = useState<TElement[] | null>(null)
  const [tiers, setTiers] = useState<TierRow[]>([])
  const [pickHero, setPickHero] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/admin/events/${id}`)
      if (!res.ok) { setSaveError('Event konnte nicht geladen werden.'); return }
      const e = await res.json()
      setForm({
        title: e.title || '', slug: e.slug || '', subtitle: e.subtitle || '',
        eventType: e.eventType || 'festival',
        startDate: toLocalInput(e.startDate), endDate: toLocalInput(e.endDate),
        locationName: e.locationName || '', locationAddress: e.locationAddress || '', locationUrl: e.locationUrl || '',
        ticketUrl: e.ticketUrl || '', heroImage: e.heroImage || '', excerpt: e.excerpt || '',
        metaTitle: e.metaTitle || '', metaDescription: e.metaDescription || '',
        isPublished: !!e.isPublished, isFeatured: !!e.isFeatured, isActive: e.isActive !== false,
      })
      setDescJson(e.descriptionJson || markdownToPlate(e.description || ''))
      setTiers(Array.isArray(e.priceTiers) ? e.priceTiers.map((t: TierRow) => ({
        ...t, validFrom: toLocalInput(t.validFrom), validUntil: toLocalInput(t.validUntil),
      })) : [])
      setLoaded(true)
    }
    load()
  }, [id])

  function set<K extends keyof typeof form>(field: K, value: (typeof form)[K]) {
    setForm((p) => ({ ...p, [field]: value }))
  }

  async function save() {
    setSaveError('')
    const description = descJson ? plateToMarkdown(descJson) : ''
    const res = await fetch(`/api/admin/events/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        startDate: form.startDate ? new Date(form.startDate).toISOString() : undefined,
        endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
        description, descriptionJson: descJson, editorMode: 'wysiwyg',
        priceTiers: tiers.map((t) => ({
          ...t,
          price: (t.price === null || t.price === undefined) ? null : Number(t.price),
          validFrom: t.validFrom ? new Date(t.validFrom).toISOString() : null,
          validUntil: t.validUntil ? new Date(t.validUntil).toISOString() : null,
        })),
      }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setSaveError(body.error || `Fehler ${res.status}`)
      return
    }
    setSaved(true); setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="max-w-3xl space-y-8">
      <h1 className="font-display text-2xl font-bold">Event bearbeiten</h1>

      {/* Core fields */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1"><span className="text-sm font-medium">Titel</span>
          <input className="glass rounded-lg px-3 py-2" value={form.title} onChange={(e) => set('title', e.target.value)} /></label>
        <label className="flex flex-col gap-1"><span className="text-sm font-medium">Slug</span>
          <input className="glass rounded-lg px-3 py-2" value={form.slug} onChange={(e) => set('slug', e.target.value)} /></label>
        <label className="flex flex-col gap-1 sm:col-span-2"><span className="text-sm font-medium">Untertitel</span>
          <input className="glass rounded-lg px-3 py-2" value={form.subtitle} onChange={(e) => set('subtitle', e.target.value)} /></label>
        <label className="flex flex-col gap-1"><span className="text-sm font-medium">Typ</span>
          <select className="glass rounded-lg px-3 py-2" value={form.eventType} onChange={(e) => set('eventType', e.target.value)}>
            {EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select></label>
        <div />
        <label className="flex flex-col gap-1"><span className="text-sm font-medium">Start</span>
          <input type="datetime-local" className="glass rounded-lg px-3 py-2" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} /></label>
        <label className="flex flex-col gap-1"><span className="text-sm font-medium">Ende</span>
          <input type="datetime-local" className="glass rounded-lg px-3 py-2" value={form.endDate} onChange={(e) => set('endDate', e.target.value)} /></label>
        <label className="flex flex-col gap-1"><span className="text-sm font-medium">Ort (Name)</span>
          <input className="glass rounded-lg px-3 py-2" value={form.locationName} onChange={(e) => set('locationName', e.target.value)} /></label>
        <label className="flex flex-col gap-1"><span className="text-sm font-medium">Ort (Adresse)</span>
          <input className="glass rounded-lg px-3 py-2" value={form.locationAddress} onChange={(e) => set('locationAddress', e.target.value)} /></label>
        <label className="flex flex-col gap-1"><span className="text-sm font-medium">Karten-Link (https)</span>
          <input className="glass rounded-lg px-3 py-2" value={form.locationUrl} onChange={(e) => set('locationUrl', e.target.value)} /></label>
        <label className="flex flex-col gap-1"><span className="text-sm font-medium">Ticket-Link (https)</span>
          <input className="glass rounded-lg px-3 py-2" value={form.ticketUrl} onChange={(e) => set('ticketUrl', e.target.value)} /></label>
        <label className="flex flex-col gap-1 sm:col-span-2"><span className="text-sm font-medium">Teaser (excerpt)</span>
          <textarea className="glass rounded-lg px-3 py-2" rows={2} value={form.excerpt} onChange={(e) => set('excerpt', e.target.value)} /></label>
      </div>

      {/* Hero image */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">Hero-Bild</span>
        {form.heroImage && <span className="text-xs text-brand-text-muted">{form.heroImage.slice(0, 48)}…</span>}
        <button type="button" onClick={() => setPickHero(true)} className="btn-secondary px-3 py-1 text-sm">Bild wählen</button>
        {form.heroImage && <button type="button" onClick={() => set('heroImage', '')} className="text-sm text-red-600">Entfernen</button>}
      </div>

      {/* Description (Plate) */}
      <div>
        <span className="mb-1 block text-sm font-medium">Beschreibung</span>
        {descJson !== null && <PlateEditor initialValue={descJson} onChange={(v: TElement[]) => setDescJson(v)} />}
      </div>

      {/* SEO */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1"><span className="text-sm font-medium">Meta-Titel (SEO)</span>
          <input className="glass rounded-lg px-3 py-2" value={form.metaTitle} onChange={(e) => set('metaTitle', e.target.value)} /></label>
        <label className="flex flex-col gap-1"><span className="text-sm font-medium">Meta-Beschreibung (SEO)</span>
          <input className="glass rounded-lg px-3 py-2" value={form.metaDescription} onChange={(e) => set('metaDescription', e.target.value)} /></label>
      </div>

      {/* Stage manager + timetable builder (Tasks 20–21) */}
      <StageManager eventId={id} />
      <TimetableBuilder eventId={id} />

      {/* Price tiers */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Preise</h2>
          <button type="button" onClick={() => setTiers((p) => [...p, { name: '', currency: 'EUR', isActive: true }])} className="btn-secondary px-3 py-1 text-sm">+ Preis</button>
        </div>
        {tiers.map((t, i) => (
          <div key={i} className="glass-card grid grid-cols-2 gap-2 p-3 sm:grid-cols-4">
            <label className="flex flex-col gap-1"><span className="sr-only" id={`tier-name-${i}`}>Name</span>
              <input aria-labelledby={`tier-name-${i}`} placeholder="Name" className="glass rounded px-2 py-1" value={t.name} onChange={(e) => setTiers((p) => p.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} /></label>
            <label className="flex flex-col gap-1"><span className="sr-only" id={`tier-price-${i}`}>Preis</span>
              <input aria-labelledby={`tier-price-${i}`} type="number" min="0" step="0.01" placeholder="Preis" className="glass rounded px-2 py-1" value={t.price ?? ''} onChange={(e) => setTiers((p) => p.map((x, j) => j === i ? { ...x, price: e.target.value === '' ? null : Number(e.target.value) } : x))} /></label>
            <label className="flex flex-col gap-1"><span className="sr-only" id={`tier-cur-${i}`}>Währung</span>
              <select aria-labelledby={`tier-cur-${i}`} className="glass rounded px-2 py-1" value={t.currency || 'EUR'} onChange={(e) => setTiers((p) => p.map((x, j) => j === i ? { ...x, currency: e.target.value } : x))}>
                {['EUR', 'USD', 'CHF', 'GBP'].map((c) => <option key={c} value={c}>{c}</option>)}
              </select></label>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={!!t.isSoldOut} onChange={(e) => setTiers((p) => p.map((x, j) => j === i ? { ...x, isSoldOut: e.target.checked } : x))} /> Ausverkauft</label>
              <button type="button" aria-label={`Preis ${i + 1} entfernen`} onClick={() => setTiers((p) => p.filter((_, j) => j !== i))} className="text-red-600">✕</button>
            </div>
          </div>
        ))}
      </div>

      {/* Status + save */}
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isPublished} onChange={(e) => set('isPublished', e.target.checked)} /> Veröffentlicht</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isFeatured} onChange={(e) => set('isFeatured', e.target.checked)} /> Hauptevent (Homepage)</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isActive} onChange={(e) => set('isActive', e.target.checked)} /> Aktiv</label>
        <button type="button" onClick={save} disabled={!loaded} className="btn-primary px-5 py-2">Speichern</button>
        {saved && <span className="text-sm text-green-600">Gespeichert ✓</span>}
        {saveError && <span className="text-sm text-red-600">{saveError}</span>}
      </div>

      <MediaPickerDialog open={pickHero} onClose={() => setPickHero(false)} onSelect={(url) => { set('heroImage', url); setPickHero(false) }} />
    </div>
  )
}
