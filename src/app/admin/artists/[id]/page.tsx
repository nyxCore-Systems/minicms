'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import type { TElement } from '@udecode/plate'
import MediaPickerDialog from '@/components/admin/MediaPickerDialog'
import { markdownToPlate } from '@/components/admin/editor/serialization/markdownToPlate'
import { plateToMarkdown } from '@/components/admin/editor/serialization/plateToMarkdown'

const PlateEditor = dynamic(
  () => import('@/components/admin/editor/PlateEditor').then(m => ({ default: m.PlateEditor })),
  { ssr: false }
)

type Social = { platform: string; url: string }
type GalleryItem = { id?: string; kind: string; imageUrl?: string | null; videoId?: string | null; altText?: string | null }

function parseVideoUrl(url: string): { kind: 'youtube' | 'vimeo'; videoId: string } | null {
  // Vimeo: vimeo.com/123456789
  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/)
  if (vimeo) return { kind: 'vimeo', videoId: vimeo[1] }
  // YouTube: youtu.be/ID or ?v=ID or /embed/ID
  const yt =
    url.match(/youtu\.be\/([^?&/#]+)/) ||
    url.match(/[?&]v=([^&/#]+)/) ||
    url.match(/youtube\.com\/embed\/([^?&/#]+)/)
  if (yt) return { kind: 'youtube', videoId: yt[1] }
  return null
}

export default function EditArtistPage() {
  const params = useParams()
  const id = params.id as string
  const [form, setForm] = useState({
    name: '', slug: '', origin: '', genres: '', excerpt: '', heroImage: '',
    website: '', metaTitle: '', metaDescription: '',
    isPublished: false, isFeatured: false, isActive: true,
  })
  const [bioJson, setBioJson] = useState<TElement[] | null>(null)
  const [socials, setSocials] = useState<Social[]>([])
  const [gallery, setGallery] = useState<GalleryItem[]>([])
  const [pick, setPick] = useState<'hero' | 'gallery' | null>(null)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')
  // State for inline video URL input
  const [videoInputVisible, setVideoInputVisible] = useState(false)
  const [videoInputValue, setVideoInputValue] = useState('')
  const [videoInputError, setVideoInputError] = useState('')

  useEffect(() => {
    fetch(`/api/admin/artists/${id}`).then((r) => r.json()).then((a) => {
      setForm({
        name: a.name || '', slug: a.slug || '', origin: a.origin || '', genres: (a.genres || []).join(', '),
        excerpt: a.excerpt || '', heroImage: a.heroImage || '', website: a.website || '',
        metaTitle: a.metaTitle || '', metaDescription: a.metaDescription || '',
        isPublished: !!a.isPublished, isFeatured: !!a.isFeatured, isActive: a.isActive !== false,
      })
      setBioJson(a.bioJson || markdownToPlate(a.bio || ''))
      setSocials(Array.isArray(a.socials) ? a.socials : [])
      setGallery(a.media || [])
    })
  }, [id])

  async function save() {
    setSaveError('')
    const bio = bioJson ? plateToMarkdown(bioJson) : ''
    const res = await fetch(`/api/admin/artists/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        genres: form.genres.split(',').map((g) => g.trim()).filter(Boolean),
        bio, bioJson, editorMode: 'wysiwyg', socials, media: gallery,
      }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setSaveError(body.error || `Fehler ${res.status}`)
      return
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function addVideo() {
    setVideoInputError('')
    const parsed = parseVideoUrl(videoInputValue.trim())
    if (!parsed) {
      setVideoInputError('Ungültiger YouTube- oder Vimeo-Link')
      return
    }
    setGallery((p) => [...p, { kind: parsed.kind, videoId: parsed.videoId }])
    setVideoInputValue('')
    setVideoInputVisible(false)
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Künstler bearbeiten</h1>
        <div className="flex items-center gap-3">
          {saved && <span className="text-green-600">Gespeichert ✓</span>}
          {saveError && <span className="text-red-600">{saveError}</span>}
          <button onClick={save} className="btn-primary px-5 py-2">Speichern</button>
        </div>
      </div>

      {/* Basics */}
      <div className="grid gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Name</span>
          <input className="rounded-section border p-2" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Slug</span>
          <input className="rounded-section border p-2" value={form.slug} onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Herkunft</span>
          <input className="rounded-section border p-2" value={form.origin} onChange={(e) => setForm((p) => ({ ...p, origin: e.target.value }))} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Genres (Komma-getrennt)</span>
          <input className="rounded-section border p-2" value={form.genres} onChange={(e) => setForm((p) => ({ ...p, genres: e.target.value }))} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Kurzbeschreibung</span>
          <textarea className="rounded-section border p-2" rows={2} value={form.excerpt} onChange={(e) => setForm((p) => ({ ...p, excerpt: e.target.value }))} />
        </label>
        <div className="flex items-center gap-3">
          <span className="text-sm">Hero: {form.heroImage || '—'}</span>
          <button type="button" className="btn-secondary px-3 py-1" onClick={() => setPick('hero')}>Medien…</button>
        </div>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Website (https://)</span>
          <input className="rounded-section border p-2" value={form.website} onChange={(e) => setForm((p) => ({ ...p, website: e.target.value }))} />
        </label>
      </div>

      {/* Bio (Plate) */}
      <div>
        <h2 className="mb-2 font-semibold">Bio</h2>
        {bioJson !== null && <PlateEditor initialValue={bioJson} onChange={(v) => setBioJson(v)} />}
      </div>

      {/* Socials */}
      <div>
        <h2 className="mb-2 font-semibold">Social-Links</h2>
        {socials.map((s, i) => (
          <div key={i} className="mb-2 flex gap-2">
            <label className="sr-only" htmlFor={`social-platform-${i}`}>Plattform</label>
            <input id={`social-platform-${i}`} className="w-40 rounded-section border p-2" placeholder="Plattform" value={s.platform}
              onChange={(e) => setSocials((p) => p.map((x, j) => (j === i ? { ...x, platform: e.target.value } : x)))} />
            <label className="sr-only" htmlFor={`social-url-${i}`}>URL</label>
            <input id={`social-url-${i}`} className="flex-1 rounded-section border p-2" placeholder="https://…" value={s.url}
              onChange={(e) => setSocials((p) => p.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))} />
            <button type="button" onClick={() => setSocials((p) => p.filter((_, j) => j !== i))} className="px-2 text-red-600" aria-label={`Social-Link ${i + 1} entfernen`}>✕</button>
          </div>
        ))}
        <button type="button" className="btn-secondary px-3 py-1" onClick={() => setSocials((p) => [...p, { platform: '', url: '' }])}>+ Link</button>
      </div>

      {/* Gallery */}
      <div>
        <h2 className="mb-2 font-semibold">Galerie</h2>
        <div className="grid grid-cols-3 gap-2">
          {gallery.map((g, i) => (
            <div key={i} className="rounded-section border p-2 text-xs">
              <p className="truncate">{g.kind}: {g.imageUrl || g.videoId}</p>
              <label className="sr-only" htmlFor={`gallery-alt-${i}`}>Alt-Text</label>
              <input id={`gallery-alt-${i}`} className="mt-1 w-full border p-1" placeholder="Alt-Text" value={g.altText || ''}
                onChange={(e) => setGallery((p) => p.map((x, j) => (j === i ? { ...x, altText: e.target.value } : x)))} />
              <button type="button" onClick={() => setGallery((p) => p.filter((_, j) => j !== i))} className="mt-1 text-red-600">Entfernen</button>
            </div>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" className="btn-secondary px-3 py-1" onClick={() => setPick('gallery')}>+ Bild</button>
          <button type="button" className="btn-secondary px-3 py-1" onClick={() => { setVideoInputVisible((v) => !v); setVideoInputError('') }}>
            + Video (YouTube/Vimeo)
          </button>
        </div>
        {videoInputVisible && (
          <div className="mt-2 flex flex-col gap-1">
            <label htmlFor="video-url-input" className="text-sm font-medium">YouTube- oder Vimeo-Link</label>
            <div className="flex gap-2">
              <input
                id="video-url-input"
                className="flex-1 rounded-section border p-2 text-sm"
                value={videoInputValue}
                onChange={(e) => setVideoInputValue(e.target.value)}
                placeholder="https://youtu.be/… oder https://vimeo.com/…"
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addVideo() } }}
              />
              <button type="button" className="btn-primary px-3 py-1" onClick={addVideo}>Hinzufügen</button>
              <button type="button" className="btn-secondary px-3 py-1" onClick={() => { setVideoInputVisible(false); setVideoInputValue(''); setVideoInputError('') }}>Abbrechen</button>
            </div>
            {videoInputError && <p className="text-sm text-red-600">{videoInputError}</p>}
          </div>
        )}
      </div>

      {/* SEO + publish */}
      <div className="grid gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Meta-Title</span>
          <input className="rounded-section border p-2" value={form.metaTitle} onChange={(e) => setForm((p) => ({ ...p, metaTitle: e.target.value }))} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Meta-Description</span>
          <textarea className="rounded-section border p-2" rows={2} value={form.metaDescription} onChange={(e) => setForm((p) => ({ ...p, metaDescription: e.target.value }))} />
        </label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm((p) => ({ ...p, isFeatured: e.target.checked }))} /> Headliner</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={form.isPublished} onChange={(e) => setForm((p) => ({ ...p, isPublished: e.target.checked }))} /> Veröffentlicht</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))} /> Aktiv</label>
      </div>

      <MediaPickerDialog
        open={pick !== null}
        onClose={() => setPick(null)}
        onSelect={(url) => {
          if (pick === 'hero') setForm((p) => ({ ...p, heroImage: url }))
          else if (pick === 'gallery') setGallery((p) => [...p, { kind: 'image', imageUrl: url }])
          setPick(null)
        }}
      />
    </div>
  )
}
