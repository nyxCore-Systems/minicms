'use client'

import { useState } from 'react'
import { XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'

interface PageDeleteDialogProps {
  open: boolean
  onClose: () => void
  onDeleted: () => void
  page: {
    id: string
    title: string
    path: string | null
    menuItems?: { id: string; location: string }[]
  } | null
}

export default function PageDeleteDialog({ open, onClose, onDeleted, page }: PageDeleteDialogProps) {
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  if (!open || !page) return null

  const menuCount = page.menuItems?.length || 0

  async function handleDelete() {
    setDeleting(true)
    setError('')

    try {
      const res = await fetch(`/api/admin/pages/${page!.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Fehler beim Löschen')
      }
      onDeleted()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Löschen')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative glass-strong rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-display font-bold text-brand-text flex items-center gap-2">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
            Seite löschen
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

        <div className="space-y-3 mb-6">
          <p className="text-sm text-brand-text">
            Möchten Sie die Seite <strong>&ldquo;{page.title}&rdquo;</strong> wirklich löschen?
          </p>
          {page.path && (
            <p className="text-xs text-brand-text-muted font-mono bg-brand-bg-dark px-3 py-1.5 rounded-lg">
              {page.path}
            </p>
          )}
          {menuCount > 0 && (
            <p className="text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-lg">
              {menuCount} verknüpfte Menüeinträge werden ebenfalls entfernt.
            </p>
          )}
          <p className="text-xs text-red-600">
            Diese Aktion kann nicht rückgängig gemacht werden.
          </p>
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary text-sm !py-2 !px-4"
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {deleting ? 'Löscht...' : 'Endgültig löschen'}
          </button>
        </div>
      </div>
    </div>
  )
}
