'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  CheckIcon,
  XMarkIcon,
  EyeIcon,
  EyeSlashIcon,
  Bars3Icon,
} from '@heroicons/react/24/outline'

interface MenuItem {
  id: string
  label: string
  href: string
  location: string
  sortOrder: number
  isVisible: boolean
  parentId: string | null
  children: MenuItem[]
}

interface MenuItemFormData {
  label: string
  href: string
  location: string
  parentId: string | null
}

const LOCATIONS = [
  { value: 'header', label: 'Header' },
  { value: 'footer', label: 'Footer' },
] as const

export default function AdminMenuPage() {
  const [allItems, setAllItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<MenuItemFormData>({
    label: '',
    href: '',
    location: 'header',
    parentId: null,
  })

  const [showAddForm, setShowAddForm] = useState(false)
  const [addLocation, setAddLocation] = useState<string>('header')
  const [addForm, setAddForm] = useState<MenuItemFormData>({
    label: '',
    href: '/',
    location: 'header',
    parentId: null,
  })

  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const fetchMenu = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/menu')
      if (!res.ok) throw new Error('Laden fehlgeschlagen')
      const data: MenuItem[] = await res.json()
      setAllItems(data)
    } catch {
      setError('Menüdaten konnten nicht geladen werden')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMenu()
  }, [fetchMenu])

  function getItemsByLocation(location: string): MenuItem[] {
    return allItems
      .filter((item) => !item.parentId && item.location === location)
      .sort((a, b) => a.sortOrder - b.sortOrder)
  }

  function getTopLevelByLocation(location: string): MenuItem[] {
    return allItems
      .filter((item) => !item.parentId && item.location === location)
      .sort((a, b) => a.sortOrder - b.sortOrder)
  }

  async function addMenuItem() {
    if (!addForm.label || !addForm.href) return
    setSaving(true)
    setError('')
    try {
      const siblings = getItemsByLocation(addForm.location)
      const maxOrder = siblings.length > 0
        ? Math.max(...siblings.flatMap((s) => [s.sortOrder, ...s.children.map((c) => c.sortOrder)]))
        : -1

      const res = await fetch('/api/admin/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: addForm.label,
          href: addForm.href,
          location: addForm.location,
          parentId: addForm.parentId || null,
          sortOrder: addOrder(addForm),
        }),
      })
      if (!res.ok) throw new Error('Erstellen fehlgeschlagen')
      setAddForm({ label: '', href: '/', location: addLocation, parentId: null })
      setShowAddForm(false)
      await fetchMenu()
    } catch {
      setError('Menupunkt konnte nicht erstellt werden')
    } finally {
      setSaving(false)
    }
  }

  function addOrder(form: MenuItemFormData): number {
    if (form.parentId) {
      const parent = allItems.find((i) => i.id === form.parentId)
      return parent ? parent.children.length : 0
    }
    return getItemsByLocation(form.location).length
  }

  async function updateMenuItem(id: string) {
    if (!editForm.label || !editForm.href) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/menu/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: editForm.label,
          href: editForm.href,
          parentId: editForm.parentId,
        }),
      })
      if (!res.ok) throw new Error('Aktualisieren fehlgeschlagen')
      setEditingId(null)
      await fetchMenu()
    } catch {
      setError('Menupunkt konnte nicht aktualisiert werden')
    } finally {
      setSaving(false)
    }
  }

  async function deleteMenuItem(id: string) {
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/menu/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Loschen fehlgeschlagen')
      setDeleteConfirm(null)
      await fetchMenu()
    } catch {
      setError('Menupunkt konnte nicht geloscht werden')
    } finally {
      setSaving(false)
    }
  }

  async function toggleVisibility(item: MenuItem) {
    setError('')
    try {
      const res = await fetch(`/api/admin/menu/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isVisible: !item.isVisible }),
      })
      if (!res.ok) throw new Error('Fehler')
      await fetchMenu()
    } catch {
      setError('Sichtbarkeit konnte nicht geandert werden')
    }
  }

  async function moveItem(item: MenuItem, direction: 'up' | 'down', siblings: MenuItem[]) {
    const currentIndex = siblings.findIndex((s) => s.id === item.id)
    const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (swapIndex < 0 || swapIndex >= siblings.length) return

    const swapItem = siblings[swapIndex]
    setError('')
    try {
      await Promise.all([
        fetch(`/api/admin/menu/${item.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sortOrder: swapItem.sortOrder }),
        }),
        fetch(`/api/admin/menu/${swapItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sortOrder: item.sortOrder }),
        }),
      ])
      await fetchMenu()
    } catch {
      setError('Reihenfolge konnte nicht geandert werden')
    }
  }

  function startEdit(item: MenuItem) {
    setEditingId(item.id)
    setEditForm({
      label: item.label,
      href: item.href,
      location: item.location,
      parentId: item.parentId,
    })
  }

  function openAddForm(location: string) {
    setAddLocation(location)
    setAddForm({ label: '', href: '/', location, parentId: null })
    setShowAddForm(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-2 border-brand-accent border-t-transparent rounded-full" />
      </div>
    )
  }

  function renderItemRow(item: MenuItem, siblings: MenuItem[], isChild = false) {
    const index = siblings.findIndex((s) => s.id === item.id)

    if (editingId === item.id) {
      return (
        <div
          key={item.id}
          className={`flex items-center gap-2 py-2 px-3 bg-brand-accent/5 rounded-lg ${isChild ? 'ml-8' : ''}`}
        >
          <input
            type="text"
            value={editForm.label}
            onChange={(e) => setEditForm({ ...editForm, label: e.target.value })}
            className="input-glass text-sm flex-1"
            placeholder="Bezeichnung"
          />
          <input
            type="text"
            value={editForm.href}
            onChange={(e) => setEditForm({ ...editForm, href: e.target.value })}
            className="input-glass text-sm flex-1"
            placeholder="/pfad"
          />
          <button
            onClick={() => updateMenuItem(item.id)}
            disabled={saving}
            className="p-1.5 rounded-lg bg-brand-accent/10 text-brand-accent hover:bg-brand-accent/20 transition-colors"
          >
            <CheckIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => setEditingId(null)}
            className="p-1.5 rounded-lg bg-brand-bg-dark text-brand-text-muted hover:text-brand-text transition-colors"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      )
    }

    return (
      <div key={item.id}>
        <div
          className={`flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-brand-bg-dark transition-colors group ${
            isChild ? 'ml-8' : ''
          }`}
        >
          <div className="flex flex-col gap-0.5 mr-1">
            <button
              onClick={() => moveItem(item, 'up', siblings)}
              disabled={index === 0}
              className="p-0.5 rounded hover:bg-brand-bg-dark disabled:opacity-30 transition-colors"
            >
              <ChevronUpIcon className="w-3 h-3" />
            </button>
            <button
              onClick={() => moveItem(item, 'down', siblings)}
              disabled={index === siblings.length - 1}
              className="p-0.5 rounded hover:bg-brand-bg-dark disabled:opacity-30 transition-colors"
            >
              <ChevronDownIcon className="w-3 h-3" />
            </button>
          </div>

          <Bars3Icon className="w-4 h-4 text-brand-text-muted/40 flex-shrink-0" />

          <span
            className={`text-sm font-medium flex-1 ${
              item.isVisible ? 'text-brand-text' : 'text-brand-text-muted line-through'
            }`}
          >
            {item.label}
          </span>
          <span className="text-xs text-brand-text-muted font-mono">{item.href}</span>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => toggleVisibility(item)}
              className="p-1.5 rounded-lg hover:bg-brand-bg-dark transition-colors"
              title={item.isVisible ? 'Ausblenden' : 'Einblenden'}
            >
              {item.isVisible ? (
                <EyeIcon className="w-4 h-4 text-brand-text-muted" />
              ) : (
                <EyeSlashIcon className="w-4 h-4 text-brand-text-muted" />
              )}
            </button>
            <button
              onClick={() => startEdit(item)}
              className="p-1.5 rounded-lg hover:bg-brand-bg-dark transition-colors"
              title="Bearbeiten"
            >
              <PencilIcon className="w-4 h-4 text-brand-text-muted" />
            </button>
            {deleteConfirm === item.id ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => deleteMenuItem(item.id)}
                  disabled={saving}
                  className="p-1.5 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                  title="Loschen bestatigen"
                >
                  <CheckIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="p-1.5 rounded-lg hover:bg-brand-bg-dark transition-colors"
                  title="Abbrechen"
                >
                  <XMarkIcon className="w-4 h-4 text-brand-text-muted" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setDeleteConfirm(item.id)}
                className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                title="Loschen"
              >
                <TrashIcon className="w-4 h-4 text-brand-text-muted hover:text-red-500" />
              </button>
            )}
          </div>
        </div>

        {item.children && item.children.length > 0 && (
          <div>
            {item.children
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((child) => renderItemRow(child, item.children, true))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-brand-text">
            Navigation
          </h1>
          <p className="text-sm text-brand-text-muted mt-1">
            Header- und Footer-Navigation verwalten
          </p>
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

      {/* Add form */}
      {showAddForm && (
        <div className="glass rounded-2xl p-5 mb-6">
          <h3 className="text-sm font-semibold text-brand-text mb-3">
            Neuer Menupunkt ({addLocation === 'header' ? 'Header' : 'Footer'})
          </h3>
          <div className="grid sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-brand-text-muted mb-1">
                Bezeichnung
              </label>
              <input
                type="text"
                value={addForm.label}
                onChange={(e) => setAddForm({ ...addForm, label: e.target.value })}
                className="input-glass w-full text-sm"
                placeholder="Menupunkt"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-brand-text-muted mb-1">
                Link
              </label>
              <input
                type="text"
                value={addForm.href}
                onChange={(e) => setAddForm({ ...addForm, href: e.target.value })}
                className="input-glass w-full text-sm"
                placeholder="/pfad"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-brand-text-muted mb-1">
                Bereich
              </label>
              <select
                value={addForm.location}
                onChange={(e) => setAddForm({ ...addForm, location: e.target.value })}
                className="input-glass w-full text-sm"
              >
                {LOCATIONS.map((loc) => (
                  <option key={loc.value} value={loc.value}>
                    {loc.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-brand-text-muted mb-1">
                Ubergeordnet
              </label>
              <select
                value={addForm.parentId || ''}
                onChange={(e) =>
                  setAddForm({ ...addForm, parentId: e.target.value || null })
                }
                className="input-glass w-full text-sm"
              >
                <option value="">Hauptmenu (oberste Ebene)</option>
                {getTopLevelByLocation(addForm.location).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={addMenuItem}
              disabled={saving || !addForm.label || !addForm.href}
              className="btn-primary text-xs !py-1.5 !px-4"
            >
              {saving ? 'Erstellen...' : 'Erstellen'}
            </button>
            <button
              onClick={() => {
                setShowAddForm(false)
                setAddForm({ label: '', href: '/', location: 'header', parentId: null })
              }}
              className="px-4 py-1.5 text-xs font-medium rounded-lg bg-brand-bg-dark text-brand-text-muted hover:text-brand-text transition-colors"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* Location groups */}
      {LOCATIONS.map((loc) => {
        const items = getItemsByLocation(loc.value)
        return (
          <div key={loc.value} className="glass rounded-2xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-display font-bold text-brand-text">
                  {loc.label}
                </h2>
                <span className="text-xs text-brand-text-muted bg-brand-bg-dark px-2 py-0.5 rounded-full">
                  {items.length} {items.length === 1 ? 'Eintrag' : 'Eintrage'}
                </span>
              </div>
              <button
                onClick={() => openAddForm(loc.value)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-brand-accent/10 text-brand-accent hover:bg-brand-accent/20 transition-colors"
              >
                <PlusIcon className="w-4 h-4" />
                Hinzufugen
              </button>
            </div>

            <div className="space-y-0.5">
              {items.length === 0 ? (
                <p className="text-sm text-brand-text-muted py-6 text-center">
                  Keine Menupunkte im {loc.label}. Erstellen Sie den ersten Eintrag.
                </p>
              ) : (
                items.map((item) => renderItemRow(item, items))
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
