'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { embedUrl } from '@/lib/videoEmbed'

type GalleryItem = {
  id: string
  kind: string
  imageUrl?: string | null
  videoId?: string | null
  altText?: string | null
  caption?: string | null
}

function embedSrc(item: GalleryItem): string | null {
  if ((item.kind === 'youtube' || item.kind === 'vimeo') && item.videoId) {
    return embedUrl({ kind: item.kind, id: item.videoId })
  }
  return null
}

export default function ArtistGallery({ items, artistName }: { items: GalleryItem[]; artistName: string }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)

  const images = items.filter((i) => i.kind === 'image' && i.imageUrl)

  const close = useCallback(() => {
    dialogRef.current?.close()
    setLightboxIndex(null)
    triggerRef.current?.focus()
  }, [])

  const goPrev = useCallback(() => {
    setLightboxIndex((i) => (i === null ? i : (i - 1 + images.length) % images.length))
  }, [images.length])

  const goNext = useCallback(() => {
    setLightboxIndex((i) => (i === null ? i : (i + 1) % images.length))
  }, [images.length])

  useEffect(() => {
    if (lightboxIndex === null) return
    const dialog = dialogRef.current
    if (!dialog) return
    if (!dialog.open) dialog.showModal()
  }, [lightboxIndex])

  useEffect(() => {
    if (lightboxIndex === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goNext()
      if (e.key === 'ArrowLeft') goPrev()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [lightboxIndex, goNext, goPrev])

  if (!items.length) return null

  return (
    <div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {items.map((item, idx) => {
          const src = embedSrc(item)
          if (src) {
            return (
              <div key={item.id} className="aspect-video overflow-hidden rounded-section glass-card">
                <iframe
                  src={src}
                  title={item.altText || `${artistName} – Video`}
                  loading="lazy"
                  allow="accelerometer; clipboard-write; encrypted-media; picture-in-picture"
                  allowFullScreen
                  className="h-full w-full"
                />
              </div>
            )
          }
          if (item.kind === 'image' && item.imageUrl) {
            const imageIndex = images.findIndex((i) => i.id === item.id)
            return (
              <button
                key={item.id}
                onClick={(e) => { triggerRef.current = e.currentTarget; setLightboxIndex(imageIndex) }}
                className="aspect-square overflow-hidden rounded-section glass-card"
                aria-label={`${item.altText || artistName} vergrößern`}
              >
                <Image
                  src={item.imageUrl}
                  alt={item.altText || `${artistName} (${idx + 1})`}
                  width={600}
                  height={600}
                  className="h-full w-full object-cover"
                />
              </button>
            )
          }
          return null
        })}
      </div>

      {/* Native <dialog> provides built-in focus trap, Escape key, and correct AT behaviour */}
      <dialog
        ref={dialogRef}
        aria-label={lightboxIndex !== null ? `${artistName} – Bild ${lightboxIndex + 1} von ${images.length}` : undefined}
        className="fixed inset-0 z-50 m-auto max-h-screen max-w-screen bg-transparent p-0 backdrop:bg-black/80 open:flex open:items-center open:justify-center"
        onClick={(e) => { if (e.target === e.currentTarget) close() }}
        onClose={close}
      >
        {lightboxIndex !== null && images[lightboxIndex] && (
          <div className="relative flex items-center justify-center p-4">
            {images.length > 1 && (
              <button
                onClick={goPrev}
                aria-label="Vorheriges Bild"
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/80"
              >
                ‹
              </button>
            )}
            <Image
              src={images[lightboxIndex].imageUrl as string}
              alt={images[lightboxIndex].altText || artistName}
              width={1200}
              height={1200}
              className="max-h-[90vh] w-auto max-w-[90vw] object-contain"
            />
            {images.length > 1 && (
              <button
                onClick={goNext}
                aria-label="Nächstes Bild"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/80"
              >
                ›
              </button>
            )}
            <button
              onClick={close}
              className="absolute right-4 top-4 text-white"
              aria-label="Schließen"
            >
              ✕
            </button>
          </div>
        )}
      </dialog>
    </div>
  )
}
