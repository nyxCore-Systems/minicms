'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

interface VendorItem {
  id: string
  name: string
  slug: string
  affiliateId: string
  description: string | null
  category: string
  website: string | null
  email: string | null
  isActive: boolean
  isFeatured: boolean
  isPromoted: boolean
  tags: string[]
  location: string | null
  since: string | null
  logoUrl: string | null
  imageUrl: string | null
  _count: { ads: number; clicks: number }
}

export default function AdminVendorsPage() {
  const [vendors, setVendors] = useState<VendorItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('all')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchVendors = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/vendors')
      if (!res.ok) throw new Error('Fehler beim Laden der Händler')
      const data = await res.json()
      setVendors(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchVendors()
  }, [fetchVendors])

  async function toggleField(id: string, field: 'isActive' | 'isFeatured' | 'isPromoted') {
    const vendor = vendors.find((v) => v.id === id)
    if (!vendor) return
    const res = await fetch(`/api/admin/vendors/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: !vendor[field] }),
    })
    if (res.ok) {
      setVendors((prev) =>
        prev.map((v) => (v.id === id ? { ...v, [field]: !v[field] } : v))
      )
    }
  }

  async function deleteVendor(id: string) {
    if (!confirm('Diesen Händler wirklich löschen? Alle zugehörigen Daten werden entfernt.')) return
    setDeletingId(id)
    const res = await fetch(`/api/admin/vendors/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setVendors((prev) => prev.filter((v) => v.id !== id))
    }
    setDeletingId(null)
  }

  const filtered = filter === 'all'
    ? vendors
    : filter === 'active'
      ? vendors.filter((v) => v.isActive)
      : filter === 'inactive'
        ? vendors.filter((v) => !v.isActive)
        : vendors.filter((v) => v.category === filter)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-2 border-brand-accent border-t-transparent rounded-full" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="glass-card text-center py-12">
        <p className="text-red-600 mb-2">Fehler: {error}</p>
        <button onClick={fetchVendors} className="btn-primary text-sm">Erneut versuchen</button>
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-display font-bold text-brand-text">
          Händler ({vendors.length})
        </h1>
        <div className="flex items-center gap-3">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="input-glass text-sm py-1.5 px-3"
          >
            <option value="all">Alle</option>
            <option value="active">Aktiv</option>
            <option value="inactive">Inaktiv</option>
            <option value="KITCHEN">Küchenmesser</option>
            <option value="OUTDOOR">Outdoormesser</option>
            <option value="COLLECTION">Kollektionen</option>
            <option value="OTHER">Sonstige</option>
          </select>
          <Link
            href="/admin/vendors/new"
            className="btn-primary text-sm whitespace-nowrap"
          >
            + Neuen Händler anlegen
          </Link>
        </div>
      </div>

      <div className="grid gap-4">
        {filtered.length === 0 ? (
          <div className="glass-card text-center py-12">
            <p className="text-brand-text-muted mb-4">
              Keine Händler gefunden.
            </p>
            <Link href="/admin/vendors/new" className="btn-primary text-sm">
              Ersten Händler anlegen
            </Link>
          </div>
        ) : (
          filtered.map((vendor) => (
            <div key={vendor.id} className="glass-card">
              <div className="flex items-start justify-between gap-4">
                {(vendor.logoUrl || vendor.imageUrl) && (
                  <img
                    src={vendor.logoUrl || vendor.imageUrl || ''}
                    alt={vendor.name}
                    className="w-14 h-14 rounded-lg object-cover shrink-0 bg-brand-bg-dark"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <Link
                      href={`/admin/vendors/${vendor.id}`}
                      className="text-lg font-semibold text-brand-text hover:text-brand-accent transition-colors"
                    >
                      {vendor.name}
                    </Link>
                    <span
                      className={`px-2 py-0.5 text-xs rounded-full ${
                        vendor.isActive
                          ? 'bg-green-100/50 text-green-800'
                          : 'bg-red-100/50 text-red-800'
                      }`}
                    >
                      {vendor.isActive ? 'Aktiv' : 'Inaktiv'}
                    </span>
                    {vendor.isFeatured && (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-brand-accent/10 text-brand-accent">
                        Featured
                      </span>
                    )}
                    {vendor.isPromoted && (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-purple-100/50 text-purple-800">
                        Promoted
                      </span>
                    )}
                  </div>
                  {vendor.description && (
                    <p className="text-sm text-brand-text-muted mb-2 line-clamp-2">
                      {vendor.description}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-brand-text-muted">
                    <span>Kategorie: {vendor.category}</span>
                    <span>Klicks: {vendor._count.clicks}</span>
                    <span>Anzeigen: {vendor._count.ads}</span>
                    {vendor.location && <span>{vendor.location}</span>}
                    <span className="font-mono text-[10px] opacity-60">
                      AFF: {vendor.affiliateId}
                    </span>
                  </div>
                  {vendor.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {vendor.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 text-[10px] rounded-full bg-brand-bg-dark text-brand-text-muted border border-brand-border"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row gap-1.5 shrink-0">
                  <Link
                    href={`/admin/vendors/${vendor.id}`}
                    className="px-3 py-1.5 text-xs rounded-lg bg-brand-accent/10 text-brand-accent hover:bg-brand-accent/20 transition-colors text-center"
                  >
                    Bearbeiten
                  </Link>
                  <button
                    onClick={() => toggleField(vendor.id, 'isActive')}
                    className="px-3 py-1.5 text-xs rounded-lg bg-brand-bg-dark hover:bg-brand-bg-dark transition-colors"
                  >
                    {vendor.isActive ? 'Deaktivieren' : 'Aktivieren'}
                  </button>
                  <button
                    onClick={() => toggleField(vendor.id, 'isPromoted')}
                    className="px-3 py-1.5 text-xs rounded-lg bg-brand-bg-dark hover:bg-brand-bg-dark transition-colors"
                  >
                    {vendor.isPromoted ? 'Unpromote' : 'Promote'}
                  </button>
                  <button
                    onClick={() => deleteVendor(vendor.id)}
                    disabled={deletingId === vendor.id}
                    className="px-3 py-1.5 text-xs rounded-lg bg-red-100/50 text-red-700 hover:bg-red-200/50 transition-colors disabled:opacity-50"
                  >
                    {deletingId === vendor.id ? '...' : 'Löschen'}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
