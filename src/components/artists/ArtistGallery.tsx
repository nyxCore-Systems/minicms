'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'

type GalleryItem = {
  id: string
  kind: string
  imageUrl?: string | null
  videoId?: string | null
  altText?: string | null
  caption?: string | null
}

function embedSrc(item: GalleryItem): string | null {
  if (item.kind === 'youtube' && item.videoId) return `https://www.youtube-nocookie.com/embed/${item.videoId}`
  if (item.kind === 'vimeo' && item.videoId) return `https://player.vimeo.com/video/${item.videoId}`
  return null
}

export default function ArtistGallery({ items, artistName }: { items: GalleryItem[]; artistName: string }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)

  const images = items.filter((i) => i.kind === 'image' && i.imageUrl)

  const close = useCallback(() => {
    setLightboxIndex(null)
    triggerRef.current?.focus()
  }, [])

  useEffect(() => {
    if (lightboxIndex === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
      if (e.key === 'ArrowRight') setLightboxIndex((i) => (i === null ? i : (i + 1) % images.length))
      if (e.key === 'ArrowLeft') setLightboxIndex((i) => (i === null ? i : (i - 1 + images.length) % images.length))
    }
    document.addEventListener('keydown', onKey)
    dialogRef.current?.focus()
    return () => document.removeEventListener('keydown', onKey)
  }, [lightboxIndex, images.length, close])

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

      {lightboxIndex !== null && images[lightboxIndex] && (
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label={`${artistName} – Bild ${lightboxIndex + 1} von ${images.length}`}
          tabIndex={-1}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={close}
        >
          <Image
            src={images[lightboxIndex].imageUrl as string}
            alt={images[lightboxIndex].altText || artistName}
            width={1200}
            height={1200}
            className="max-h-[90vh] w-auto max-w-[90vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button onClick={close} className="absolute right-4 top-4 text-white" aria-label="Schließen">✕</button>
        </div>
      )}
    </div>
  )
}
