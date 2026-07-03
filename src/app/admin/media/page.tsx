'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import {
  PhotoIcon,
  TrashIcon,
  ClipboardIcon,
  ArrowUpTrayIcon,
  CheckIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
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

interface MediaListResponse {
  items: MediaItem[]
  nextCursor: string | null
  total?: number
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
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [reloadNonce, setReloadNonce] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [filter, setFilter] = useState<FilterType>('ALL')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [lightbox, setLightbox] = useState<MediaItem | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const sentinelRef = useRef<HTMLDivElement | null>(null)
  // Bumped on every filter/search change (and set true synchronously while a
  // fresh first page is loading) so an in-flight/observer-triggered "load more"
  // from a previous filter can never append its stale rows to the new list.
  const genRef = useRef(0)
  const reloadingRef = useRef(false)
  // Mirrors of state read inside the long-lived IntersectionObserver callback,
  // so the observer never has to be re-created when they change.
  const loadMoreRef = useRef<() => void>(() => {})
  const loadErrorRef = useRef(false)

  const isFiltered = search !== '' || filter !== 'ALL'

  // Build the querystring for the current search + type filter (+ optional cursor).
  const listParams = useCallback(
    (cursor?: string) => {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (filter !== 'ALL') params.set('type', filter)
      if (cursor) params.set('cursor', cursor)
      return params
    },
    [search, filter],
  )

