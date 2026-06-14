'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { XMarkIcon } from '@heroicons/react/24/outline'

interface ParentOption {
  id: string
  title: string
  path: string | null
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

const PATH_PREFIXES = [
  { label: '/ (Root)', value: '/' },
  { label: '/messerwissen/', value: '/messerwissen/' },
  { label: '/verkaufen/', value: '/verkaufen/' },
]

export default function PageCreateDialog({
  open,
  onClose,
  pages,
}: {
  open: boolean
  onClose: () => void
  pages: ParentOption[]
}) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [slugEdited, setSlugEdited] = useState(false)
  const [prefix, setPrefix] = useState('/')
  const [customPrefix, setCustomPrefix] = useState('')
  const [useCustomPrefix, setUseCustomPrefix] = useState(false)
  const [parentIds, setParentIds] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  if (!open) return null

  const effectivePrefix = useCustomPrefix ? customPrefix : prefix
  const finalPath = effectivePrefix + slug

  function handleTitleChange(val: string) {
    setTitle(val)
    if (!slugEdited) {
      setSlug(slugify(val))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !slug.trim()) return

    setSaving(true)
    setError('')

    try {
      const res = await fetch('/api/admin/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          slug: slug.trim(),
          path: finalPath,
          parentIds: parentIds.length > 0 ? parentIds : undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Fehler beim Erstellen')
      }

      const page = await res.json()
      onClose()
      router.push(`/admin/content/${page.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Erstellen')
    } finally {
      setSaving(false)
    }
  }

  function toggleParent(id: string) {
    setParentIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative glass-strong rounded-2xl p-6 w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-display font-bold text-brand-text">
            Neue Seite erstellen
          </h2>
          <button onClick={onClose} className="text-brand-text-muted hover:text-brand-text">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm px-4 py-2 rounded-lg mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-brand-text-muted mb-1">
              Titel *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="input-glass w-full text-sm"
              placeholder="Seitentitel"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-brand-text-muted mb-1">
              Slug
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) => { setSlug(slugify(e.target.value)); setSlugEdited(true) }}
              className="input-glass w-full text-sm font-mono"
              placeholder="seiten-slug"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-brand-text-muted mb-1">
              URL-Pfad-Prefix
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {PATH_PREFIXES.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => { setPrefix(p.value); setUseCustomPrefix(false) }}
                  className={`px-3 py-1 text-xs rounded-full transition-colors ${
                    !useCustomPrefix && prefix === p.value
                      ? 'bg-brand-accent/10 text-brand-accent font-medium'
                      : 'bg-brand-bg-dark text-brand-text-muted hover:text-brand-text'
                  }`}
                >
                  {p.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setUseCustomPrefix(true)}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  useCustomPrefix
                    ? 'bg-brand-accent/10 text-brand-accent font-medium'
                    : 'bg-brand-bg-dark text-brand-text-muted hover:text-brand-text'
                }`}
              >
                Eigener...
              </button>
            </div>
            {useCustomPrefix && (
              <input
                type="text"
                value={customPrefix}
                onChange={(e) => setCustomPrefix(e.target.value)}
                className="input-glass w-full text-sm font-mono"
                placeholder="/eigener-pfad/"
              />
            )}
            <p className="text-xs text-brand-text-muted mt-1 font-mono">
              {finalPath}
            </p>
          </div>

          {pages.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-brand-text-muted mb-1">
                Übergeordnete Seiten
              </label>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                {pages.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggleParent(p.id)}
                    className={`px-2.5 py-1 text-xs rounded-full transition-colors ${
                      parentIds.includes(p.id)
                        ? 'bg-brand-accent/10 text-brand-accent font-medium'
                        : 'bg-brand-bg-dark text-brand-text-muted hover:text-brand-text'
                    }`}
                  >
                    {p.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary text-sm !py-2 !px-4"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={saving || !title.trim() || !slug.trim()}
              className="btn-primary text-sm !py-2 !px-4"
            >
              {saving ? 'Erstellt...' : 'Erstellen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
