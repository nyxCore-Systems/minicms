'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import MediaPickerDialog from '@/components/admin/MediaPickerDialog'

export default function NewArtistPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', slug: '', origin: '', genres: '', excerpt: '', heroImage: '' })
  const [pickHero, setPickHero] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  function update(field: keyof typeof form, value: string) {
    setForm((p) => {
      const next = { ...p, [field]: value }
      if (field === 'name' && !p.slug) {
        next.slug = value.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
          .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
      }
      return next
    })
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError('')
    const res = await fetch('/api/admin/artists', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, genres: form.genres.split(',').map((g) => g.trim()).filter(Boolean) }),
    })
    setSaving(false)
    if (!res.ok) { setError((await res.json()).error || 'Fehler'); return }
    const artist = await res.json()
    router.push(`/admin/artists/${artist.id}`)
  }

  return (
    <form onSubmit={submit} className="max-w-2xl space-y-4">
      <h1 className="font-display text-2xl font-bold">Neuer Künstler</h1>
      {error && <p className="rounded-section bg-red-50 p-3 text-red-700">{error}</p>}

      <label className="block">
        <span className="text-sm font-medium">Name *</span>
        <input className="mt-1 w-full rounded-section border p-2" value={form.name} onChange={(e) => update('name', e.target.value)} required />
      </label>
      <label className="block">
        <span className="text-sm font-medium">Slug *</span>
        <input className="mt-1 w-full rounded-section border p-2" value={form.slug} onChange={(e) => update('slug', e.target.value)} required />
      </label>
      <label className="block">
        <span className="text-sm font-medium">Herkunft</span>
        <input className="mt-1 w-full rounded-section border p-2" value={form.origin} onChange={(e) => update('origin', e.target.value)} />
      </label>
      <label className="block">
        <span className="text-sm font-medium">Genres (Komma-getrennt)</span>
        <input className="mt-1 w-full rounded-section border p-2" value={form.genres} onChange={(e) => update('genres', e.target.value)} />
      </label>
      <label className="block">
        <span className="text-sm font-medium">Kurzbeschreibung</span>
        <textarea className="mt-1 w-full rounded-section border p-2" rows={3} value={form.excerpt} onChange={(e) => update('excerpt', e.target.value)} />
      </label>
      <div>
        <span className="text-sm font-medium">Hero-Foto</span>
        <div className="mt-1 flex items-center gap-3">
          {form.heroImage && <span className="truncate text-sm text-brand-text-muted">{form.heroImage}</span>}
          <button type="button" className="btn-secondary px-3 py-1" onClick={() => setPickHero(true)}>Medien…</button>
        </div>
      </div>

      <button type="submit" disabled={saving} className="btn-primary px-5 py-2">
        {saving ? 'Speichert…' : 'Anlegen & weiter bearbeiten'}
      </button>

      <MediaPickerDialog
        open={pickHero}
        onClose={() => setPickHero(false)}
        onSelect={(url) => { setForm((p) => ({ ...p, heroImage: url })); setPickHero(false) }}
      />
    </form>
  )
}