  // Debounce the search box (350ms) before it triggers a server query.
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 350)
    return () => clearTimeout(t)
  }, [searchInput])

  // Load the first page whenever the search term / type filter changes (or a
  // manual retry bumps reloadNonce). The `ignore` flag plus the generation
  // check drop stale responses if the inputs change mid-request.
  useEffect(() => {
    const gen = ++genRef.current
    reloadingRef.current = true
    let ignore = false
    setLoading(true)
    setLoadError(false)
    // A filter/search switch supersedes any in-flight "load more" from the old
    // generation — clear its spinner/guard now so the new list isn't left stuck.
    setLoadingMore(false)
    fetch(`/api/admin/media?${listParams().toString()}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('load failed'))))
      .then((data: MediaListResponse) => {
        if (ignore || gen !== genRef.current) return
        setMedia(Array.isArray(data.items) ? data.items : [])
        setHasMore(Boolean(data.nextCursor))
        setTotal(data.total ?? 0)
      })
      .catch(() => {
        if (ignore || gen !== genRef.current) return
        setMedia([])
        setHasMore(false)
        setTotal(0)
        setLoadError(true)
      })
      .finally(() => {
        if (ignore) return
        setLoading(false)
        if (gen === genRef.current) reloadingRef.current = false
      })
    return () => {
      ignore = true
    }
  }, [listParams, reloadNonce])

  // Append the next page. The cursor is derived from the last loaded item (not
  // stored separately) so a delete of the boundary row can't corrupt paging.
  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore || reloadingRef.current) return
    const gen = genRef.current
    const cursor = media.length > 0 ? media[media.length - 1].id : undefined
    setLoadingMore(true)
    try {
      const res = await fetch(`/api/admin/media?${listParams(cursor).toString()}`)
      if (!res.ok) throw new Error('load more failed')
      const data: MediaListResponse = await res.json()
      if (gen !== genRef.current) return // filter changed mid-flight — drop
      setMedia((prev) => [...prev, ...(Array.isArray(data.items) ? data.items : [])])
      setHasMore(Boolean(data.nextCursor))
      setTotal((prev) => data.total ?? prev)
      setLoadError(false)
    } catch {
      if (gen === genRef.current) setLoadError(true)
    } finally {
      // Only clear the flag if this call is still the current generation; a
      // stale settle must not unblock (and let a new load double-fetch) the
      // fresh list — the reload effect already reset the flag for it.
      if (gen === genRef.current) setLoadingMore(false)
    }
  }, [hasMore, loadingMore, listParams, media])

  useEffect(() => {
    loadMoreRef.current = loadMore
  }, [loadMore])
  useEffect(() => {
    loadErrorRef.current = loadError
  }, [loadError])

  // Infinite scroll: auto-load as the sentinel nears the admin scroll container.
  // Created once per hasMore transition and driven through refs, so load-state
  // churn never tears it down (which would eagerly re-fire and cascade-load).
  useEffect(() => {
    const el = sentinelRef.current
    if (!el || !hasMore) return
    const root = el.closest('main') // admin content scrolls in <main>, not the viewport
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !loadErrorRef.current) loadMoreRef.current()
      },
      { root, rootMargin: '400px' },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [hasMore])

  const uploadFiles = async (files: FileList | File[]) => {
    setUploading(true)
    setUploadError(null)
    const fileArray = Array.from(files)

    for (const file of fileArray) {
      try {
        // 1. Get signed upload params from our API
        const signRes = await fetch('/api/admin/media/sign', { method: 'POST' })
        if (!signRes.ok) {
          const data = await signRes.json().catch(() => null)
          setUploadError(data?.error || 'Upload-Konfiguration fehlgeschlagen.')
          console.error('Failed to get upload signature', data)
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
          const err = await uploadRes.json().catch(() => null)
          const msg = err?.error?.message
          setUploadError(
            msg ? `Cloudinary: ${msg}` : `Cloudinary-Upload fehlgeschlagen (${uploadRes.status}).`,
          )
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
          const newMedia: MediaItem = await saveRes.json()
          // Only surface the upload in the current view when it matches the
          // active type filter AND search, so the list + total stay consistent.
          const matchesType = filter === 'ALL' || newMedia.type === filter
          const matchesSearch =
            !search || newMedia.filename.toLowerCase().includes(search.toLowerCase())
          if (matchesType && matchesSearch) {
            setMedia((prev) => [newMedia, ...prev])
            setTotal((t) => t + 1)
          }
        }
      } catch (err) {
        console.error('Upload failed:', err)
        setUploadError('Upload fehlgeschlagen. Bitte erneut versuchen.')
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
      setTotal((t) => Math.max(0, t - 1))
    }
    setDeleteConfirm(null)
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-brand-text">Medien</h1>
          <p className="text-sm text-brand-text-muted mt-1">
            {total} Datei{total !== 1 ? 'en' : ''}
            {isFiltered ? ' (gefiltert)' : ''}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text-muted pointer-events-none" />
            <input
              type="text"
              placeholder="Nach Dateiname suchen…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="input-glass w-56 pl-9 pr-8 text-sm"
              aria-label="Medien nach Dateiname durchsuchen"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput('')}
                aria-label="Suche zurücksetzen"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-brand-text-muted hover:text-brand-text"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            )}
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

      {uploadError && (
        <div
          role="alert"
          className="mb-6 flex items-start justify-between gap-3 rounded-lg border border-brand-accent/40 bg-brand-accent/10 px-4 py-3 text-sm text-brand-text"
        >
          <span>{uploadError}</span>
          <button
            type="button"
            onClick={() => setUploadError(null)}
            aria-label="Fehler schließen"
            className="shrink-0 text-brand-text-muted hover:text-brand-text"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Gallery grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin h-8 w-8 border-2 border-brand-accent border-t-transparent rounded-full" />
        </div>
      ) : media.length === 0 && !hasMore ? (
        <div className="text-center py-20">
          <PhotoIcon className="w-12 h-12 text-brand-text-muted/40 mx-auto mb-3" />
          <p className="text-brand-text-muted">
            {loadError
              ? 'Medien konnten nicht geladen werden.'
              : isFiltered
                ? 'Keine Ergebnisse für diese Auswahl'
                : 'Noch keine Medien hochgeladen'}
          </p>
          {loadError && (
            <button
              type="button"
              onClick={() => setReloadNonce((n) => n + 1)}
              className="btn-secondary text-sm mt-4"
            >
              Erneut laden
            </button>
          )}
        </div>
      ) : (
        <>
          {media.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {media.map((item) => (
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

          {/* Infinite-scroll sentinel + manual fallback */}
          {hasMore ? (
            <div ref={sentinelRef} className="flex justify-center py-8">
              <button
                type="button"
                onClick={() => loadMore()}
                disabled={loadingMore}
                className="btn-secondary text-sm"
              >
                {loadingMore ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                    Wird geladen...
                  </span>
                ) : loadError ? (
                  'Erneut laden'
                ) : (
                  'Mehr laden'
                )}
              </button>
            </div>
          ) : (
            media.length > 0 && (
              <p className="text-center text-xs text-brand-text-muted py-8">
                Alle {total} Medien geladen
              </p>
            )
          )}
        </>
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
