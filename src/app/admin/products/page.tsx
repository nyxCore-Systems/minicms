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
  TagIcon,
  StarIcon,
  FolderIcon,
} from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'

interface VendorRef {
  id: string
  name: string
  slug: string
  logoUrl: string | null
}

interface CategoryRef {
  id: string
  name: string
  slug: string
}

interface CategoryWithChildren {
  id: string
  name: string
  slug: string
  parentId: string | null
  children: { id: string; name: string; slug: string }[]
}

interface Product {
  id: string
  label: string
  url: string
  image: string | null
  content: string | null
  position: string | null
  tags: string[]
  vendorId: string
  vendor: VendorRef
  categories: CategoryRef[]
  isActive: boolean
  isFeatured: boolean
  createdAt: string
}

interface ProductFormData {
  label: string
  url: string
  image: string
  content: string
  position: string
  tags: string
  vendorId: string
  isActive: boolean
  categoryIds: string[]
}

const EMPTY_FORM: ProductFormData = {
  label: '',
  url: '',
  image: '',
  content: '',
  position: 'top',
  tags: '',
  vendorId: '',
  isActive: true,
  categoryIds: [],
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [vendors, setVendors] = useState<VendorRef[]>([])
  const [allCategories, setAllCategories] = useState<CategoryWithChildren[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const [filterVendor, setFilterVendor] = useState<string>('all')
  const [filterTag, setFilterTag] = useState<string>('all')
  const [filterCategory, setFilterCategory] = useState<string>('all')

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<ProductFormData>({ ...EMPTY_FORM })
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [showMediaPicker, setShowMediaPicker] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const [prodRes, vendorRes, catRes] = await Promise.all([
        fetch('/api/admin/products'),
        fetch('/api/admin/vendors'),
        fetch('/api/admin/categories'),
      ])
      if (!prodRes.ok || !vendorRes.ok || !catRes.ok) throw new Error('Laden fehlgeschlagen')
      const prodData = await prodRes.json()
      const vendorData = await vendorRes.json()
      const catData = await catRes.json()
      setProducts(prodData)
      setVendors(
        vendorData.map((v: { id: string; name: string; slug: string; logoUrl: string | null }) => ({
          id: v.id,
          name: v.name,
          slug: v.slug,
          logoUrl: v.logoUrl,
        }))
      )
      setAllCategories(catData)
    } catch {
      setError('Daten konnten nicht geladen werden')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const allTags = Array.from(new Set(products.flatMap((p) => p.tags))).sort()

  // Flat list of all categories (parents + children) for filter dropdown
  const flatCategories = allCategories.flatMap((c) => [
    { id: c.id, name: c.name },
    ...c.children.map((ch) => ({ id: ch.id, name: `  ${c.name} > ${ch.name}` })),
  ])

  const filtered = products.filter((p) => {
    if (filterVendor !== 'all' && p.vendorId !== filterVendor) return false
    if (filterTag !== 'all' && !p.tags.includes(filterTag)) return false
    if (filterCategory !== 'all' && !p.categories?.some((c) => c.id === filterCategory)) return false
    return true
  })

  function openAddForm() {
    setEditingId(null)
    setForm({ ...EMPTY_FORM, vendorId: vendors[0]?.id || '', categoryIds: [] })
    setShowForm(true)
  }

  function openEditForm(product: Product) {
    setEditingId(product.id)
    setForm({
      label: product.label,
      url: product.url,
      image: product.image || '',
      content: product.content || '',
      position: product.position || 'top',
      tags: product.tags.join(', '),
      vendorId: product.vendorId,
      isActive: product.isActive,
      categoryIds: product.categories?.map((c) => c.id) || [],
    })
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditingId(null)
    setForm({ ...EMPTY_FORM })
  }

  async function handleSave() {
    if (!form.label || !form.url || !form.vendorId) {
      setError('Name, URL und Handler sind Pflichtfelder')
      return
    }
    setSaving(true)
    setError('')
    try {
      const payload = {
        label: form.label,
        url: form.url,
        image: form.image || null,
        content: form.content || null,
        position: form.position || 'top',
        tags: form.tags
          ? form.tags.split(',').map((t) => t.trim()).filter(Boolean)
          : [],
        vendorId: form.vendorId,
        isActive: form.isActive,
        categoryIds: form.categoryIds,
      }

      const res = editingId
        ? await fetch(`/api/admin/products/${editingId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/admin/products', {
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

  async function deleteProduct(id: string) {
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/products/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Fehler beim Loschen')
      setDeleteConfirm(null)
      await fetchData()
    } catch {
      setError('Produkt konnte nicht geloscht werden')
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(product: Product) {
    try {
      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !product.isActive }),
      })
      if (!res.ok) throw new Error('Fehler')
      await fetchData()
    } catch {
      setError('Status konnte nicht geandert werden')
    }
  }

  async function toggleFeatured(product: Product) {
    const prev = products
    setProducts((ps) => ps.map((p) => p.id === product.id ? { ...p, isFeatured: !p.isFeatured } : p))
    try {
      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFeatured: !product.isFeatured }),
      })
      if (!res.ok) throw new Error('Fehler')
    } catch {
      setProducts(prev)
      setError('Featured-Status konnte nicht geandert werden')
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
            Produkte ({products.length})
          </h1>
          <p className="text-sm text-brand-text-muted mt-1">
            Produktkatalog verwalten
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={filterVendor}
            onChange={(e) => setFilterVendor(e.target.value)}
            className="input-glass text-sm py-1.5 px-3"
          >
            <option value="all">Alle Handler</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
          <select
            value={filterTag}
            onChange={(e) => setFilterTag(e.target.value)}
            className="input-glass text-sm py-1.5 px-3"
          >
            <option value="all">Alle Tags</option>
            {allTags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="input-glass text-sm py-1.5 px-3"
          >
            <option value="all">Alle Kategorien</option>
            {flatCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button onClick={openAddForm} className="btn-primary text-sm whitespace-nowrap">
            <PlusIcon className="w-4 h-4 inline mr-1" />
            Neues Produkt
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl mb-4">
          {error}
          <button onClick={() => setError('')} className="ml-2 underline">
            Schliessen
          </button>
        </div>
      )}

      {/* Add/Edit form */}
      {showForm && (
        <div className="glass rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-brand-text mb-4">
            {editingId ? 'Produkt bearbeiten' : 'Neues Produkt'}
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-brand-text mb-1">
                Name *
              </label>
              <input
                type="text"
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                className="input-glass w-full"
                placeholder="z.B. Victorinox Swiss Army Knife"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text mb-1">
                URL (Shoplink) *
              </label>
              <input
                type="url"
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                className="input-glass w-full"
                placeholder="https://shop.example.com/product"
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
                Position
              </label>
              <select
                value={form.position}
                onChange={(e) => setForm({ ...form, position: e.target.value })}
                className="input-glass w-full"
              >
                <option value="top">Top</option>
                <option value="featured">Featured</option>
                <option value="regular">Regular</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text mb-1">
                Bild-URL
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={form.image}
                  onChange={(e) => setForm({ ...form, image: e.target.value })}
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
              {form.image && (
                <div className="mt-2 relative w-20 h-20 rounded-lg overflow-hidden bg-brand-bg-dark">
                  <Image
                    src={form.image}
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
                Tags (kommagetrennt)
              </label>
              <input
                type="text"
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                className="input-glass w-full"
                placeholder="bushmesser, outdoor, jagdmesser"
              />
            </div>
            {allCategories.length > 0 && (
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-brand-text mb-2">
                  Kategorien
                </label>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {allCategories
                    .filter((c) => c.parentId === null)
                    .map((parent) => (
                      <div key={parent.id} className="bg-brand-bg-dark/50 rounded-lg p-3">
                        <label className="flex items-center gap-2 text-sm font-medium text-brand-text mb-1.5">
                          <input
                            type="checkbox"
                            checked={form.categoryIds.includes(parent.id)}
                            onChange={(e) => {
                              setForm((prev) => ({
                                ...prev,
                                categoryIds: e.target.checked
                                  ? [...prev.categoryIds, parent.id]
                                  : prev.categoryIds.filter((id) => id !== parent.id),
                              }))
                            }}
                          />
                          {parent.name}
                        </label>
                        {parent.children.length > 0 && (
                          <div className="ml-5 space-y-1">
                            {parent.children.map((child) => (
                              <label
                                key={child.id}
                                className="flex items-center gap-2 text-xs text-brand-text-muted"
                              >
                                <input
                                  type="checkbox"
                                  checked={form.categoryIds.includes(child.id)}
                                  onChange={(e) => {
                                    setForm((prev) => ({
                                      ...prev,
                                      categoryIds: e.target.checked
                                        ? [...prev.categoryIds, child.id]
                                        : prev.categoryIds.filter((id) => id !== child.id),
                                    }))
                                  }}
                                />
                                {child.name}
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            )}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-brand-text mb-1">
                Beschreibung (Markdown)
              </label>
              <textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                className="input-glass w-full h-24 font-mono text-sm"
                placeholder="Produktbeschreibung..."
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

      {/* Product list */}
      {filtered.length === 0 ? (
        <div className="glass-card text-center py-12">
          <p className="text-brand-text-muted mb-4">
            {products.length === 0
              ? 'Noch keine Produkte vorhanden.'
              : 'Keine Produkte fur diesen Filter.'}
          </p>
          {products.length === 0 && (
            <button onClick={openAddForm} className="btn-primary text-sm">
              Erstes Produkt anlegen
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((product) => (
            <div
              key={product.id}
              className={`glass-card ${!product.isActive ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start gap-4">
                {product.image && (
                  <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-brand-bg-dark flex-shrink-0">
                    <Image
                      src={product.image}
                      alt={product.label}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-brand-text">
                      {product.label}
                    </span>
                    <span
                      className={`px-2 py-0.5 text-xs rounded-full ${
                        product.isActive
                          ? 'bg-green-100/50 text-green-800'
                          : 'bg-red-100/50 text-red-800'
                      }`}
                    >
                      {product.isActive ? 'Aktiv' : 'Inaktiv'}
                    </span>
                    {product.position && product.position !== 'regular' && (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-brand-accent/10 text-brand-accent">
                        {product.position}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-brand-text-muted mb-1">
                    <span>{product.vendor.name}</span>
                    <a
                      href={product.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-accent hover:underline truncate max-w-[300px]"
                    >
                      {product.url}
                    </a>
                  </div>
                  {(product.categories?.length > 0 || product.tags.length > 0) && (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {product.categories?.map((cat) => (
                        <span
                          key={cat.id}
                          className="flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full bg-brand-primary/10 text-brand-primary border border-brand-primary/20"
                        >
                          <FolderIcon className="w-3 h-3" />
                          {cat.name}
                        </span>
                      ))}
                      {product.tags.map((tag) => (
                        <span
                          key={tag}
                          className="flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full bg-brand-bg-dark text-brand-text-muted border border-brand-border"
                        >
                          <TagIcon className="w-3 h-3" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => toggleFeatured(product)}
                    className="p-1.5 rounded-lg hover:bg-amber-50 transition-colors"
                    title={product.isFeatured ? 'Featured entfernen' : 'Als Featured markieren'}
                  >
                    {product.isFeatured ? (
                      <StarIconSolid className="w-4 h-4 text-amber-500" />
                    ) : (
                      <StarIcon className="w-4 h-4 text-brand-text-muted hover:text-amber-400" />
                    )}
                  </button>
                  <button
                    onClick={() => toggleActive(product)}
                    className="px-3 py-1.5 text-xs rounded-lg bg-brand-bg-dark hover:bg-brand-bg-dark/80 transition-colors"
                  >
                    {product.isActive ? 'Deaktivieren' : 'Aktivieren'}
                  </button>
                  <button
                    onClick={() => openEditForm(product)}
                    className="p-1.5 rounded-lg hover:bg-brand-bg-dark transition-colors"
                    title="Bearbeiten"
                  >
                    <PencilIcon className="w-4 h-4 text-brand-text-muted" />
                  </button>
                  {deleteConfirm === product.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => deleteProduct(product.id)}
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
                      onClick={() => setDeleteConfirm(product.id)}
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
          setForm((prev) => ({ ...prev, image: url }))
          setShowMediaPicker(false)
        }}
      />
    </div>
  )
}
