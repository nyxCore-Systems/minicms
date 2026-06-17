'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function NewEventPage() {
  const router = useRouter()
  const [form, setForm] = useState({ title: '', slug: '', startDate: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function update(field: keyof typeof form, value: string) {
    setForm((p) => {
      const next = { ...p, [field]: value }
      if (field === 'title' && !p.slug) {
        next.slug = value.toLowerCase()
          .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
          .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
      }
      return next
    })
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError('')
    const res = await fetch('/api/admin/events', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    if (!res.ok) { setError((await res.json().catch(() => ({}))).error || 'Fehler'); return }
    const event = await res.json()
    router.push(`/admin/events/${event.id}`)
  }

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="font-display text-2xl font-bold">Neues Event</h1>
      <form onSubmit={submit} className="space-y-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Titel</span>
          <input className="glass rounded-lg px-3 py-2" value={form.title} onChange={(e) => update('title', e.target.value)} required />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Slug</span>
          <input className="glass rounded-lg px-3 py-2" value={form.slug} onChange={(e) => update('slug', e.target.value)} required />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Startdatum &amp; Uhrzeit</span>
          <input type="datetime-local" className="glass rounded-lg px-3 py-2" value={form.startDate} onChange={(e) => update('startDate', e.target.value)} required />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={saving} className="btn-primary px-5 py-2">{saving ? 'Speichert…' : 'Erstellen'}</button>
      </form>
    </div>
  )
}
