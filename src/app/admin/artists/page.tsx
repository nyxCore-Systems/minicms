'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type Artist = {
  id: string; name: string; slug: string; origin: string | null
  isPublished: boolean; isActive: boolean; isFeatured: boolean
  _count?: { media: number }
}

export default function AdminArtistsPage() {
  const [artists, setArtists] = useState<Artist[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/artists')
      .then((r) => r.json())
      .then((d) => setArtists(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false))
  }, [])

  async function toggleField(id: string, field: 'isPublished' | 'isActive' | 'isFeatured', current: boolean) {
    await fetch(`/api/admin/artists/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: !current }),
    })
    setArtists((prev) => prev.map((a) => (a.id === id ? { ...a, [field]: !current } : a)))
  }

  async function remove(id: string) {
    if (!confirm('Künstler wirklich löschen?')) return
    await fetch(`/api/admin/artists/${id}`, { method: 'DELETE' })
    setArtists((prev) => prev.filter((a) => a.id !== id))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Künstler</h1>
        <Link href="/admin/artists/new" className="btn-primary px-4 py-2">+ Neuer Künstler</Link>
      </div>

      {loading ? (
        <p>Lädt…</p>
      ) : artists.length === 0 ? (
        <p className="text-brand-text-muted">Noch keine Künstler angelegt.</p>
      ) : (
        <div className="grid gap-4">
          {artists.map((a) => (
            <div key={a.id} className="glass-card flex items-center justify-between gap-4 rounded-section p-4">
              <div>
                <p className="font-semibold">{a.name}</p>
                <p className="text-sm text-brand-text-muted">/{a.slug}{a.origin ? ` · ${a.origin}` : ''}</p>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <button onClick={() => toggleField(a.id, 'isPublished', a.isPublished)} className="rounded-pill px-3 py-1 glass">
                  {a.isPublished ? 'Veröffentlicht' : 'Entwurf'}
                </button>
                <button onClick={() => toggleField(a.id, 'isFeatured', a.isFeatured)} className="rounded-pill px-3 py-1 glass">
                  {a.isFeatured ? '★ Headliner' : '☆'}
                </button>
                <Link href={`/admin/artists/${a.id}`} className="btn-secondary px-3 py-1">Bearbeiten</Link>
                <button onClick={() => remove(a.id)} className="px-3 py-1 text-red-600">Löschen</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
