'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import MediaPickerDialog from '@/components/admin/MediaPickerDialog'

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[äÄ]/g, 'ae')
    .replace(/[öÖ]/g, 'oe')
    .replace(/[üÜ]/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export default function NewVendorPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mediaField, setMediaField] = useState<'logoUrl' | 'imageUrl' | null>(null)

  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    category: 'OTHER' as string,
    website: '',
    email: '',
    phone: '',
    contactPerson: '',
    location: '',
    since: '',
    tags: '',
    logoUrl: '',
    imageUrl: '',
  })

  function updateField(field: string, value: string) {
    setForm((prev) => {
      const next = { ...prev, [field]: value }
      if (field === 'name' && !prev.slug) {
        next.slug = slugify(value)
      }
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.slug) {
      setError('Name und Slug sind erforderlich.')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/admin/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
          logoUrl: form.logoUrl || null,
          imageUrl: form.imageUrl || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Fehler beim Erstellen')
      }

      const vendor = await res.json()
      router.push(`/admin/vendors/${vendor.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/admin/vendors"
          className="text-brand-text-muted hover:text-brand-text transition-colors"
        >
          &larr; Zurück
        </Link>
        <h1 className="text-2xl font-display font-bold text-brand-text">
          Neuen Händler anlegen
        </h1>
      </div>

      {error && (
        <div className="glass-card mb-4 !bg-red-50/50 border border-red-200/50">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="glass-card mb-6">
          <h2 className="text-lg font-semibold text-brand-text mb-4">Allgemein</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-brand-text mb-1">Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                className="input-glass w-full"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text mb-1">Slug *</label>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => updateField('slug', e.target.value)}
                className="input-glass w-full font-mono text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text mb-1">Kategorie</label>
              <select
                value={form.category}
                onChange={(e) => updateField('category', e.target.value)}
                className="input-glass w-full"
              >
                <option value="KITCHEN">Küchenmesser</option>
                <option value="OUTDOOR">Outdoormesser</option>
                <option value="COLLECTION">Kollektionen</option>
                <option value="OTHER">Sonstige</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text mb-1">Website</label>
              <input
                type="url"
                value={form.website}
                onChange={(e) => updateField('website', e.target.value)}
                className="input-glass w-full"
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text mb-1">E-Mail</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
                className="input-glass w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text mb-1">Telefon</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                className="input-glass w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text mb-1">Kontaktperson</label>
              <input
                type="text"
                value={form.contactPerson}
                onChange={(e) => updateField('contactPerson', e.target.value)}
                className="input-glass w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text mb-1">Standort</label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => updateField('location', e.target.value)}
                className="input-glass w-full"
                placeholder="z.B. Solingen, Deutschland"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text mb-1">Seit</label>
              <input
                type="text"
                value={form.since}
                onChange={(e) => updateField('since', e.target.value)}
                className="input-glass w-full"
                placeholder="z.B. Seit 1924"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text mb-1">Tags (kommagetrennt)</label>
              <input
                type="text"
                value={form.tags}
                onChange={(e) => updateField('tags', e.target.value)}
                className="input-glass w-full"
                placeholder="Küchenmesser, Damast, Santoku"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-brand-text mb-1">Beschreibung</label>
            <textarea
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              className="input-glass w-full h-24"
              placeholder="Kurze Beschreibung des Händlers..."
            />
          </div>
        </div>

        <div className="glass-card mb-6">
          <h2 className="text-lg font-semibold text-brand-text mb-4">Medien</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-brand-text mb-1">Logo URL</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={form.logoUrl}
                  onChange={(e) => updateField('logoUrl', e.target.value)}
                  className="input-glass flex-1"
                  placeholder="Logo-URL..."
                />
                <button
                  type="button"
                  onClick={() => setMediaField('logoUrl')}
                  className="px-3 py-1.5 text-xs rounded-lg bg-brand-accent/10 text-brand-accent hover:bg-brand-accent/20 transition-colors"
                >
                  Medien
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text mb-1">Hauptbild URL</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={form.imageUrl}
                  onChange={(e) => updateField('imageUrl', e.target.value)}
                  className="input-glass flex-1"
                  placeholder="Bild-URL..."
                />
                <button
                  type="button"
                  onClick={() => setMediaField('imageUrl')}
                  className="px-3 py-1.5 text-xs rounded-lg bg-brand-accent/10 text-brand-accent hover:bg-brand-accent/20 transition-colors"
                >
                  Medien
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary disabled:opacity-50"
          >
            {saving ? 'Wird gespeichert...' : 'Händler anlegen'}
          </button>
          <Link href="/admin/vendors" className="btn-secondary">
            Abbrechen
          </Link>
        </div>
      </form>

      <MediaPickerDialog
        open={mediaField !== null}
        onClose={() => setMediaField(null)}
        onSelect={(url) => {
          if (mediaField) {
            updateField(mediaField, url)
          }
          setMediaField(null)
        }}
      />
    </div>
  )
}
