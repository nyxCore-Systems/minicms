'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import MediaPickerDialog from '@/components/admin/MediaPickerDialog'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'

interface VendorRef {
  id: string
  name: string
  slug: string
}

interface Ad {
  id: string
  title: string
  content: string | null
  imageUrl: string | null
  videoUrl: string | null
  linkUrl: string | null
  position: string
  isActive: boolean
  startDate: string | null
  endDate: string | null
  clicks: number
  views: number
  vendorId: string
  vendor: VendorRef
  bannerType: string | null
  weight: number
  impressionTarget: number | null
  costPerMille: number | null
  width: number | null
  height: number | null
  createdAt: string
}

interface AdFormData {
  title: string
  content: string
  imageUrl: string
  videoUrl: string
  linkUrl: string
  position: string
  vendorId: string
  startDate: string
  endDate: string
  isActive: boolean
  bannerType: string
  weight: number
  impressionTarget: string
  costPerMille: string
}

const EMPTY_FORM: AdFormData = {
  title: '',
  content: '',
  imageUrl: '',
  videoUrl: '',
  linkUrl: '',
  position: 'sidebar',
  vendorId: '',
  startDate: '',
  endDate: '',
  isActive: true,
  bannerType: '',
  weight: 1,
  impressionTarget: '',
  costPerMille: '',
}

const BANNER_DIMENSIONS: Record<string, { width: number; height: number }> = {
  HOMEPAGE_SLIDER: { width: 1200, height: 400 },
  HOMEPAGE_FIXED: { width: 728, height: 90 },
  CONTENT_FIXED_WIDE: { width: 970, height: 250 },
  CONTENT_FIXED_TALL: { width: 300, height: 600 },
}

const BANNER_TYPE_LABELS: Record<string, string> = {
  '': 'Klassisch',
  HOMEPAGE_SLIDER: 'Homepage Slider',
  HOMEPAGE_FIXED: 'Homepage Festplatz',
  CONTENT_FIXED_WIDE: 'Content Breit',
  CONTENT_FIXED_TALL: 'Content Hoch',
}

const POSITION_LABELS: Record<string, string> = {
  hero: 'Hero',
  sidebar: 'Sidebar',
  inline: 'Inline',
  footer: 'Footer',
}

