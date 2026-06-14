'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import MediaPickerDialog from '@/components/admin/MediaPickerDialog'

interface VendorDetail {
  street?: string
  city?: string
  zip?: string
  country?: string
  phone2?: string
  fax?: string
  taxId?: string
  commercialReg?: string
  bankName?: string
  iban?: string
  bic?: string
  affiliateModel?: string
  affiliateRate?: number
  contractStart?: string
  contractEnd?: string
  notes?: string
}

interface ClickStat {
  clickType: string
  _count: number
}

interface BannerStat {
  adId: string
  eventType: string
  _count: number
  _min: { createdAt: string }
  _max: { createdAt: string }
}

interface ProductData {
  id: string
  label: string
  image: string | null
  url: string
  tags: string[]
  isActive: boolean
}

interface AdData {
  id: string
  title: string
  bannerType: string | null
  startDate: string | null
  endDate: string | null
  isActive: boolean
  views: number
  clicks: number
  costPerMille: number | null
  width: number | null
  height: number | null
}

interface VendorData {
  id: string
  name: string
  slug: string
  affiliateId: string
  description: string | null
  category: string
  website: string | null
  email: string | null
  phone: string | null
  contactPerson: string | null
  content: string | null
  location: string | null
  since: string | null
  logoUrl: string | null
  imageUrl: string | null
  validUntil: string | null
  isActive: boolean
  isFeatured: boolean
  isPromoted: boolean
  tags: string[]
  images: string[]
  promotedLinks: { label: string; url: string; position: string }[] | null
  detail: VendorDetail | null
  products?: ProductData[]
  ads?: AdData[]
  _count: { ads: number; clicks: number; products?: number }
  clickStats?: ClickStat[]
  bannerStats?: BannerStat[]
}

const TABS = [
  { key: 'general', label: 'Allgemein' },
  { key: 'affiliate', label: 'Affiliate' },
  { key: 'crm', label: 'CRM / Details' },
  { key: 'media', label: 'Medien' },
  { key: 'links', label: 'Links' },
  { key: 'products', label: 'Produkte' },
  { key: 'ads', label: 'Werbung' },
  { key: 'stats', label: 'Statistiken' },
] as const

type TabKey = (typeof TABS)[number]['key']

