'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import {
  PhotoIcon,
  VideoCameraIcon,
  TrashIcon,
  ClipboardIcon,
  ArrowUpTrayIcon,
  CheckIcon,
  FunnelIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'

interface MediaItem {
  id: string
  type: 'IMAGE' | 'VIDEO'
  filename: string
  url: string
  width: number | null
  height: number | null
  bytes: number | null
  format: string | null
  createdAt: string
}

type FilterType = 'ALL' | 'IMAGE' | 'VIDEO'

function formatBytes(bytes: number | null): string {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function MediaPage() {
  const [media, setMedia] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [filter, setFilter] = useState<FilterType>('ALL')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [lightbox, setLightbox] = useState<MediaItem | null>(null)

  const fetchMedia = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/media')
      if (res.ok) {
        const data = await res.json()
        setMedia(data)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMedia()
  }, [fetchMedia])

  const uploadFiles = async (files: FileList | File[]) => {
    setUploading(true)
    const fileArray = Array.from(files)

    for (const file of fileArray) {
      try {
        // 1. Get signed upload params from our API
        const signRes = await fetch('/api/admin/media/sign', { method: 'POST' })
        if (!signRes.ok) {
          console.error('Failed to get upload signature')
          continue
        }
        const { signature, timestamp, apiKey, cloudName, folder } = await signRes.json()

        // 2. Upload directly to Cloudinary (bypasses Vercel 4.5MB limit)
        const isVideo = file.type.startsWith('video/')
        const cloudinaryForm = new FormData()
        cloudinaryForm.append('file', file)
        cloudinaryForm.append('signature', signature)
        cloudinaryForm.append('timestamp', String(timestamp))
        cloudinaryForm.append('api_key', apiKey)
        cloudinaryForm.append('folder', folder)

        const resourceType = isVideo ? 'video' : 'image'
        const uploadRes = await fetch(
          `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
          { method: 'POST', body: cloudinaryForm }
        )

        if (!uploadRes.ok) {
          const err = await uploadRes.text()
          console.error('Cloudinary upload failed:', err)
          continue
        }

        const cloudResult = await uploadRes.json()

        // 3. Save metadata to our DB
        const saveRes = await fetch('/api/admin/media', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: file.name,
            url: cloudResult.secure_url,
            cloudinaryId: cloudResult.public_id,
            width: cloudResult.width,
            height: cloudResult.height,
            bytes: cloudResult.bytes,
            format: cloudResult.format,
            resourceType: cloudResult.resource_type,
          }),
        })

        if (saveRes.ok) {
          const newMedia = await saveRes.json()
          setMedia((prev) => [newMedia, ...prev])
        }
      } catch (err) {
        console.error('Upload failed:', err)
      }
    }

    setUploading(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    if (e.dataTransfer.files.length > 0) {
      uploadFiles(e.dataTransfer.files)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadFiles(e.target.files)
    }
  }

  const copyUrl = async (item: MediaItem) => {
    await navigator.clipboard.writeText(item.url)
    setCopiedId(item.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const deleteMedia = async (id: string) => {
    const res = await fetch(`/api/admin/media/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setMedia((prev) => prev.filter((m) => m.id !== id))
    }
    setDeleteConfirm(null)
  }

  const filtered = filter === 'ALL' ? media : media.filter((m) => m.type === filter)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-brand-text">Medien</h1>
          <p className="text-sm text-brand-text-muted mt-1">
            {media.length} Datei{media.length !== 1 ? 'en' : ''}
          </p>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-1 bg-brand-bg-dark rounded-lg p-1">
          <FunnelIcon className="w-4 h-4 text-brand-text-muted mr-1" />
          {(['ALL', 'IMAGE', 'VIDEO'] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                filter === f
                  ? 'bg-brand-accent/10 text-brand-accent'
                  : 'text-brand-text-muted hover:text-brand-text'
              }`}
            >
              {f === 'ALL' ? 'Alle' : f === 'IMAGE' ? 'Bilder' : 'Videos'}
            </button>
          ))}
        </div>
      </div>

      {/* Upload zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        className={`glass rounded-xl border-2 border-dashed p-8 text-center mb-6 transition-colors ${
          dragActive
            ? 'border-brand-accent bg-brand-accent/10'
            : 'border-brand-border hover:border-brand-text-muted/40'
        }`}
      >
        <ArrowUpTrayIcon className="w-10 h-10 text-brand-text-muted mx-auto mb-3" />
        <p className="text-sm text-brand-text-muted mb-3">
          {uploading
            ? 'Wird hochgeladen...'
            : 'Dateien hierher ziehen oder klicken zum Auswählen'}
        </p>
        <label className="btn-primary text-sm cursor-pointer inline-block">
          {uploading ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
              Hochladen...
            </span>
          ) : (
            'Dateien auswählen'
          )}
          <input
            type="file"
            multiple
            accept="image/*,video/mp4,video/webm"
            onChange={handleFileSelect}
            className="hidden"
            disabled={uploading}
          />
        </label>
        <p className="text-xs text-brand-text-muted mt-2">
          JPG, PNG, GIF, WebP, SVG, MP4, WebM — max. 100 MB
        </p>
      </div>

      {/* Gallery grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin h-8 w-8 border-2 border-brand-accent border-t-transparent rounded-full" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <PhotoIcon className="w-12 h-12 text-brand-text-muted/40 mx-auto mb-3" />
          <p className="text-brand-text-muted">
            {media.length === 0 ? 'Noch keine Medien hochgeladen' : 'Keine Ergebnisse für diesen Filter'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="glass rounded-xl overflow-hidden group relative"
            >
              {/* Thumbnail */}
              <div className="aspect-square relative bg-brand-bg-dark">
                {item.type === 'IMAGE' ? (
                  <button
                    type="button"
                    onClick={() => setLightbox(item)}
                    className="w-full h-full relative cursor-zoom-in"
                  >
                    <Image
                      src={item.url}
                      alt={item.filename}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                    />
                  </button>
                ) : (
                  <video
                    controls
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                    src={item.url}
                  />
                )}

                {/* Overlay actions */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 pointer-events-none">
                  <button
                    onClick={(e) => { e.stopPropagation(); copyUrl(item) }}
                    className="p-2 bg-white/90 rounded-lg hover:bg-white transition-colors pointer-events-auto"
                    title="URL kopieren"
                  >
                    {copiedId === item.id ? (
                      <CheckIcon className="w-5 h-5 text-green-500" />
                    ) : (
                      <ClipboardIcon className="w-5 h-5 text-gray-700" />
                    )}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteConfirm === item.id
                        ? deleteMedia(item.id)
                        : setDeleteConfirm(item.id)
                    }}
                    className={`p-2 rounded-lg transition-colors pointer-events-auto ${
                      deleteConfirm === item.id
                        ? 'bg-red-500 hover:bg-red-600'
                        : 'bg-white/90 hover:bg-white'
                    }`}
                    title={deleteConfirm === item.id ? 'Klicken zum Bestätigen' : 'Löschen'}
                  >
                    <TrashIcon className={`w-5 h-5 ${
                      deleteConfirm === item.id ? 'text-white' : 'text-gray-700'
                    }`} />
                  </button>
                </div>
              </div>

              {/* Info */}
              <div className="p-2.5">
                <p className="text-xs font-medium text-brand-text truncate" title={item.filename}>
                  {item.filename}
                </p>
                <p className="text-[10px] text-brand-text-muted mt-0.5">
                  {item.format?.toUpperCase()} · {formatBytes(item.bytes)}
                  {item.width && item.height ? ` · ${item.width}×${item.height}` : ''}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox modal */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
          >
            <XMarkIcon className="w-6 h-6 text-white" />
          </button>
          {lightbox.type === 'IMAGE' ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={lightbox.url}
              alt={lightbox.filename}
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <video
              controls
              autoPlay
              className="max-w-full max-h-[90vh] rounded-lg"
              src={lightbox.url}
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </div>
      )}
    </div>
  )
}
