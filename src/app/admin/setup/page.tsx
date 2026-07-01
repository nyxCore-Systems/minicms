'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import MediaPickerDialog from '@/components/admin/MediaPickerDialog'
import { themes, type ThemePreset } from '@/lib/themes'
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
} from '@heroicons/react/24/outline'

interface SiteSettings {
  id: string
  siteName: string
  logoUrl: string | null
  backgroundImage: string | null
  darkMode: boolean
  themeSlug: string
  hasOpenaiApiKey: boolean
  openaiModel: string
  maintenanceMode: boolean
}

interface MenuItem {
  id: string
  label: string
  href: string
  sortOrder: number
  isVisible: boolean
  parentId: string | null
  children: MenuItem[]
}

interface MenuItemFormData {
  label: string
  href: string
  parentId: string | null
}

export default function SetupPage() {
  const [settings, setSettings] = useState<SiteSettings | null>(null)
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [showLogoPicker, setShowLogoPicker] = useState(false)
  const [showBgPicker, setShowBgPicker] = useState(false)

  // Menu editor state
  const [editingItem, setEditingItem] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<MenuItemFormData>({ label: '', href: '', parentId: null })
  const [showAddForm, setShowAddForm] = useState(false)
  const [addForm, setAddForm] = useState<MenuItemFormData>({ label: '', href: '/', parentId: null })
  const [menuSaving, setMenuSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  // Site settings local state
  const [siteName, setSiteName] = useState('')
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null)
  const [darkMode, setDarkMode] = useState(false)
  const [themeSlug, setThemeSlug] = useState('messer')
  const [logoMode, setLogoMode] = useState('auto')
  const [openaiApiKey, setOpenaiApiKey] = useState('')
  const [hasOpenaiApiKey, setHasOpenaiApiKey] = useState(false)
  const [openaiModel, setOpenaiModel] = useState('auto')
  const [showApiKey, setShowApiKey] = useState(false)
  const [maintenanceMode, setMaintenanceMode] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const [settingsRes, menuRes] = await Promise.all([
        fetch('/api/admin/settings'),
        fetch('/api/admin/menu'),
      ])
      if (!settingsRes.ok || !menuRes.ok) throw new Error('Laden fehlgeschlagen')

      const settingsData = await settingsRes.json()
      const menuData: MenuItem[] = await menuRes.json()

      setSettings(settingsData)
      setSiteName(settingsData.siteName)
      setLogoUrl(settingsData.logoUrl)
      setBackgroundImage(settingsData.backgroundImage)
      setDarkMode(settingsData.darkMode)
      setThemeSlug(settingsData.themeSlug ?? 'messer')
      setLogoMode(settingsData.logoMode ?? 'auto')
      setHasOpenaiApiKey(settingsData.hasOpenaiApiKey ?? false)
      setOpenaiModel(settingsData.openaiModel ?? 'auto')
      setMaintenanceMode(settingsData.maintenanceMode ?? false)

      // Separate top-level items (with children already included from API)
      const topLevel = menuData.filter((item) => !item.parentId)
      setMenuItems(topLevel)
    } catch {
      setError('Daten konnten nicht geladen werden')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const saveSettings = async () => {
    setSaving(true)
    setSaved(false)
    setError('')
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteName, logoUrl, backgroundImage, darkMode, themeSlug, logoMode, openaiModel, maintenanceMode,
          ...(openaiApiKey ? { openaiApiKey } : {}),
        }),
      })
      if (!res.ok) throw new Error('Speichern fehlgeschlagen')
      const updated = await res.json()
      setSettings(updated)
      setHasOpenaiApiKey(updated.hasOpenaiApiKey ?? false)
      setOpenaiApiKey('')  // Clear after save
      setShowApiKey(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setError('Einstellungen konnten nicht gespeichert werden')
    } finally {
      setSaving(false)
    }
  }

  const addMenuItem = async () => {
    if (!addForm.label || !addForm.href) return
    setMenuSaving(true)
    try {
      const res = await fetch('/api/admin/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: addForm.label,
          href: addForm.href,
          parentId: addForm.parentId || null,
          sortOrder: addForm.parentId
            ? (menuItems.find((i) => i.id === addForm.parentId)?.children.length ?? 0)
            : menuItems.length,
        }),
      })
      if (!res.ok) throw new Error('Erstellen fehlgeschlagen')
      setAddForm({ label: '', href: '/', parentId: null })
      setShowAddForm(false)
      await fetchData()
    } catch {
      setError('Menüpunkt konnte nicht erstellt werden')
    } finally {
      setMenuSaving(false)
    }
  }

  const updateMenuItem = async (id: string) => {
    if (!editForm.label || !editForm.href) return
    setMenuSaving(true)
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
      setEditingItem(null)
      await fetchData()
    } catch {
      setError('Menüpunkt konnte nicht aktualisiert werden')
    } finally {
      setMenuSaving(false)
    }
  }

  const deleteMenuItem = async (id: string) => {
    setMenuSaving(true)
    try {
      const res = await fetch(`/api/admin/menu/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Löschen fehlgeschlagen')
      setDeleteConfirm(null)
      await fetchData()
    } catch {
      setError('Menüpunkt konnte nicht gelöscht werden')
    } finally {
      setMenuSaving(false)
    }
  }

  const toggleVisibility = async (item: MenuItem) => {
    try {
      const res = await fetch(`/api/admin/menu/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isVisible: !item.isVisible }),
      })
      if (!res.ok) throw new Error('Aktualisieren fehlgeschlagen')
      await fetchData()
    } catch {
      setError('Sichtbarkeit konnte nicht geändert werden')
    }
  }

  const moveItem = async (item: MenuItem, direction: 'up' | 'down', siblings: MenuItem[]) => {
    const currentIndex = siblings.findIndex((s) => s.id === item.id)
    const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (swapIndex < 0 || swapIndex >= siblings.length) return

    const swapItem = siblings[swapIndex]
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
      await fetchData()
    } catch {
      setError('Reihenfolge konnte nicht geändert werden')
    }
  }

  const startEdit = (item: MenuItem) => {
    setEditingItem(item.id)
    setEditForm({ label: item.label, href: item.href, parentId: item.parentId })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-2 border-brand-accent border-t-transparent rounded-full" />
      </div>
    )
  }

  const renderMenuItemRow = (item: MenuItem, siblings: MenuItem[], isChild = false) => {
    const index = siblings.findIndex((s) => s.id === item.id)

    if (editingItem === item.id) {
      return (
        <div key={item.id} className={`flex items-center gap-2 py-2 px-3 bg-brand-accent/5 rounded-lg ${isChild ? 'ml-8' : ''}`}>
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
            disabled={menuSaving}
            className="p-1.5 rounded-lg bg-brand-accent/10 text-brand-accent hover:bg-brand-accent/20 transition-colors"
          >
            <CheckIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => setEditingItem(null)}
            className="p-1.5 rounded-lg bg-brand-bg-dark text-brand-text-muted hover:text-brand-text transition-colors"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      )
    }

    return (
      <div key={item.id}>
        <div className={`flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-brand-bg-dark transition-colors group ${isChild ? 'ml-8' : ''}`}>
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

          <span className={`text-sm font-medium flex-1 ${item.isVisible ? 'text-brand-text' : 'text-brand-text-muted line-through'}`}>
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
                  disabled={menuSaving}
                  className="p-1.5 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                  title="Löschen bestätigen"
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
                title="Löschen"
              >
                <TrashIcon className="w-4 h-4 text-brand-text-muted hover:text-red-500" />
              </button>
            )}
          </div>
        </div>

        {/* Render children */}
        {item.children && item.children.length > 0 && (
          <div>
            {item.children.map((child) =>
              renderMenuItemRow(child, item.children, true)
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-brand-text">
          Seiteneinstellungen
        </h1>
        <p className="text-sm text-brand-text-muted mt-1">
          Grundlegende Einstellungen und Navigation verwalten
        </p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">
          {error}
          <button onClick={() => setError('')} className="ml-2 underline">
            Schließen
          </button>
        </div>
      )}

      {/* Site Identity */}
      <div className="glass rounded-2xl p-6">
        <h2 className="text-lg font-display font-bold text-brand-text mb-4">
          Website-Identität
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-brand-text-muted mb-1">
              Seitenname
            </label>
            <input
              type="text"
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              className="input-glass w-full sm:w-96 text-sm"
              placeholder="Das Messer"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-brand-text-muted mb-2">
              Logo
            </label>
            <div className="flex items-center gap-4">
              {logoUrl ? (
                <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-brand-bg-dark flex-shrink-0 border border-brand-border">
                  <Image
                    src={logoUrl}
                    alt="Logo"
                    fill
                    className="object-contain p-2"
                    sizes="80px"
                  />
                </div>
              ) : (
                <div className="w-20 h-20 rounded-xl bg-brand-bg-dark border border-dashed border-brand-border flex items-center justify-center flex-shrink-0">
                  <span className="text-xs text-brand-text-muted">Kein Logo</span>
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => setShowLogoPicker(true)}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-brand-bg-dark text-brand-text-muted hover:text-brand-text transition-colors"
                >
                  {logoUrl ? 'Ändern' : 'Auswählen'}
                </button>
                {logoUrl && (
                  <button
                    onClick={() => setLogoUrl(null)}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-brand-bg-dark text-red-500 hover:text-red-700 transition-colors"
                  >
                    Entfernen
                  </button>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-brand-text-muted mb-2">
              Logo-Modus
            </label>
            <div className="flex gap-4">
              {[
                { value: 'auto', label: 'Automatisch' },
                { value: 'text', label: 'Nur Text' },
                { value: 'image', label: 'Nur Bild' },
              ].map((option) => (
                <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="logoMode"
                    value={option.value}
                    checked={logoMode === option.value}
                    onChange={(e) => setLogoMode(e.target.value)}
                    className="accent-brand-accent"
                  />
                  <span className="text-sm text-brand-text">{option.label}</span>
                </label>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Background Image */}
      <div className="glass rounded-2xl p-6">
        <h2 className="text-lg font-display font-bold text-brand-text mb-1">
          Hintergrundbild
        </h2>
        <p className="text-sm text-brand-text-muted mb-4">
          Wird als dezentes Hintergrundbild auf der Startseite angezeigt
        </p>

        <div className="flex items-start gap-4">
          {backgroundImage ? (
            <div className="relative w-48 aspect-video rounded-xl overflow-hidden bg-brand-bg-dark flex-shrink-0 border border-brand-border">
              <Image
                src={backgroundImage}
                alt="Hintergrundbild"
                fill
                className="object-cover"
                sizes="192px"
              />
            </div>
          ) : (
            <div className="w-48 aspect-video rounded-xl bg-brand-bg-dark border border-dashed border-brand-border flex items-center justify-center flex-shrink-0">
              <span className="text-xs text-brand-text-muted">Kein Bild</span>
            </div>
          )}
          <div className="flex flex-col gap-2">
            <button
              onClick={() => setShowBgPicker(true)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-brand-bg-dark text-brand-text-muted hover:text-brand-text transition-colors"
            >
              {backgroundImage ? 'Ändern' : 'Auswählen'}
            </button>
            {backgroundImage && (
              <button
                onClick={() => setBackgroundImage(null)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-brand-bg-dark text-red-500 hover:text-red-700 transition-colors"
              >
                Entfernen
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Theme Chooser */}
      <div className="glass rounded-2xl p-6">
        <h2 className="text-lg font-display font-bold text-brand-text mb-1">
          Theme
        </h2>
        <p className="text-sm text-brand-text-muted mb-4">
          Wählen Sie ein Design-Theme für Ihre Website
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {Object.values(themes).map((theme: ThemePreset) => {
            const isSelected = themeSlug === theme.slug
            const vars = theme.defaultDarkMode ? theme.dark : theme.light
            const swatches = [
              { label: 'Primary', color: vars['--brand-primary'] },
              { label: 'Accent', color: vars['--brand-accent'] },
              { label: 'Hintergrund', color: vars['--brand-bg'] },
              { label: 'Text', color: vars['--brand-text'] },
              { label: 'Button', color: vars['--btn-primary-from'] },
            ]

            return (
              <button
                key={theme.slug}
                onClick={() => {
                  setThemeSlug(theme.slug)
                  setDarkMode(theme.defaultDarkMode)
                }}
                className={`relative text-left p-4 rounded-xl border-2 transition-all ${
                  isSelected
                    ? 'border-brand-accent bg-brand-accent/5 shadow-md'
                    : 'border-brand-border bg-brand-surface hover:border-brand-primary-light hover:bg-brand-bg-dark'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-brand-accent flex items-center justify-center">
                    <CheckIcon className="w-3 h-3 text-white" />
                  </div>
                )}

                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-bold text-brand-text">{theme.name}</span>
                  {theme.defaultDarkMode && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-800 text-gray-200 font-medium">
                      Dunkel
                    </span>
                  )}
                </div>

                <p className="text-xs text-brand-text-muted mb-3">{theme.description}</p>

                <div className="flex gap-1.5 mb-3">
                  {swatches.map((s) => (
                    <div
                      key={s.label}
                      className="w-6 h-6 rounded-full border border-black/10 shadow-sm"
                      style={{ backgroundColor: s.color }}
                      title={s.label}
                    />
                  ))}
                </div>

                <div className="text-[11px] text-brand-text-muted leading-tight">
                  <span className="font-medium">{theme.fontHeading}</span>
                  {' / '}
                  <span>{theme.fontBody}</span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Maintenance Mode */}
      <div className="glass rounded-2xl p-6">
        <h2 className="text-lg font-display font-bold text-brand-text mb-1">
          Wartungsmodus
        </h2>
        <p className="text-sm text-brand-text-muted mb-4">
          Zeigt Besuchern eine Wartungsseite und blendet die gesamte öffentliche Website aus.
          Eingeloggte Admins sehen die echte Seite weiterhin (Live-Vorschau).
        </p>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={maintenanceMode}
            onChange={(e) => setMaintenanceMode(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-brand-text-muted/40 accent-brand-accent"
          />
          <span className="text-sm">
            <span className="font-medium text-brand-text">Wartungsmodus aktivieren</span>
            <span className="block text-xs text-brand-text-muted mt-0.5">
              {maintenanceMode
                ? 'Aktiv — die öffentliche Seite zeigt aktuell die Wartungsseite.'
                : 'Inaktiv — die Seite ist normal erreichbar.'}
            </span>
          </span>
        </label>
      </div>

      {/* AI / OpenAI Configuration */}
      <div className="glass rounded-2xl p-6">
        <h2 className="text-lg font-display font-bold text-brand-text mb-1">
          KI / OpenAI
        </h2>
        <p className="text-sm text-brand-text-muted mb-4">
          API-Key und Modell für automatische SEO-Texte, FAQ-Generierung und Content-Verbesserung
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-brand-text-muted mb-1">
              OpenAI API Key
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:max-w-md">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={openaiApiKey}
                  onChange={(e) => setOpenaiApiKey(e.target.value)}
                  className="input-glass w-full text-sm font-mono pr-10"
                  placeholder={hasOpenaiApiKey ? '••••••••  (gespeichert, neu eingeben zum Ändern)' : 'sk-...'}
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-brand-bg-dark transition-colors"
                  title={showApiKey ? 'Verbergen' : 'Anzeigen'}
                >
                  {showApiKey ? (
                    <EyeSlashIcon className="w-4 h-4 text-brand-text-muted" />
                  ) : (
                    <EyeIcon className="w-4 h-4 text-brand-text-muted" />
                  )}
                </button>
              </div>
              {hasOpenaiApiKey && (
                <span className="flex items-center gap-1 text-xs text-green-600">
                  <CheckIcon className="w-3.5 h-3.5" />
                  Hinterlegt
                </span>
              )}
            </div>
            <p className="text-[11px] text-brand-text-muted mt-1.5">
              Wird verschlüsselt gespeichert (AES-256-GCM). Nicht im Klartext auslesbar.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-brand-text-muted mb-1">
              Modell
            </label>
            <select
              value={openaiModel}
              onChange={(e) => setOpenaiModel(e.target.value)}
              className="input-glass text-sm w-full sm:max-w-md"
            >
              <option value="auto">Automatisch (schnellstes & bestes für SEO)</option>
              <option value="gpt-4.1-mini">GPT-4.1 Mini — sehr schnell, gut</option>
              <option value="gpt-4o-mini">GPT-4o Mini — schnell, gut</option>
              <option value="gpt-4o">GPT-4o — mittel, sehr gut</option>
              <option value="gpt-4.1">GPT-4.1 — mittel, exzellent</option>
            </select>
          </div>
        </div>
      </div>

      {/* Save Settings */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center gap-3">
          <button
            onClick={saveSettings}
            disabled={saving}
            className="btn-primary text-sm !py-2 !px-5"
          >
            {saving ? 'Speichern...' : saved ? 'Gespeichert!' : 'Einstellungen speichern'}
          </button>
          {saved && (
            <span className="text-sm text-brand-accent">Erfolgreich gespeichert</span>
          )}
        </div>
      </div>

      {/* Menu Editor */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-display font-bold text-brand-text">
            Navigation
          </h2>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-brand-accent/10 text-brand-accent hover:bg-brand-accent/20 transition-colors"
          >
            <PlusIcon className="w-4 h-4" />
            Menüpunkt hinzufügen
          </button>
        </div>

        {/* Add form */}
        {showAddForm && (
          <div className="mb-4 p-4 bg-brand-accent/5 rounded-xl space-y-3">
            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-brand-text-muted mb-1">
                  Bezeichnung
                </label>
                <input
                  type="text"
                  value={addForm.label}
                  onChange={(e) => setAddForm({ ...addForm, label: e.target.value })}
                  className="input-glass w-full text-sm"
                  placeholder="Menüpunkt"
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
                  Übergeordnet
                </label>
                <select
                  value={addForm.parentId || ''}
                  onChange={(e) => setAddForm({ ...addForm, parentId: e.target.value || null })}
                  className="input-glass w-full text-sm"
                >
                  <option value="">Hauptmenü (oberste Ebene)</option>
                  {menuItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={addMenuItem}
                disabled={menuSaving || !addForm.label || !addForm.href}
                className="btn-primary text-xs !py-1.5 !px-4"
              >
                {menuSaving ? 'Erstellen...' : 'Erstellen'}
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false)
                  setAddForm({ label: '', href: '/', parentId: null })
                }}
                className="px-4 py-1.5 text-xs font-medium rounded-lg bg-brand-bg-dark text-brand-text-muted hover:text-brand-text transition-colors"
              >
                Abbrechen
              </button>
            </div>
          </div>
        )}

        {/* Menu items list */}
        <div className="space-y-0.5">
          {menuItems.length === 0 ? (
            <p className="text-sm text-brand-text-muted py-8 text-center">
              Keine Menüpunkte vorhanden. Erstellen Sie den ersten Menüpunkt.
            </p>
          ) : (
            menuItems.map((item) => renderMenuItemRow(item, menuItems))
          )}
        </div>
      </div>

      <MediaPickerDialog
        open={showLogoPicker}
        onClose={() => setShowLogoPicker(false)}
        onSelect={(url) => {
          setLogoUrl(url)
          setShowLogoPicker(false)
        }}
      />

      <MediaPickerDialog
        open={showBgPicker}
        onClose={() => setShowBgPicker(false)}
        onSelect={(url) => {
          setBackgroundImage(url)
          setShowBgPicker(false)
        }}
      />
    </div>
  )
}
