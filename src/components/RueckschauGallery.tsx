'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'

export type GalleryGroup = { year: number; images: string[] }

export default function RueckschauGallery({ groups }: { groups: GalleryGroup[] }) {
  // Flatten for lightbox navigation across the whole gallery.
  const flat = groups.flatMap((g) => g.images)
  const [index, setIndex] = useState<number | null>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)

  const close = useCallback(() => {
    dialogRef.current?.close()
    setIndex(null)
    triggerRef.current?.focus()
  }, [])
  const prev = useCallback(() => setIndex((i) => (i === null ? i : (i - 1 + flat.length) % flat.length)), [flat.length])
  const next = useCallback(() => setIndex((i) => (i === null ? i : (i + 1) % flat.length)), [flat.length])

  useEffect(() => {
    if (index === null) return
    const d = dialogRef.current
    if (d && !d.open) d.showModal()
  }, [index])

  useEffect(() => {
    if (index === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') next()
      if (e.key === 'ArrowLeft') prev()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [index, next, prev])

  let running = -1

  return (
    <div>
      {groups.map((g) => (
        <section key={g.year} className="mb-10">
          <h3 className="mb-4 font-display text-2xl font-bold text-brand-text">e-Ventschau {g.year}</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {g.images.map((src) => {
              running += 1
              const flatIdx = running
              return (
                <button
                  key={src}
                  onClick={(e) => { triggerRef.current = e.currentTarget; setIndex(flatIdx) }}
                  className="group aspect-square overflow-hidden rounded-section glass-card"
                  aria-label={`Foto e-Ventschau ${g.year} vergrößern`}
                >
                  <Image
                    src={src}
                    alt={`e-Ventschau ${g.year}`}
                    width={500}
                    height={500}
                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </button>
              )
            })}
          </div>
        </section>
      ))}

      <dialog
        ref={dialogRef}
        aria-label={index !== null ? `Foto ${index + 1} von ${flat.length}` : undefined}
        className="fixed inset-0 z-50 m-auto max-h-screen max-w-screen bg-transparent p-0 backdrop:bg-black/80 open:flex open:items-center open:justify-center"
        onClick={(e) => { if (e.target === e.currentTarget) close() }}
        onClose={close}
      >
        {index !== null && flat[index] && (
          <div className="relative flex items-center justify-center p-4">
            {flat.length > 1 && (
              <button onClick={prev} aria-label="Vorheriges Bild" className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-3 text-white hover:bg-black/80">‹</button>
            )}
            <Image
              src={flat[index]}
              alt={`e-Ventschau Impression ${index + 1}`}
              width={1400}
              height={1400}
              className="max-h-[90vh] w-auto max-w-[90vw] object-contain"
            />
            {flat.length > 1 && (
              <button onClick={next} aria-label="Nächstes Bild" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-3 text-white hover:bg-black/80">›</button>
            )}
            <button onClick={close} aria-label="Schließen" className="absolute right-4 top-4 text-white text-xl">✕</button>
          </div>
        )}
      </dialog>
    </div>
  )
}