export default function AdminAdsPage() {
  const [ads, setAds] = useState<Ad[]>([])
  const [vendors, setVendors] = useState<VendorRef[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<AdFormData>({ ...EMPTY_FORM })
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [showMediaPicker, setShowMediaPicker] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const [adsRes, vendorRes] = await Promise.all([
        fetch('/api/admin/ads'),
        fetch('/api/admin/vendors'),
      ])
      if (!adsRes.ok || !vendorRes.ok) throw new Error('Laden fehlgeschlagen')
      const adsData = await adsRes.json()
      const vendorData = await vendorRes.json()
      setAds(adsData)
      setVendors(
        vendorData.map((v: VendorRef) => ({
          id: v.id,
          name: v.name,
          slug: v.slug,
        }))
      )
    } catch {
      setError('Daten konnten nicht geladen werden')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  function openAddForm() {
    setEditingId(null)
    setForm({ ...EMPTY_FORM, vendorId: vendors[0]?.id || '' })
    setShowForm(true)
  }

  function openEditForm(ad: Ad) {
    setEditingId(ad.id)
    setForm({
      title: ad.title,
      content: ad.content || '',
      imageUrl: ad.imageUrl || '',
      videoUrl: ad.videoUrl || '',
      linkUrl: ad.linkUrl || '',
      position: ad.position,
      vendorId: ad.vendorId,
      startDate: ad.startDate ? ad.startDate.slice(0, 10) : '',
      endDate: ad.endDate ? ad.endDate.slice(0, 10) : '',
      isActive: ad.isActive,
      bannerType: ad.bannerType || '',
      weight: ad.weight || 1,
      impressionTarget: ad.impressionTarget ? String(ad.impressionTarget) : '',
      costPerMille: ad.costPerMille ? String(ad.costPerMille) : '',
    })
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditingId(null)
    setForm({ ...EMPTY_FORM })
  }

  async function handleSave() {
    if (!form.title || !form.vendorId) {
      setError('Titel und Handler sind Pflichtfelder')
      return
    }
    setSaving(true)
    setError('')
    try {
      const payload = {
        title: form.title,
        content: form.content || null,
        imageUrl: form.imageUrl || null,
        videoUrl: form.videoUrl || null,
        linkUrl: form.linkUrl || null,
        position: form.position,
        vendorId: form.vendorId,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        isActive: form.isActive,
        bannerType: form.bannerType || null,
        weight: form.weight,
        impressionTarget: form.impressionTarget ? parseInt(form.impressionTarget) : null,
        costPerMille: form.costPerMille ? parseFloat(form.costPerMille) : null,
        width: form.bannerType && BANNER_DIMENSIONS[form.bannerType] ? BANNER_DIMENSIONS[form.bannerType].width : null,
        height: form.bannerType && BANNER_DIMENSIONS[form.bannerType] ? BANNER_DIMENSIONS[form.bannerType].height : null,
      }

      const res = editingId
        ? await fetch(`/api/admin/ads/${editingId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/admin/ads', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Fehler beim Speichern')
      }

      closeForm()
      await fetchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern')
    } finally {
      setSaving(false)
    }
  }

  async function deleteAd(id: string) {
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/ads/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Fehler beim Loschen')
      setDeleteConfirm(null)
      await fetchData()
    } catch {
      setError('Anzeige konnte nicht geloscht werden')
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(ad: Ad) {
    try {
      const res = await fetch(`/api/admin/ads/${ad.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !ad.isActive }),
      })
      if (!res.ok) throw new Error('Fehler')
      await fetchData()
    } catch {
      setError('Status konnte nicht geandert werden')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-2 border-brand-accent border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-brand-text">
            Werbeanzeigen ({ads.length})
          </h1>
          <p className="text-sm text-brand-text-muted mt-1">
            Anzeigen verwalten
          </p>
        </div>
        <button onClick={openAddForm} className="btn-primary text-sm whitespace-nowrap">
          <PlusIcon className="w-4 h-4 inline mr-1" />
          Neue Anzeige
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl mb-4">
          {error}
          <button onClick={() => setError('')} className="ml-2 underline">
            Schliessen
          </button>
        </div>
      )}

      {showForm && (
        <div className="glass rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-brand-text mb-4">
            {editingId ? 'Anzeige bearbeiten' : 'Neue Anzeige'}
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-brand-text mb-1">
                Titel *
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="input-glass w-full"
                placeholder="Anzeigentitel"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text mb-1">
                Handler *
              </label>
              <select
                value={form.vendorId}
                onChange={(e) => setForm({ ...form, vendorId: e.target.value })}
                className="input-glass w-full"
              >
                <option value="">Handler wahlen...</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text mb-1">
                Link-URL
              </label>
              <input
                type="url"
                value={form.linkUrl}
                onChange={(e) => setForm({ ...form, linkUrl: e.target.value })}
                className="input-glass w-full"
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text mb-1">
                Position
              </label>
              <select
                value={form.position}
                onChange={(e) => setForm({ ...form, position: e.target.value })}
                className="input-glass w-full"
              >
                <option value="hero">Hero</option>
                <option value="sidebar">Sidebar</option>
                <option value="inline">Inline</option>
                <option value="footer">Footer</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text mb-1">
                Bild-URL
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={form.imageUrl}
                  onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                  className="input-glass flex-1"
                  placeholder="https://..."
                />
                <button
                  type="button"
                  onClick={() => setShowMediaPicker(true)}
                  className="px-3 py-1.5 text-xs rounded-lg bg-brand-accent/10 text-brand-accent hover:bg-brand-accent/20 transition-colors"
                >
                  Medien
                </button>
              </div>
              {form.imageUrl && (
                <div className="mt-2 relative w-20 h-20 rounded-lg overflow-hidden bg-brand-bg-dark">
                  <Image
                    src={form.imageUrl}
                    alt="Vorschau"
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text mb-1">
                Video-URL
              </label>
              <input
                type="text"
                value={form.videoUrl}
                onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
                className="input-glass w-full"
                placeholder="https://...video.mp4"
              />
              {form.videoUrl && (
                <video
                  src={form.videoUrl}
                  controls
                  muted
                  playsInline
                  className="mt-2 w-40 rounded-lg"
                />
              )}
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-brand-text mb-1">
                  Startdatum
                </label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  className="input-glass w-full"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-brand-text mb-1">
                  Enddatum
                </label>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  className="input-glass w-full"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text mb-1">
                Banner-Typ
              </label>
              <select
                value={form.bannerType}
                onChange={(e) => setForm({ ...form, bannerType: e.target.value })}
                className="input-glass w-full"
              >
                {Object.entries(BANNER_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              {form.bannerType && BANNER_DIMENSIONS[form.bannerType] && (
                <p className="text-xs text-brand-text-muted mt-1">
                  {BANNER_DIMENSIONS[form.bannerType].width} x {BANNER_DIMENSIONS[form.bannerType].height} px
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text mb-1">
                Gewichtung
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={form.weight}
                onChange={(e) => setForm({ ...form, weight: parseInt(e.target.value) || 1 })}
                className="input-glass w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text mb-1">
                Impression-Ziel
              </label>
              <input
                type="number"
                value={form.impressionTarget}
                onChange={(e) => setForm({ ...form, impressionTarget: e.target.value })}
                className="input-glass w-full"
                placeholder="z.B. 10000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text mb-1">
                CPM (€)
              </label>
              <input
                type="number"
                step="0.01"
                value={form.costPerMille}
                onChange={(e) => setForm({ ...form, costPerMille: e.target.value })}
                className="input-glass w-full"
                placeholder="z.B. 5.00"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-brand-text mb-1">
                Inhalt (Markdown)
              </label>
              <textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                className="input-glass w-full h-24 font-mono text-sm"
                placeholder="Anzeigentext..."
              />
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                />
                Aktiv
              </label>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary text-sm disabled:opacity-50"
            >
              {saving ? 'Speichern...' : editingId ? 'Speichern' : 'Erstellen'}
            </button>
            <button
              onClick={closeForm}
              className="px-4 py-2 text-sm rounded-lg bg-brand-bg-dark text-brand-text-muted hover:text-brand-text transition-colors"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {ads.length === 0 ? (
        <div className="glass-card text-center py-12">
          <p className="text-brand-text-muted mb-4">Noch keine Werbeanzeigen.</p>
          <button onClick={openAddForm} className="btn-primary text-sm">
            Erste Anzeige anlegen
          </button>
        </div>
      ) : (
        <div className="grid gap-3">
          {ads.map((ad) => (
            <div
              key={ad.id}
              className={`glass-card ${!ad.isActive ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start gap-4">
                {ad.imageUrl && (
                  <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-brand-bg-dark flex-shrink-0">
                    <Image
                      src={ad.imageUrl}
                      alt={ad.title}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-sm font-semibold text-brand-text">
                      {ad.title}
                    </span>
                    <span
                      className={`px-2 py-0.5 text-xs rounded-full ${
                        ad.isActive
                          ? 'bg-green-100/50 text-green-800'
                          : 'bg-red-100/50 text-red-800'
                      }`}
                    >
                      {ad.isActive ? 'Aktiv' : 'Inaktiv'}
                    </span>
                    <span className="px-2 py-0.5 text-xs rounded-full bg-brand-accent/10 text-brand-accent">
                      {POSITION_LABELS[ad.position] || ad.position}
                    </span>
                    {ad.bannerType && (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-purple-100/50 text-purple-800">
                        {BANNER_TYPE_LABELS[ad.bannerType] || ad.bannerType}
                      </span>
                    )}
                    {ad.weight > 1 && (
                      <span className="text-xs text-brand-text-muted">
                        Gewicht: {ad.weight}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-brand-text-muted mb-1">
                    <span>{ad.vendor.name}</span>
                    {ad.linkUrl && (
                      <a
                        href={ad.linkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-accent hover:underline truncate max-w-[300px]"
                      >
                        {ad.linkUrl}
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-brand-text-muted">
                    <span>{ad.views} Views</span>
                    <span>{ad.clicks} Klicks</span>
                    <span>
                      CTR: {ad.views > 0 ? `${((ad.clicks / ad.views) * 100).toFixed(1)}%` : '--'}
                    </span>
                    {ad.costPerMille && ad.views > 0 && (
                      <span>Umsatz: €{((ad.views / 1000) * ad.costPerMille).toFixed(2)}</span>
                    )}
                    {ad.startDate && (
                      <span>Ab {new Date(ad.startDate).toLocaleDateString('de-DE')}</span>
                    )}
                    {ad.endDate && (
                      <span>Bis {new Date(ad.endDate).toLocaleDateString('de-DE')}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => navigator.clipboard.writeText(`:::banner-${ad.id}:::`)}
                    className="px-2 py-1 text-xs rounded-lg bg-brand-bg-dark hover:bg-brand-bg-dark/80 transition-colors"
                    title="Banner-ID kopieren"
                  >
                    ID
                  </button>
                  <button
                    onClick={() => toggleActive(ad)}
                    className="px-3 py-1.5 text-xs rounded-lg bg-brand-bg-dark hover:bg-brand-bg-dark/80 transition-colors"
                  >
                    {ad.isActive ? 'Deaktivieren' : 'Aktivieren'}
                  </button>
                  <button
                    onClick={() => openEditForm(ad)}
                    className="p-1.5 rounded-lg hover:bg-brand-bg-dark transition-colors"
                    title="Bearbeiten"
                  >
                    <PencilIcon className="w-4 h-4 text-brand-text-muted" />
                  </button>
                  {deleteConfirm === ad.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => deleteAd(ad.id)}
                        disabled={saving}
                        className="p-1.5 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                      >
                        <CheckIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="p-1.5 rounded-lg hover:bg-brand-bg-dark transition-colors"
                      >
                        <XMarkIcon className="w-4 h-4 text-brand-text-muted" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(ad.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                      title="Loschen"
                    >
                      <TrashIcon className="w-4 h-4 text-brand-text-muted hover:text-red-500" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <MediaPickerDialog
        open={showMediaPicker}
        onClose={() => setShowMediaPicker(false)}
        onSelect={(url) => {
          setForm((prev) => ({ ...prev, imageUrl: url }))
          setShowMediaPicker(false)
        }}
      />
    </div>
  )
}
