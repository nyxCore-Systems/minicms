'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { XMarkIcon, MagnifyingGlassIcon, PhotoIcon, VideoCameraIcon } from '@heroicons/react/24/outline'

interface MediaItem {
  id: string
  type: 'IMAGE' | 'VIDEO'
  filename: string
  url: string
  width: number | null
  height: number | null
}

interface MediaPickerDialogProps {
  open: boolean
  onClose: () => void
  onSelect: (url: string, filename: string) => void
}

export default function MediaPickerDialog({ open, onClose, onSelect }: MediaPickerDialogProps) {
  const [media, setMedia] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!open) return
    setLoading(true)
    fetch('/api/admin/media')
      .then((res) => res.json())
      .then((data) => {
        setMedia(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [open])

  if (!open) return null

  const filtered = search
    ? media.filter((m) => m.filename.toLowerCase().includes(search.toLowerCase()))
    : media

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Dialog */}
      <div className="relative glass rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-brand-border">
          <h2 className="text-lg font-display font-bold text-brand-text">Medien auswählen</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-brand-bg-dark transition-colors"
          >
            <XMarkIcon className="w-5 h-5 text-brand-text-muted" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pt-3">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text-muted" />
            <input
              type="text"
              placeholder="Medien durchsuchen..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-glass w-full pl-9 text-sm"
              autoFocus
            />
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin h-6 w-6 border-2 border-brand-accent border-t-transparent rounded-full" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <PhotoIcon className="w-10 h-10 text-brand-text-muted/40 mx-auto mb-2" />
              <p className="text-sm text-brand-text-muted">
                {media.length === 0
                  ? 'Keine Medien vorhanden. Lade zuerst Dateien in der Medienverwaltung hoch.'
                  : 'Keine Medien gefunden'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {filtered.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onSelect(item.url, item.filename)}
                  className="aspect-square relative rounded-lg overflow-hidden border-2 border-transparent hover:border-brand-accent transition-colors group"
                >
                  {item.type === 'IMAGE' ? (
                    <Image
                      src={item.url}
                      alt={item.filename}
                      fill
                      className="object-cover"
                      sizes="150px"
                    />
                  ) : (
                    <div className="w-full h-full bg-neutral-100 flex items-center justify-center relative">
                      <video
                        src={item.url}
                        muted
                        playsInline
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                      <VideoCameraIcon className="w-8 h-8 text-white drop-shadow-lg relative z-10" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-[10px] text-white truncate">{item.filename}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
