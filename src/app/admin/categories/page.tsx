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
  ChevronUpIcon,
  ChevronDownIcon,
  FolderIcon,
} from '@heroicons/react/24/outline'

interface CategoryChild {
  id: string
  name: string
  slug: string
  description: string | null
  image: string | null
  parentId: string | null
  sortOrder: number
  isActive: boolean
  _count: { products: number }
}

interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  image: string | null
  parentId: string | null
  sortOrder: number
  isActive: boolean
  _count: { products: number }
  children: CategoryChild[]
}

interface FormData {
  name: string
  slug: string
  description: string
  image: string
  parentId: string
  isActive: boolean
}

const EMPTY_FORM: FormData = {
  name: '',
  slug: '',
  description: '',
  image: '',
  parentId: '',
  isActive: true,
}

function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormData>({ ...EMPTY_FORM })
  const [slugManual, setSlugManual] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [showMediaPicker, setShowMediaPicker] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/categories')
      if (!res.ok) throw new Error('Laden fehlgeschlagen')
      const data = await res.json()
      setCategories(data)
    } catch {
      setError('Kategorien konnten nicht geladen werden')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Top-level categories only (for parent dropdown and tree display)
  const topLevel = categories.filter((c) => c.parentId === null)

  function openAddForm(parentId?: string) {
    setEditingId(null)
    setForm({ ...EMPTY_FORM, parentId: parentId || '' })
    setSlugManual(false)
    setShowForm(true)
  }

  function openEditForm(cat: Category | CategoryChild) {
    setEditingId(cat.id)
    setForm({
      name: cat.name,
      slug: cat.slug,
      description: cat.description || '',
      image: cat.image || '',
      parentId: cat.parentId || '',
      isActive: cat.isActive,
    })
    setSlugManual(true)
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditingId(null)
    setForm({ ...EMPTY_FORM })
    setSlugManual(false)
  }

  function handleNameChange(name: string) {
    setForm((prev) => ({
      ...prev,
      name,
      ...(!slugManual ? { slug: nameToSlug(name) } : {}),
    }))
  }

  async function handleSave() {
    if (!form.name || !form.slug) {
      setError('Name und Slug sind Pflichtfelder')
      return
    }
    setSaving(true)
    setError('')
    try {
      const payload = {
        name: form.name,
        slug: form.slug,
        description: form.description || null,
        image: form.image || null,
        parentId: form.parentId || null,
        isActive: form.isActive,
      }

      const res = editingId
        ? await fetch(`/api/admin/categories/${editingId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/admin/categories', {
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

  async function deleteCategory(id: string) {
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/categories/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Fehler beim Löschen')
      setDeleteConfirm(null)
      await fetchData()
    } catch {
      setError('Kategorie konnte nicht gelöscht werden')
    } finally {
      setSaving(false)
    }
  }

  async function reorder(items: (Category | CategoryChild)[], index: number, direction: 'up' | 'down') {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === items.length - 1)
    )
      return

    const swapIndex = direction === 'up' ? index - 1 : index + 1
    const reordered = items.map((item, i) => ({
      id: item.id,
      sortOrder:
        i === index
          ? items[swapIndex].sortOrder
          : i === swapIndex
            ? items[index].sortOrder
            : item.sortOrder,
    }))

    try {
      const res = await fetch('/api/admin/categories/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categories: reordered }),
      })
      if (!res.ok) throw new Error('Fehler beim Sortieren')
      await fetchData()
    } catch {
      setError('Sortierung konnte nicht gespeichert werden')
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
            Kategorien
          </h1>
          <p className="text-sm text-brand-text-muted mt-1">
            Produktkategorien verwalten (max. 2 Ebenen)
          </p>
        </div>
        <button onClick={() => openAddForm()} className="btn-primary text-sm whitespace-nowrap">
          <PlusIcon className="w-4 h-4 inline mr-1" />
          Neue Kategorie
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl mb-4">
          {error}
          <button onClick={() => setError('')} className="ml-2 underline">
            Schließen
          </button>
        </div>
      )}

      {/* Add/Edit form */}
      {showForm && (
        <div className="glass rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-brand-text mb-4">
            {editingId ? 'Kategorie bearbeiten' : 'Neue Kategorie'}
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-brand-text mb-1">
                Name *
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="input-glass w-full"
                placeholder="z.B. Küchenmesser"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text mb-1">
                Slug *
              </label>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => {
                  setSlugManual(true)
                  setForm({ ...form, slug: e.target.value })
                }}
                className="input-glass w-full"
                placeholder="kuechenmesser"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text mb-1">
                Übergeordnete Kategorie
              </label>
              <select
                value={form.parentId}
                onChange={(e) => setForm({ ...form, parentId: e.target.value })}
                className="input-glass w-full"
              >
                <option value="">Keine (Top-Level)</option>
                {topLevel
                  .filter((c) => c.id !== editingId)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
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
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-brand-text mb-1">
                Beschreibung
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="input-glass w-full h-20 text-sm"
                placeholder="Kurzbeschreibung der Kategorie..."
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

      {/* Category tree */}
      {topLevel.length === 0 ? (
        <div className="glass-card text-center py-12">
          <p className="text-brand-text-muted mb-4">
            Noch keine Kategorien vorhanden.
          </p>
          <button onClick={() => openAddForm()} className="btn-primary text-sm">
            Erste Kategorie anlegen
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {topLevel.map((cat, idx) => (
            <div key={cat.id}>
              <CategoryRow
                cat={cat}
                index={idx}
                siblings={topLevel}
                onEdit={() => openEditForm(cat)}
                onDelete={() =>
                  deleteConfirm === cat.id
                    ? deleteCategory(cat.id)
                    : setDeleteConfirm(cat.id)
                }
                onCancelDelete={() => setDeleteConfirm(null)}
                isDeleting={deleteConfirm === cat.id}
                saving={saving}
                onReorder={(dir) => reorder(topLevel, idx, dir)}
                onAddChild={() => openAddForm(cat.id)}
                isParent
              />
              {/* Children */}
              {cat.children.length > 0 && (
                <div className="ml-8 mt-2 space-y-2">
                  {cat.children.map((child, childIdx) => (
                    <CategoryRow
                      key={child.id}
                      cat={child}
                      index={childIdx}
                      siblings={cat.children}
                      onEdit={() => openEditForm(child)}
                      onDelete={() =>
                        deleteConfirm === child.id
                          ? deleteCategory(child.id)
                          : setDeleteConfirm(child.id)
                      }
                      onCancelDelete={() => setDeleteConfirm(null)}
                      isDeleting={deleteConfirm === child.id}
                      saving={saving}
                      onReorder={(dir) => reorder(cat.children, childIdx, dir)}
                      isParent={false}
                    />
                  ))}
                </div>
              )}
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

function CategoryRow({
  cat,
  index,
  siblings,
  onEdit,
  onDelete,
  onCancelDelete,
  isDeleting,
  saving,
  onReorder,
  onAddChild,
  isParent,
}: {
  cat: Category | CategoryChild
  index: number
  siblings: (Category | CategoryChild)[]
  onEdit: () => void
  onDelete: () => void
  onCancelDelete: () => void
  isDeleting: boolean
  saving: boolean
  onReorder: (dir: 'up' | 'down') => void
  onAddChild?: () => void
  isParent: boolean
}) {
  return (
    <div
      className={`glass-card ${!cat.isActive ? 'opacity-60' : ''}`}
    >
      <div className="flex items-center gap-4">
        {cat.image ? (
          <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-brand-bg-dark flex-shrink-0">
            <Image
              src={cat.image}
              alt={cat.name}
              fill
              className="object-cover"
              sizes="48px"
            />
          </div>
        ) : (
          <div className="w-12 h-12 rounded-lg bg-brand-primary/5 flex items-center justify-center flex-shrink-0">
            <FolderIcon className="w-6 h-6 text-brand-primary/30" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-semibold text-brand-text">
              {cat.name}
            </span>
            <span className="px-2 py-0.5 text-[10px] rounded-full bg-brand-accent/10 text-brand-accent font-medium">
              {cat._count.products} {cat._count.products === 1 ? 'Produkt' : 'Produkte'}
            </span>
            {!cat.isActive && (
              <span className="px-2 py-0.5 text-[10px] rounded-full bg-red-100/50 text-red-800">
                Inaktiv
              </span>
            )}
          </div>
          <span className="text-xs text-brand-text-muted">
            /{cat.slug}
          </span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Reorder */}
          <button
            onClick={() => onReorder('up')}
            disabled={index === 0}
            className="p-1.5 rounded-lg hover:bg-brand-bg-dark transition-colors disabled:opacity-30"
            title="Nach oben"
          >
            <ChevronUpIcon className="w-4 h-4 text-brand-text-muted" />
          </button>
          <button
            onClick={() => onReorder('down')}
            disabled={index === siblings.length - 1}
            className="p-1.5 rounded-lg hover:bg-brand-bg-dark transition-colors disabled:opacity-30"
            title="Nach unten"
          >
            <ChevronDownIcon className="w-4 h-4 text-brand-text-muted" />
          </button>
          {/* Add child */}
          {isParent && onAddChild && (
            <button
              onClick={onAddChild}
              className="p-1.5 rounded-lg hover:bg-brand-bg-dark transition-colors"
              title="Unterkategorie hinzufügen"
            >
              <PlusIcon className="w-4 h-4 text-brand-text-muted" />
            </button>
          )}
          {/* Edit */}
          <button
            onClick={onEdit}
            className="p-1.5 rounded-lg hover:bg-brand-bg-dark transition-colors"
            title="Bearbeiten"
          >
            <PencilIcon className="w-4 h-4 text-brand-text-muted" />
          </button>
          {/* Delete */}
          {isDeleting ? (
            <div className="flex items-center gap-1">
              <button
                onClick={onDelete}
                disabled={saving}
                className="p-1.5 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
              >
                <CheckIcon className="w-4 h-4" />
              </button>
              <button
                onClick={onCancelDelete}
                className="p-1.5 rounded-lg hover:bg-brand-bg-dark transition-colors"
              >
                <XMarkIcon className="w-4 h-4 text-brand-text-muted" />
              </button>
            </div>
          ) : (
            <button
              onClick={onDelete}
              className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
              title="Löschen"
            >
              <TrashIcon className="w-4 h-4 text-brand-text-muted hover:text-red-500" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