export default function EditVendorPage() {
  const params = useParams()
  const router = useRouter()
  const vendorId = params.id as string

  const [vendor, setVendor] = useState<VendorData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [tab, setTab] = useState<TabKey>('general')
  const [mediaField, setMediaField] = useState<string | null>(null)

  // Form state
  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    category: 'OTHER',
    website: '',
    email: '',
    phone: '',
    contactPerson: '',
    content: '',
    location: '',
    since: '',
    logoUrl: '',
    imageUrl: '',
    validUntil: '',
    isActive: true,
    isFeatured: false,
    isPromoted: false,
    tags: '',
    images: '',
    promotedLinks: '[]',
  })

  const [detail, setDetail] = useState<VendorDetail>({
    street: '',
    city: '',
    zip: '',
    country: 'Deutschland',
    phone2: '',
    fax: '',
    taxId: '',
    commercialReg: '',
    bankName: '',
    iban: '',
    bic: '',
    affiliateModel: 'cpc',
    affiliateRate: 0,
    contractStart: '',
    contractEnd: '',
    notes: '',
  })

  const fetchVendor = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/vendors/${vendorId}`)
      if (!res.ok) throw new Error('Händler nicht gefunden')
      const data: VendorData = await res.json()
      setVendor(data)
      setForm({
        name: data.name,
        slug: data.slug,
        description: data.description || '',
        category: data.category,
        website: data.website || '',
        email: data.email || '',
        phone: data.phone || '',
        contactPerson: data.contactPerson || '',
        content: data.content || '',
        location: data.location || '',
        since: data.since || '',
        logoUrl: data.logoUrl || '',
        imageUrl: data.imageUrl || '',
        validUntil: data.validUntil ? data.validUntil.substring(0, 10) : '',
        isActive: data.isActive,
        isFeatured: data.isFeatured,
        isPromoted: data.isPromoted,
        tags: data.tags.join(', '),
        images: data.images.join('\n'),
        promotedLinks: JSON.stringify(data.promotedLinks || [], null, 2),
      })
      if (data.detail) {
        setDetail({
          street: data.detail.street || '',
          city: data.detail.city || '',
          zip: data.detail.zip || '',
          country: data.detail.country || 'Deutschland',
          phone2: data.detail.phone2 || '',
          fax: data.detail.fax || '',
          taxId: data.detail.taxId || '',
          commercialReg: data.detail.commercialReg || '',
          bankName: data.detail.bankName || '',
          iban: data.detail.iban || '',
          bic: data.detail.bic || '',
          affiliateModel: data.detail.affiliateModel || 'cpc',
          affiliateRate: data.detail.affiliateRate || 0,
          contractStart: data.detail.contractStart ? String(data.detail.contractStart).substring(0, 10) : '',
          contractEnd: data.detail.contractEnd ? String(data.detail.contractEnd).substring(0, 10) : '',
          notes: data.detail.notes || '',
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden')
    } finally {
      setLoading(false)
    }
  }, [vendorId])

  useEffect(() => {
    fetchVendor()
  }, [fetchVendor])

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      let parsedLinks = null
      try {
        parsedLinks = JSON.parse(form.promotedLinks)
      } catch {
        parsedLinks = null
      }

      const res = await fetch(`/api/admin/vendors/${vendorId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          slug: form.slug,
          description: form.description || null,
          category: form.category,
          website: form.website || null,
          email: form.email || null,
          phone: form.phone || null,
          contactPerson: form.contactPerson || null,
          content: form.content || null,
          location: form.location || null,
          since: form.since || null,
          logoUrl: form.logoUrl || null,
          imageUrl: form.imageUrl || null,
          validUntil: form.validUntil ? new Date(form.validUntil).toISOString() : null,
          isActive: form.isActive,
          isFeatured: form.isFeatured,
          isPromoted: form.isPromoted,
          tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
          images: form.images ? form.images.split('\n').map((s) => s.trim()).filter(Boolean) : [],
          promotedLinks: parsedLinks,
          detail: {
            street: detail.street || null,
            city: detail.city || null,
            zip: detail.zip || null,
            country: detail.country || null,
            phone2: detail.phone2 || null,
            fax: detail.fax || null,
            taxId: detail.taxId || null,
            commercialReg: detail.commercialReg || null,
            bankName: detail.bankName || null,
            iban: detail.iban || null,
            bic: detail.bic || null,
            affiliateModel: detail.affiliateModel || null,
            affiliateRate: detail.affiliateRate ? Number(detail.affiliateRate) : null,
            contractStart: detail.contractStart ? new Date(detail.contractStart).toISOString() : null,
            contractEnd: detail.contractEnd ? new Date(detail.contractEnd).toISOString() : null,
            notes: detail.notes || null,
          },
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Fehler beim Speichern')
      }

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-2 border-brand-accent border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!vendor) {
    return (
      <div className="glass-card text-center py-12">
        <p className="text-red-600">Händler nicht gefunden.</p>
        <Link href="/admin/vendors" className="btn-primary text-sm mt-4 inline-block">
          Zurück zur Liste
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/vendors"
            className="text-brand-text-muted hover:text-brand-text transition-colors"
          >
            &larr; Zurück
          </Link>
          <h1 className="text-2xl font-display font-bold text-brand-text">
            {vendor.name}
          </h1>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary disabled:opacity-50"
        >
          {saving ? 'Speichern...' : 'Speichern'}
        </button>
      </div>

      {error && (
        <div className="glass-card mb-4 !bg-red-50/50 border border-red-200/50">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}
      {success && (
        <div className="glass-card mb-4 !bg-green-50/50 border border-green-200/50">
          <p className="text-green-700 text-sm">Erfolgreich gespeichert.</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 mb-6 p-1 rounded-xl bg-brand-bg-dark">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm rounded-lg transition-colors ${
              tab === t.key
                ? 'bg-brand-surface text-brand-text font-medium shadow-sm'
                : 'text-brand-text-muted hover:text-brand-text hover:bg-brand-bg-dark'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* General Tab */}
      {tab === 'general' && (
        <div className="glass-card">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-brand-text mb-1">Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                className="input-glass w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text mb-1">Slug</label>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))}
                className="input-glass w-full font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text mb-1">Kategorie</label>
              <select
                value={form.category}
                onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
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
                onChange={(e) => setForm((p) => ({ ...p, website: e.target.value }))}
                className="input-glass w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text mb-1">E-Mail</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                className="input-glass w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text mb-1">Telefon</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                className="input-glass w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text mb-1">Kontaktperson</label>
              <input
                type="text"
                value={form.contactPerson}
                onChange={(e) => setForm((p) => ({ ...p, contactPerson: e.target.value }))}
                className="input-glass w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text mb-1">Standort</label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                className="input-glass w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text mb-1">Seit</label>
              <input
                type="text"
                value={form.since}
                onChange={(e) => setForm((p) => ({ ...p, since: e.target.value }))}
                className="input-glass w-full"
                placeholder="z.B. Seit 1924"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text mb-1">Gültig bis</label>
              <input
                type="date"
                value={form.validUntil}
                onChange={(e) => setForm((p) => ({ ...p, validUntil: e.target.value }))}
                className="input-glass w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text mb-1">Tags (kommagetrennt)</label>
              <input
                type="text"
                value={form.tags}
                onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))}
                className="input-glass w-full"
              />
            </div>
            <div className="flex items-center gap-6 pt-6">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
                />
                Aktiv
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isFeatured}
                  onChange={(e) => setForm((p) => ({ ...p, isFeatured: e.target.checked }))}
                />
                Featured
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isPromoted}
                  onChange={(e) => setForm((p) => ({ ...p, isPromoted: e.target.checked }))}
                />
                Promoted
              </label>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-brand-text mb-1">Beschreibung (kurz)</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              className="input-glass w-full h-20"
            />
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-brand-text mb-1">Inhalt / Story (Markdown)</label>
            <textarea
              value={form.content}
              onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
              className="input-glass w-full h-40 font-mono text-sm"
            />
          </div>
        </div>
      )}

      {/* Affiliate Tab */}
      {tab === 'affiliate' && (
        <div className="glass-card">
          <div className="mb-6 p-4 rounded-lg bg-brand-bg-dark">
            <label className="block text-sm font-medium text-brand-text mb-1">Affiliate ID</label>
            <div className="flex items-center gap-2">
              <code className="flex-1 font-mono text-sm bg-brand-bg-dark px-3 py-2 rounded-lg">
                {vendor.affiliateId}
              </code>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(vendor.affiliateId)}
                className="px-3 py-2 text-xs rounded-lg bg-brand-accent/10 text-brand-accent hover:bg-brand-accent/20 transition-colors"
              >
                Kopieren
              </button>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-brand-text mb-1">Affiliate-Modell</label>
              <select
                value={detail.affiliateModel || 'cpc'}
                onChange={(e) => setDetail((p) => ({ ...p, affiliateModel: e.target.value }))}
                className="input-glass w-full"
              >
                <option value="cpc">CPC (Cost per Click)</option>
                <option value="cpa">CPA (Cost per Action)</option>
                <option value="flat">Flat (Festpreis)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text mb-1">Rate (EUR / %)</label>
              <input
                type="number"
                step="0.01"
                value={detail.affiliateRate || 0}
                onChange={(e) => setDetail((p) => ({ ...p, affiliateRate: parseFloat(e.target.value) || 0 }))}
                className="input-glass w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text mb-1">Vertragsbeginn</label>
              <input
                type="date"
                value={detail.contractStart || ''}
                onChange={(e) => setDetail((p) => ({ ...p, contractStart: e.target.value }))}
                className="input-glass w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text mb-1">Vertragsende</label>
              <input
                type="date"
                value={detail.contractEnd || ''}
                onChange={(e) => setDetail((p) => ({ ...p, contractEnd: e.target.value }))}
                className="input-glass w-full"
              />
            </div>
          </div>
        </div>
      )}

      {/* CRM / Details Tab */}
      {tab === 'crm' && (
        <div className="glass-card">
          <h2 className="text-lg font-semibold text-brand-text mb-4">Adresse</h2>
          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-brand-text mb-1">Straße</label>
              <input
                type="text"
                value={detail.street || ''}
                onChange={(e) => setDetail((p) => ({ ...p, street: e.target.value }))}
                className="input-glass w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text mb-1">PLZ</label>
              <input
                type="text"
                value={detail.zip || ''}
                onChange={(e) => setDetail((p) => ({ ...p, zip: e.target.value }))}
                className="input-glass w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text mb-1">Stadt</label>
              <input
                type="text"
                value={detail.city || ''}
                onChange={(e) => setDetail((p) => ({ ...p, city: e.target.value }))}
                className="input-glass w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text mb-1">Land</label>
              <input
                type="text"
                value={detail.country || ''}
                onChange={(e) => setDetail((p) => ({ ...p, country: e.target.value }))}
                className="input-glass w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text mb-1">Telefon 2</label>
              <input
                type="tel"
                value={detail.phone2 || ''}
                onChange={(e) => setDetail((p) => ({ ...p, phone2: e.target.value }))}
                className="input-glass w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text mb-1">Fax</label>
              <input
                type="tel"
                value={detail.fax || ''}
                onChange={(e) => setDetail((p) => ({ ...p, fax: e.target.value }))}
                className="input-glass w-full"
              />
            </div>
          </div>

          <h2 className="text-lg font-semibold text-brand-text mb-4">Geschäftsdaten</h2>
          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-brand-text mb-1">USt-IdNr</label>
              <input
                type="text"
                value={detail.taxId || ''}
                onChange={(e) => setDetail((p) => ({ ...p, taxId: e.target.value }))}
                className="input-glass w-full"
                placeholder="DE123456789"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text mb-1">Handelsregister</label>
              <input
                type="text"
                value={detail.commercialReg || ''}
                onChange={(e) => setDetail((p) => ({ ...p, commercialReg: e.target.value }))}
                className="input-glass w-full"
                placeholder="HRB 12345"
              />
            </div>
          </div>

          <h2 className="text-lg font-semibold text-brand-text mb-4">Bankverbindung</h2>
          <div className="grid sm:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-brand-text mb-1">Bank</label>
              <input
                type="text"
                value={detail.bankName || ''}
                onChange={(e) => setDetail((p) => ({ ...p, bankName: e.target.value }))}
                className="input-glass w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text mb-1">IBAN</label>
              <input
                type="text"
                value={detail.iban || ''}
                onChange={(e) => setDetail((p) => ({ ...p, iban: e.target.value }))}
                className="input-glass w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text mb-1">BIC</label>
              <input
                type="text"
                value={detail.bic || ''}
                onChange={(e) => setDetail((p) => ({ ...p, bic: e.target.value }))}
                className="input-glass w-full"
              />
            </div>
          </div>

          <h2 className="text-lg font-semibold text-brand-text mb-4">Interne Notizen</h2>
          <textarea
            value={detail.notes || ''}
            onChange={(e) => setDetail((p) => ({ ...p, notes: e.target.value }))}
            className="input-glass w-full h-32"
            placeholder="Interne Notizen zum Händler..."
          />
        </div>
      )}

      {/* Media Tab */}
      {tab === 'media' && (
        <div className="glass-card">
          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-brand-text mb-1">Logo URL</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={form.logoUrl}
                  onChange={(e) => setForm((p) => ({ ...p, logoUrl: e.target.value }))}
                  className="input-glass flex-1"
                />
                <button
                  type="button"
                  onClick={() => setMediaField('logoUrl')}
                  className="px-3 py-1.5 text-xs rounded-lg bg-brand-accent/10 text-brand-accent hover:bg-brand-accent/20 transition-colors"
                >
                  Medien
                </button>
              </div>
              {form.logoUrl && (
                <img src={form.logoUrl} alt="Logo" className="mt-2 h-16 object-contain rounded" />
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text mb-1">Hauptbild URL</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={form.imageUrl}
                  onChange={(e) => setForm((p) => ({ ...p, imageUrl: e.target.value }))}
                  className="input-glass flex-1"
                />
                <button
                  type="button"
                  onClick={() => setMediaField('imageUrl')}
                  className="px-3 py-1.5 text-xs rounded-lg bg-brand-accent/10 text-brand-accent hover:bg-brand-accent/20 transition-colors"
                >
                  Medien
                </button>
              </div>
              {form.imageUrl && (
                <img src={form.imageUrl} alt="Hauptbild" className="mt-2 h-32 object-cover rounded" />
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text mb-1">
              Weitere Bilder (eine URL pro Zeile)
            </label>
            <textarea
              value={form.images}
              onChange={(e) => setForm((p) => ({ ...p, images: e.target.value }))}
              className="input-glass w-full h-32 font-mono text-sm"
              placeholder="https://example.com/image1.jpg&#10;https://example.com/image2.jpg"
            />
          </div>
        </div>
      )}

      {/* Links Tab */}
      {tab === 'links' && (
        <div className="glass-card">
          <h2 className="text-lg font-semibold text-brand-text mb-4">Promoted Links</h2>
          <p className="text-sm text-brand-text-muted mb-4">
            JSON-Array mit Links: {`[{ "label": "Shop", "url": "https://...", "position": "top" }]`}
          </p>
          <textarea
            value={form.promotedLinks}
            onChange={(e) => setForm((p) => ({ ...p, promotedLinks: e.target.value }))}
            className="input-glass w-full h-48 font-mono text-sm"
          />
        </div>
      )}

      {/* Products Tab */}
      {tab === 'products' && (
        <div className="glass-card">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="p-4 rounded-lg bg-brand-bg-dark text-center">
              <p className="text-3xl font-bold text-brand-text">{vendor._count.products ?? 0}</p>
              <p className="text-sm text-brand-text-muted">Produkte gesamt</p>
            </div>
          </div>

          {vendor.products && vendor.products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {vendor.products.map((product) => (
                <div key={product.id} className="p-4 rounded-lg bg-brand-bg-dark flex flex-col gap-3">
                  {product.image && (
                    <img
                      src={product.image}
                      alt={product.label}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                  )}
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-brand-text">{product.label}</h3>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${
                        product.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      {product.isActive ? 'Aktiv' : 'Inaktiv'}
                    </span>
                  </div>
                  {product.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {product.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-brand-accent/10 text-brand-accent">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <a
                    href={product.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-brand-accent hover:underline truncate"
                  >
                    {product.url}
                  </a>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-brand-text-muted">Keine Produkte vorhanden.</p>
          )}
        </div>
      )}

      {/* Ads Tab */}
      {tab === 'ads' && (() => {
        const ads = vendor.ads || []
        const totalViews = ads.reduce((s, a) => s + a.views, 0)
        const totalClicks = ads.reduce((s, a) => s + a.clicks, 0)
        const totalCtr = totalViews > 0 ? ((totalClicks / totalViews) * 100) : 0
        const totalRevenue = ads.reduce((s, a) => s + (a.views / 1000) * (a.costPerMille || 0), 0)

        return (
          <div className="glass-card">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
              <div className="p-4 rounded-lg bg-brand-bg-dark text-center">
                <p className="text-3xl font-bold text-brand-text">{ads.length}</p>
                <p className="text-sm text-brand-text-muted">Anzeigen</p>
              </div>
              <div className="p-4 rounded-lg bg-brand-bg-dark text-center">
                <p className="text-3xl font-bold text-brand-text">{totalViews.toLocaleString('de-DE')}</p>
                <p className="text-sm text-brand-text-muted">Views</p>
              </div>
              <div className="p-4 rounded-lg bg-brand-bg-dark text-center">
                <p className="text-3xl font-bold text-brand-text">{totalClicks.toLocaleString('de-DE')}</p>
                <p className="text-sm text-brand-text-muted">Klicks</p>
              </div>
              <div className="p-4 rounded-lg bg-brand-bg-dark text-center">
                <p className="text-3xl font-bold text-brand-text">{totalCtr.toFixed(2)}%</p>
                <p className="text-sm text-brand-text-muted">CTR</p>
              </div>
              <div className="p-4 rounded-lg bg-brand-bg-dark text-center">
                <p className="text-3xl font-bold text-brand-text">{totalRevenue.toFixed(2)} &euro;</p>
                <p className="text-sm text-brand-text-muted">Umsatz (est.)</p>
              </div>
            </div>

            {ads.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {ads.map((ad) => {
                  const ctr = ad.views > 0 ? ((ad.clicks / ad.views) * 100) : 0
                  const revenue = (ad.views / 1000) * (ad.costPerMille || 0)
                  return (
                    <div key={ad.id} className="p-4 rounded-lg bg-brand-bg-dark flex flex-col gap-2">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-semibold text-brand-text">{ad.title}</h3>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${
                            ad.isActive
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-200 text-gray-500'
                          }`}
                        >
                          {ad.isActive ? 'Aktiv' : 'Inaktiv'}
                        </span>
                      </div>
                      {ad.bannerType && (
                        <p className="text-xs text-brand-text-muted">{ad.bannerType}</p>
                      )}
                      {(ad.startDate || ad.endDate) && (
                        <p className="text-xs text-brand-text-muted">
                          {ad.startDate ? new Date(ad.startDate).toLocaleDateString('de-DE') : '...'} — {ad.endDate ? new Date(ad.endDate).toLocaleDateString('de-DE') : '...'}
                        </p>
                      )}
                      <div className="grid grid-cols-3 gap-2 mt-2 text-center">
                        <div>
                          <p className="text-sm font-semibold text-brand-text">{ad.views.toLocaleString('de-DE')}</p>
                          <p className="text-xs text-brand-text-muted">Views</p>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-brand-text">{ad.clicks.toLocaleString('de-DE')}</p>
                          <p className="text-xs text-brand-text-muted">Klicks</p>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-brand-text">{ctr.toFixed(2)}%</p>
                          <p className="text-xs text-brand-text-muted">CTR</p>
                        </div>
                      </div>
                      {ad.costPerMille != null && (
                        <p className="text-xs text-brand-text-muted mt-1">
                          CPM: {ad.costPerMille.toFixed(2)} &euro; | Umsatz: {revenue.toFixed(2)} &euro;
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-brand-text-muted">Keine Anzeigen vorhanden.</p>
            )}
          </div>
        )
      })()}

      {/* Stats Tab */}
      {tab === 'stats' && (() => {
        const ads = vendor.ads || []
        const bStats = vendor.bannerStats || []

        // Build per-ad impression/click map from BannerImpression data
        const adImprMap: Record<string, { views: number; clicks: number; minDate: string | null; maxDate: string | null }> = {}
        for (const s of bStats) {
          if (!adImprMap[s.adId]) adImprMap[s.adId] = { views: 0, clicks: 0, minDate: null, maxDate: null }
          const entry = adImprMap[s.adId]
          if (s.eventType === 'view') entry.views += s._count
          else if (s.eventType === 'click') entry.clicks += s._count
          if (!entry.minDate || s._min.createdAt < entry.minDate) entry.minDate = s._min.createdAt
          if (!entry.maxDate || s._max.createdAt > entry.maxDate) entry.maxDate = s._max.createdAt
        }

        const totalImprViews = Object.values(adImprMap).reduce((s, a) => s + a.views, 0)
        const totalImprClicks = Object.values(adImprMap).reduce((s, a) => s + a.clicks, 0)
        const overallCtr = totalImprViews > 0 ? ((totalImprClicks / totalImprViews) * 100) : 0
        const totalRevenue = ads.reduce((s, a) => s + (a.views / 1000) * (a.costPerMille || 0), 0)

        return (
          <div className="space-y-6">
            {/* Banner Performance Summary */}
            <div className="glass-card">
              <h2 className="text-lg font-semibold text-brand-text mb-4">Banner-Performance</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <div className="p-4 rounded-lg bg-brand-bg-dark text-center">
                  <p className="text-3xl font-bold text-brand-text">{totalImprViews.toLocaleString('de-DE')}</p>
                  <p className="text-sm text-brand-text-muted">Impressionen</p>
                </div>
                <div className="p-4 rounded-lg bg-brand-bg-dark text-center">
                  <p className="text-3xl font-bold text-brand-text">{totalImprClicks.toLocaleString('de-DE')}</p>
                  <p className="text-sm text-brand-text-muted">Klicks</p>
                </div>
                <div className="p-4 rounded-lg bg-brand-bg-dark text-center">
                  <p className="text-3xl font-bold text-brand-text">{overallCtr.toFixed(2)}%</p>
                  <p className="text-sm text-brand-text-muted">CTR</p>
                </div>
                <div className="p-4 rounded-lg bg-brand-bg-dark text-center">
                  <p className="text-3xl font-bold text-brand-text">{totalRevenue.toFixed(2)} &euro;</p>
                  <p className="text-sm text-brand-text-muted">Umsatz (est.)</p>
                </div>
              </div>

              {/* Per-ad breakdown table */}
              {ads.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-brand-border text-left text-xs text-brand-text-muted uppercase tracking-wider">
                        <th className="pb-2 pr-4">Banner</th>
                        <th className="pb-2 pr-4 text-right">Views</th>
                        <th className="pb-2 pr-4 text-right">Klicks</th>
                        <th className="pb-2 pr-4 text-right">CTR</th>
                        <th className="pb-2 pr-4 text-right">CPM</th>
                        <th className="pb-2 pr-4 text-right">Umsatz</th>
                        <th className="pb-2 text-right">Zeitraum</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border">
                      {ads.map((ad) => {
                        const impr = adImprMap[ad.id] || { views: 0, clicks: 0, minDate: null, maxDate: null }
                        const adCtr = impr.views > 0 ? ((impr.clicks / impr.views) * 100) : 0
                        const adRevenue = (ad.views / 1000) * (ad.costPerMille || 0)
                        return (
                          <tr key={ad.id} className="hover:bg-brand-bg-dark">
                            <td className="py-2 pr-4">
                              <div className="flex items-center gap-2">
                                <span className="text-brand-text font-medium">{ad.title}</span>
                                <span className={`text-xs px-1.5 py-0.5 rounded-full ${ad.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>
                                  {ad.isActive ? 'Aktiv' : 'Inaktiv'}
                                </span>
                              </div>
                              {ad.bannerType && <p className="text-xs text-brand-text-muted">{ad.bannerType}</p>}
                            </td>
                            <td className="py-2 pr-4 text-right text-brand-text">{impr.views.toLocaleString('de-DE')}</td>
                            <td className="py-2 pr-4 text-right text-brand-text">{impr.clicks.toLocaleString('de-DE')}</td>
                            <td className="py-2 pr-4 text-right text-brand-text">{adCtr.toFixed(2)}%</td>
                            <td className="py-2 pr-4 text-right text-brand-text-muted">
                              {ad.costPerMille != null ? `${ad.costPerMille.toFixed(2)} \u20AC` : '--'}
                            </td>
                            <td className="py-2 pr-4 text-right font-medium text-brand-text">{adRevenue.toFixed(2)} &euro;</td>
                            <td className="py-2 text-right text-xs text-brand-text-muted whitespace-nowrap">
                              {impr.minDate
                                ? `${new Date(impr.minDate).toLocaleDateString('de-DE')} \u2013 ${new Date(impr.maxDate!).toLocaleDateString('de-DE')}`
                                : '--'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-brand-text-muted">Keine Anzeigen vorhanden.</p>
              )}
            </div>

            {/* Legacy click stats */}
            <div className="glass-card">
              <h2 className="text-lg font-semibold text-brand-text mb-4">Affiliate-Klicks</h2>
              <div className="grid sm:grid-cols-3 gap-4 mb-6">
                <div className="p-4 rounded-lg bg-brand-bg-dark text-center">
                  <p className="text-3xl font-bold text-brand-text">{vendor._count.clicks}</p>
                  <p className="text-sm text-brand-text-muted">Klicks gesamt</p>
                </div>
                <div className="p-4 rounded-lg bg-brand-bg-dark text-center">
                  <p className="text-3xl font-bold text-brand-text">{vendor._count.ads}</p>
                  <p className="text-sm text-brand-text-muted">Anzeigen</p>
                </div>
                <div className="p-4 rounded-lg bg-brand-bg-dark text-center">
                  <p className="text-3xl font-bold text-brand-text">
                    {vendor.isActive ? 'Aktiv' : 'Inaktiv'}
                  </p>
                  <p className="text-sm text-brand-text-muted">Status</p>
                </div>
              </div>

              {vendor.clickStats && vendor.clickStats.length > 0 ? (
                <div>
                  <h3 className="text-sm font-semibold text-brand-text mb-3">Klicks nach Typ</h3>
                  <div className="grid gap-2">
                    {vendor.clickStats.map((stat) => (
                      <div
                        key={stat.clickType}
                        className="flex items-center justify-between p-3 rounded-lg bg-brand-bg-dark"
                      >
                        <span className="text-sm text-brand-text">{stat.clickType}</span>
                        <span className="text-sm font-semibold text-brand-text">{stat._count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-brand-text-muted">
                  Noch keine Klick-Daten vorhanden.
                </p>
              )}
            </div>
          </div>
        )
      })()}

      <MediaPickerDialog
        open={mediaField !== null}
        onClose={() => setMediaField(null)}
        onSelect={(url) => {
          if (mediaField) {
            setForm((p) => ({ ...p, [mediaField]: url }))
          }
          setMediaField(null)
        }}
      />
    </div>
  )
}
