'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import type { TElement } from '@udecode/plate'
import MarkdownContent from '@/components/MarkdownContent'
import AiImproveButton from '@/components/admin/AiImproveButton'
import MediaPickerDialog from '@/components/admin/MediaPickerDialog'
import PageDeleteDialog from '@/components/admin/PageDeleteDialog'
import { plateValueFor, markdownFrom } from '@/lib/contentEditor'
import { ChevronDownIcon, SparklesIcon, XMarkIcon, BookOpenIcon, ClockIcon } from '@heroicons/react/24/outline'

const PlateEditor = dynamic(
  () => import('@/components/admin/editor/PlateEditor').then(m => ({ default: m.PlateEditor })),
  { ssr: false, loading: () => <div className="glass rounded-xl p-6 flex items-center justify-center min-h-[300px]"><div className="animate-spin h-6 w-6 border-2 border-brand-accent border-t-transparent rounded-full" /></div> }
)

interface FaqItem {
  question: string
  answer: string
}

interface MenuItemData {
  id: string
  location: string
  label: string
  parentId: string | null
  sortOrder: number
}

interface ParentLinkData {
  parentId: string
  parent: { id: string; title: string; path: string | null }
}

interface PageData {
  id: string
  slug: string
  title: string
  path: string | null
  content: string
  metaTitle: string | null
  metaDescription: string | null
  metaKeywords: string | null
  backgroundImage: string | null
  faqSchema: string | null
  seoData: string | null
  noIndex: boolean
  ctaSource: string | null
  ctaTitle: string | null
  ctaSubtitle: string | null
  isPublished: boolean
  updatedAt: string
  contentJson: TElement[] | null
  editorMode: string | null
  menuItems: MenuItemData[]
  parentLinks: ParentLinkData[]
}

interface SeoGenerationResult {
  metaTitle: string
  metaDescription: string
  metaKeywords: string[]
  faqItems: FaqItem[]
}

interface VersionSummary {
  id: string
  savedAt: string
  savedBy: string | null
  title: string
  isPublished: boolean
}

interface VersionFull {
  id: string
  title: string
  content: string
  contentJson: TElement[] | null
  editorMode: string | null
  metaTitle: string | null
  metaDescription: string | null
  metaKeywords: string | null
  backgroundImage: string | null
  faqSchema: FaqItem[] | null
  seoData: SeoGenerationResult | null
  noIndex: boolean
  isPublished: boolean
  savedAt: string
  savedBy: string | null
}

interface AllPageItem {
  id: string
  title: string
  path: string | null
}

export default function ContentEditorPage() {
  const params = useParams()
  const router = useRouter()
  const [page, setPage] = useState<PageData | null>(null)
  const [content, setContent] = useState('')
  const [title, setTitle] = useState('')
  const [path, setPath] = useState('')
  const [metaDescription, setMetaDescription] = useState('')
  const [metaKeywords, setMetaKeywords] = useState('')
  const [backgroundImage, setBackgroundImage] = useState('')
  const [faqSchema, setFaqSchema] = useState<FaqItem[]>([])
  const [isPublished, setIsPublished] = useState(true)
  const [noIndex, setNoIndex] = useState(false)
  const [ctaSource, setCtaSource] = useState('')
  const [ctaTitle, setCtaTitle] = useState('')
  const [ctaSubtitle, setCtaSubtitle] = useState('')
  const [showBgPicker, setShowBgPicker] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [editorMode, setEditorMode] = useState<'markdown' | 'wysiwyg' | 'preview'>('markdown')
  const [contentJson, setContentJson] = useState<TElement[] | null>(null)
  const [showMediaPicker, setShowMediaPicker] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [showFaq, setShowFaq] = useState(false)
  const [showSeo, setShowSeo] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showMeta, setShowMeta] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showVersions, setShowVersions] = useState(false)
  const [versions, setVersions] = useState<VersionSummary[]>([])
  const [loadingVersions, setLoadingVersions] = useState(false)
  const [previewVersion, setPreviewVersion] = useState<VersionFull | null>(null)
  const [restoringVersion, setRestoringVersion] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const plateInsertImageRef = useRef<((url: string, alt: string) => void) | null>(null)
  const [helpPanelWidth, setHelpPanelWidth] = useState(380)
  const isDragging = useRef(false)

  // SEO generation state
  const [generating, setGenerating] = useState(false)
  const [seoResult, setSeoResult] = useState<SeoGenerationResult | null>(null)

  // All pages for parent selector
  const [allPages, setAllPages] = useState<AllPageItem[]>([])
  const [parentIds, setParentIds] = useState<string[]>([])

  // Menu state
  const [inHeader, setInHeader] = useState(false)
  const [inFooter, setInFooter] = useState(false)

  useEffect(() => {
    fetch(`/api/admin/pages/${params.id}`)
      .then((res) => {
        if (!res.ok) throw new Error('Page not found')
        return res.json()
      })
      .then((data: PageData) => {
        setPage(data)
        setContent(data.content)
        setTitle(data.title)
        setPath(data.path || '')
        setMetaDescription(data.metaDescription || '')
        setMetaKeywords(data.metaKeywords || '')
        setBackgroundImage(data.backgroundImage || '')
        setIsPublished(data.isPublished)
        setNoIndex(data.noIndex)
        setCtaSource(data.ctaSource || '')
        setCtaTitle(data.ctaTitle || '')
        setCtaSubtitle(data.ctaSubtitle || '')
        setInHeader(data.menuItems?.some((m) => m.location === 'header') || false)
        setInFooter(data.menuItems?.some((m) => m.location === 'footer') || false)
        setParentIds(data.parentLinks?.map((l) => l.parentId) || [])
        if (data.contentJson) setContentJson(data.contentJson as TElement[])
        if (data.editorMode === 'wysiwyg') setEditorMode('wysiwyg')
        if (data.faqSchema) {
          const faq = typeof data.faqSchema === 'string' ? JSON.parse(data.faqSchema) : data.faqSchema
          if (Array.isArray(faq)) setFaqSchema(faq)
        }
        if (data.seoData) {
          const seo = typeof data.seoData === 'string' ? JSON.parse(data.seoData) : data.seoData
          if (seo && typeof seo === 'object') setSeoResult(seo)
        }
        setLoading(false)
      })
      .catch(() => {
        setError('Seite nicht gefunden')
        setLoading(false)
      })

    // Fetch all pages for parent selector
    fetch('/api/admin/pages')
      .then((res) => res.json())
      .then((pages: AllPageItem[]) => {
        setAllPages(pages.filter((p: AllPageItem) => p.id !== params.id))
      })
      .catch(() => {})
  }, [params.id])

  const save = useCallback(async () => {
    setSaving(true)
    setSaved(false)
    setError('')

    // Sync WYSIWYG → markdown so the public page gets updated content
    let markdownContent = content
    if (editorMode === 'wysiwyg' && contentJson) {
      markdownContent = markdownFrom(contentJson)
      setContent(markdownContent)
    }

    try {
      const res = await fetch(`/api/admin/pages/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content: markdownContent,
          path: path || null,
          metaTitle: title,
          metaDescription: metaDescription || null,
          metaKeywords: metaKeywords || null,
          backgroundImage: backgroundImage || null,
          faqSchema: faqSchema.length > 0 ? faqSchema : null,
          seoData: seoResult || null,
          noIndex,
          ctaSource: ctaSource || null,
          ctaTitle: ctaTitle || null,
          ctaSubtitle: ctaSubtitle || null,
          isPublished,
          parentIds,
          contentJson: contentJson || null,
          editorMode: editorMode === 'preview' ? 'markdown' : editorMode,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Save failed')
      }

      const updated = await res.json()
      setPage((prev) => prev ? { ...prev, ...updated } : prev)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern')
    } finally {
      setSaving(false)
    }
  }, [params.id, title, content, path, metaDescription, metaKeywords, backgroundImage, faqSchema, seoResult, isPublished, noIndex, ctaSource, ctaTitle, ctaSubtitle, parentIds, contentJson, editorMode])

  const toggleMenu = useCallback(async (location: string, enable: boolean) => {
    try {
      if (enable) {
        await fetch(`/api/admin/pages/${params.id}/menu`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ location, label: title }),
        })
      } else {
        await fetch(`/api/admin/pages/${params.id}/menu?location=${location}`, {
          method: 'DELETE',
        })
      }
    } catch {
      setError('Menü-Update fehlgeschlagen')
    }
  }, [params.id, title])

  const generateSeo = useCallback(async () => {
    if (!page) return
    setGenerating(true)
    setError('')

    try {
      const res = await fetch('/api/admin/ai/generate-seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          slug: page.slug,
          title,
          currentMeta: {
            metaTitle: title,
            metaDescription: metaDescription || undefined,
            metaKeywords: metaKeywords ? metaKeywords.split(', ') : undefined,
          },
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'SEO-Generierung fehlgeschlagen')
      }

      const data: SeoGenerationResult = await res.json()
      setSeoResult(data)
      setShowSeo(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'SEO-Generierung fehlgeschlagen')
    } finally {
      setGenerating(false)
    }
  }, [page, content, title, metaDescription, metaKeywords])

  const applySeoResult = useCallback(() => {
    if (!seoResult) return
    setTitle(seoResult.metaTitle)
    setMetaDescription(seoResult.metaDescription)
    setMetaKeywords(seoResult.metaKeywords.join(', '))
    setFaqSchema(seoResult.faqItems)
    setShowSeo(false)
  }, [seoResult])

  const loadVersions = useCallback(async () => {
    setLoadingVersions(true)
    try {
      const res = await fetch(`/api/admin/pages/${params.id}/versions`)
      if (!res.ok) throw new Error('Failed to load versions')
      const data: VersionSummary[] = await res.json()
      setVersions(data)
    } catch {
      setError('Versionen konnten nicht geladen werden')
    } finally {
      setLoadingVersions(false)
    }
  }, [params.id])

  const toggleVersions = useCallback(() => {
    if (!showVersions) {
      loadVersions()
    }
    setShowVersions((prev) => !prev)
    setPreviewVersion(null)
  }, [showVersions, loadVersions])

  const loadVersionDetail = useCallback(async (versionId: string) => {
    try {
      const res = await fetch(`/api/admin/pages/${params.id}/versions/${versionId}`)
      if (!res.ok) throw new Error('Failed to load version')
      const data: VersionFull = await res.json()
      setPreviewVersion(data)
    } catch {
      setError('Version konnte nicht geladen werden')
    }
  }, [params.id])

  const restoreVersion = useCallback(async (versionId: string) => {
    setRestoringVersion(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/pages/${params.id}/versions/${versionId}`, {
        method: 'POST',
      })
      if (!res.ok) throw new Error('Restore failed')
      const updated = await res.json()

      // Update local state with restored data
      setTitle(updated.title)
      setContent(updated.content)
      setMetaDescription(updated.metaDescription || '')
      setMetaKeywords(updated.metaKeywords || '')
      setBackgroundImage(updated.backgroundImage || '')
      setIsPublished(updated.isPublished)
      setNoIndex(updated.noIndex)
      if (updated.contentJson) setContentJson(updated.contentJson)
      if (updated.editorMode === 'wysiwyg') setEditorMode('wysiwyg')
      if (updated.faqSchema) {
        const faq = typeof updated.faqSchema === 'string' ? JSON.parse(updated.faqSchema) : updated.faqSchema
        if (Array.isArray(faq)) setFaqSchema(faq)
      }
      if (updated.seoData) {
        const seo = typeof updated.seoData === 'string' ? JSON.parse(updated.seoData) : updated.seoData
        if (seo && typeof seo === 'object') setSeoResult(seo)
      }
      setPage((prev) => prev ? { ...prev, ...updated } : prev)

      setShowVersions(false)
      setPreviewVersion(null)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)

      // Refresh version list
      loadVersions()
    } catch {
      setError('Version konnte nicht wiederhergestellt werden')
    } finally {
      setRestoringVersion(false)
    }
  }, [params.id, loadVersions])

  const insertImage = useCallback((url: string, filename: string) => {
    const alt = filename.replace(/\.[^.]+$/, '')

    // WYSIWYG mode: insert Plate image node
    if (editorMode === 'wysiwyg' && plateInsertImageRef.current) {
      plateInsertImageRef.current(url, alt)
      setShowMediaPicker(false)
      return
    }

    // Markdown mode: insert markdown syntax
    const markdown = `![${alt}](${url})`
    const textarea = textareaRef.current
    if (textarea) {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const newContent = content.substring(0, start) + markdown + content.substring(end)
      setContent(newContent)
      setTimeout(() => {
        textarea.focus()
        textarea.setSelectionRange(start + markdown.length, start + markdown.length)
      }, 0)
    } else {
      setContent((prev) => prev + '\n' + markdown)
    }
    setShowMediaPicker(false)
  }, [content, editorMode])

  const switchEditorMode = useCallback((newMode: 'markdown' | 'wysiwyg' | 'preview') => {
    if (newMode === editorMode) return

    // Sync content when switching between markdown and wysiwyg
    if (editorMode === 'markdown' && newMode === 'wysiwyg') {
      // Markdown → WYSIWYG: convert markdown to Plate JSON
      setContentJson(plateValueFor(content, null))
    } else if (editorMode === 'wysiwyg' && (newMode === 'markdown' || newMode === 'preview')) {
      // WYSIWYG → Markdown: convert Plate JSON to markdown
      if (contentJson) {
        setContent(markdownFrom(contentJson))
      }
    }

    setEditorMode(newMode)
  }, [editorMode, content, contentJson])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        save()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [save])

  // Drag-to-resize for help panel
  const startDrag = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isDragging.current = true
    const startX = e.clientX
    const startWidth = helpPanelWidth

    const onMouseMove = (ev: MouseEvent) => {
      if (!isDragging.current) return
      const delta = startX - ev.clientX
      const newWidth = Math.max(280, Math.min(600, startWidth + delta))
      setHelpPanelWidth(newWidth)
    }
    const onMouseUp = () => {
      isDragging.current = false
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }, [helpPanelWidth])

  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    const diffHrs = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMin < 1) return 'gerade eben'
    if (diffMin < 60) return `vor ${diffMin} Min.`
    if (diffHrs < 24) return `vor ${diffHrs} Std.`
    if (diffDays < 7) return `vor ${diffDays} Tag${diffDays > 1 ? 'en' : ''}`
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-2 border-brand-accent border-t-transparent rounded-full" />
      </div>
    )
  }

  if (error && !page) {
    return (
      <div className="text-center py-20">
        <p className="text-red-600 mb-4">{error}</p>
        <Link href="/admin/content" className="btn-secondary text-sm">
          Zurück zur Übersicht
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)]">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-4 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/admin/content"
            className="text-brand-text-muted hover:text-brand-text transition-colors flex-shrink-0"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
          </Link>
          <div className="min-w-0">
            <h1 className="text-lg font-display font-bold text-brand-text truncate">
              {page?.slug}
            </h1>
            <div className="flex items-center gap-2 text-xs text-brand-text-muted">
              <span>Zuletzt gespeichert: {page?.updatedAt ? new Date(page.updatedAt).toLocaleString('de-DE') : '---'}</span>
              {path && (
                <a
                  href={path}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-accent hover:underline font-mono"
                >
                  {path}
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Draft/Publish toggle */}
          <button
            onClick={() => setIsPublished(!isPublished)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
              isPublished
                ? 'bg-brand-primary-light/20 text-brand-accent'
                : 'bg-yellow-100 text-yellow-800'
            }`}
          >
            {isPublished ? 'Veröffentlicht' : 'Entwurf'}
          </button>

          {/* SEO generate button */}
          <button
            onClick={generateSeo}
            disabled={generating}
            className="px-3 py-1.5 text-xs font-medium rounded-full bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            <SparklesIcon className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`} />
            {generating ? 'Generiert...' : 'SEO generieren'}
          </button>

          {/* Image picker */}
          <button
            onClick={() => setShowMediaPicker(true)}
            className="px-3 py-1.5 text-xs font-medium rounded-full bg-brand-bg-dark text-brand-text-muted hover:text-brand-text transition-colors"
          >
            Bild
          </button>

          {/* 3-way editor mode toggle */}
          <div className="flex items-center bg-brand-bg-dark rounded-full p-0.5">
            <button
              onClick={() => switchEditorMode('markdown')}
              className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${
                editorMode === 'markdown' ? 'bg-brand-surface text-brand-text shadow-sm' : 'text-brand-text-muted hover:text-brand-text'
              }`}
            >
              Markdown
            </button>
            <button
              onClick={() => switchEditorMode('wysiwyg')}
              className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${
                editorMode === 'wysiwyg' ? 'bg-brand-surface text-brand-text shadow-sm' : 'text-brand-text-muted hover:text-brand-text'
              }`}
            >
              WYSIWYG
            </button>
            <button
              onClick={() => switchEditorMode('preview')}
              className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${
                editorMode === 'preview' ? 'bg-brand-surface text-brand-text shadow-sm' : 'text-brand-text-muted hover:text-brand-text'
              }`}
            >
              Vorschau
            </button>
          </div>

          {/* Versions button */}
          <button
            onClick={toggleVersions}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors inline-flex items-center gap-1.5 ${
              showVersions
                ? 'bg-brand-accent/10 text-brand-accent'
                : 'bg-brand-bg-dark text-brand-text-muted hover:text-brand-text'
            }`}
          >
            <ClockIcon className="w-3.5 h-3.5" />
            Versionen
          </button>

          {/* Save button */}
          <button
            onClick={save}
            disabled={saving}
            className="btn-primary text-sm !py-1.5 !px-4"
          >
            {saving ? 'Speichern...' : saved ? 'Gespeichert!' : 'Speichern'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm px-4 py-2 rounded-lg mb-4 flex-shrink-0">
          {error}
        </div>
      )}

      {/* Metadata fields (collapsible) */}
      <div className="glass rounded-xl mb-4 flex-shrink-0 overflow-hidden">
        <button
          type="button"
          onClick={() => setShowMeta(!showMeta)}
          className="w-full flex items-center justify-between px-4 py-2.5 text-xs group hover:bg-black/[0.02] transition-colors"
        >
          <span className="font-medium text-brand-text-muted group-hover:text-brand-text transition-colors flex items-center gap-2">
            Seiteneinstellungen
            {!showMeta && title && (
              <span className="text-[10px] text-brand-text-muted/60 font-normal truncate max-w-[300px]">
                — {title}
              </span>
            )}
          </span>
          <ChevronDownIcon className={`w-3.5 h-3.5 text-brand-text-muted transition-transform duration-200 ${showMeta ? 'rotate-180' : ''}`} />
        </button>

        {showMeta && (
        <div className="px-4 pb-4 animate-fade-in">
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="flex items-center gap-2 text-xs font-medium text-brand-text-muted mb-1">
              Titel
              <AiImproveButton value={title} onImprove={setTitle} fieldType="title" context={page?.slug} />
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input-glass w-full text-sm"
            />
          </div>
          <div>
            <label className="flex items-center gap-2 text-xs font-medium text-brand-text-muted mb-1">
              Meta-Beschreibung
              <AiImproveButton value={metaDescription} onImprove={setMetaDescription} fieldType="description" context={page?.slug} />
            </label>
            <input
              type="text"
              value={metaDescription}
              onChange={(e) => setMetaDescription(e.target.value)}
              className="input-glass w-full text-sm"
              placeholder="SEO-Beschreibung..."
            />
          </div>
          <div>
            <label className="flex items-center gap-2 text-xs font-medium text-brand-text-muted mb-1">
              Keywords (kommagetrennt)
              <AiImproveButton value={metaKeywords} onImprove={setMetaKeywords} fieldType="keywords" context={page?.slug} />
            </label>
            <input
              type="text"
              value={metaKeywords}
              onChange={(e) => setMetaKeywords(e.target.value)}
              className="input-glass w-full text-sm"
              placeholder="Keyword1, Keyword2, ..."
            />
          </div>
        </div>

        {/* SEO Section (collapsible) */}
        {seoResult && (
          <div className="mt-3 pt-3 border-t border-brand-border">
            <button
              type="button"
              onClick={() => setShowSeo(!showSeo)}
              className="w-full flex items-center justify-between text-xs group"
            >
              <span className="font-medium text-brand-text-muted group-hover:text-brand-text transition-colors flex items-center gap-1.5">
                <SparklesIcon className="w-3.5 h-3.5 text-purple-500" />
                Generierte SEO-Daten
              </span>
              <ChevronDownIcon className={`w-3.5 h-3.5 text-brand-text-muted transition-transform duration-200 ${showSeo ? 'rotate-180' : ''}`} />
            </button>

            {showSeo && (
              <div className="mt-3 space-y-3 animate-fade-in">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-brand-text-muted">Meta-Titel</label>
                    <span className={`text-[10px] ${seoResult.metaTitle.length > 60 ? 'text-red-500' : 'text-brand-text-muted'}`}>
                      {seoResult.metaTitle.length}/60
                    </span>
                  </div>
                  <input
                    type="text"
                    value={seoResult.metaTitle}
                    onChange={(e) => setSeoResult({ ...seoResult, metaTitle: e.target.value })}
                    className="input-glass w-full text-sm"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-brand-text-muted">Meta-Beschreibung</label>
                    <span className={`text-[10px] ${seoResult.metaDescription.length > 155 ? 'text-red-500' : 'text-brand-text-muted'}`}>
                      {seoResult.metaDescription.length}/155
                    </span>
                  </div>
                  <textarea
                    value={seoResult.metaDescription}
                    onChange={(e) => setSeoResult({ ...seoResult, metaDescription: e.target.value })}
                    className="input-glass w-full text-sm resize-none"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-brand-text-muted mb-1">Keywords</label>
                  <div className="flex flex-wrap gap-1.5">
                    {seoResult.metaKeywords.map((kw, i) => (
                      <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-brand-bg-dark rounded-full text-brand-text">
                        {kw}
                        <button
                          onClick={() => setSeoResult({ ...seoResult, metaKeywords: seoResult.metaKeywords.filter((_, j) => j !== i) })}
                          className="text-brand-text-muted hover:text-red-500 transition-colors"
                        >
                          <XMarkIcon className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
                {seoResult.faqItems && seoResult.faqItems.length > 0 && (
                  <div>
                    <label className="block text-xs font-medium text-brand-text-muted mb-1">
                      FAQ-Einträge ({seoResult.faqItems.length})
                    </label>
                    <div className="space-y-2">
                      {seoResult.faqItems.map((faq, i) => (
                        <div key={i} className="bg-brand-bg-dark rounded-lg p-2.5 relative group/faqpreview">
                          <button
                            type="button"
                            onClick={() => setSeoResult({ ...seoResult, faqItems: seoResult.faqItems.filter((_, j) => j !== i) })}
                            className="absolute top-2 right-2 text-brand-text-muted hover:text-red-500 transition-colors opacity-0 group-hover/faqpreview:opacity-100"
                          >
                            <XMarkIcon className="w-3 h-3" />
                          </button>
                          <input
                            type="text"
                            value={faq.question}
                            onChange={(e) => {
                              const updated = [...seoResult.faqItems]
                              updated[i] = { ...updated[i], question: e.target.value }
                              setSeoResult({ ...seoResult, faqItems: updated })
                            }}
                            className="w-full text-sm font-medium text-brand-text bg-transparent border-none focus:outline-none mb-1 pr-6"
                          />
                          <textarea
                            value={faq.answer}
                            onChange={(e) => {
                              const updated = [...seoResult.faqItems]
                              updated[i] = { ...updated[i], answer: e.target.value }
                              setSeoResult({ ...seoResult, faqItems: updated })
                            }}
                            className="w-full text-xs text-brand-text-muted bg-transparent border-none focus:outline-none resize-none"
                            rows={2}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2 pt-2 border-t border-brand-border">
                  <button onClick={applySeoResult} className="btn-primary text-xs !py-1.5 !px-4">
                    Übernehmen
                  </button>
                  <button onClick={() => setSeoResult(null)} className="btn-secondary text-xs !py-1.5 !px-4">
                    Verwerfen
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* FAQ Section (collapsible) */}
        {faqSchema.length > 0 && (
          <div className="mt-3 pt-3 border-t border-brand-border">
            <button
              type="button"
              onClick={() => setShowFaq(!showFaq)}
              className="w-full flex items-center justify-between text-xs group"
            >
              <span className="font-medium text-brand-text-muted group-hover:text-brand-text transition-colors flex items-center gap-1.5">
                <SparklesIcon className="w-3.5 h-3.5 text-purple-500" />
                {faqSchema.length} FAQ-Einträge (JSON-LD für Google)
              </span>
              <ChevronDownIcon className={`w-3.5 h-3.5 text-brand-text-muted transition-transform duration-200 ${showFaq ? 'rotate-180' : ''}`} />
            </button>
            {showFaq && (
              <div className="mt-3 space-y-2 animate-fade-in">
                {faqSchema.map((faq, i) => (
                  <div key={i} className="bg-brand-bg-dark rounded-lg p-3 relative group/faq">
                    <button
                      type="button"
                      onClick={() => setFaqSchema(faqSchema.filter((_, j) => j !== i))}
                      className="absolute top-2 right-2 text-brand-text-muted hover:text-red-500 transition-colors opacity-0 group-hover/faq:opacity-100"
                    >
                      <XMarkIcon className="w-3.5 h-3.5" />
                    </button>
                    <div className="flex items-center gap-1 mb-1 pr-6">
                      <input
                        type="text"
                        value={faq.question}
                        onChange={(e) => {
                          const updated = [...faqSchema]
                          updated[i] = { ...updated[i], question: e.target.value }
                          setFaqSchema(updated)
                        }}
                        className="flex-1 text-sm font-medium text-brand-text bg-transparent border-none focus:outline-none"
                        placeholder="Frage..."
                      />
                      <AiImproveButton
                        value={faq.question}
                        onImprove={(improved) => {
                          const updated = [...faqSchema]
                          updated[i] = { ...updated[i], question: improved }
                          setFaqSchema(updated)
                        }}
                        fieldType="faq-question"
                        context={title}
                      />
                    </div>
                    <div className="flex items-start gap-1">
                      <textarea
                        value={faq.answer}
                        onChange={(e) => {
                          const updated = [...faqSchema]
                          updated[i] = { ...updated[i], answer: e.target.value }
                          setFaqSchema(updated)
                        }}
                        className="flex-1 text-xs text-brand-text-muted bg-transparent border-none focus:outline-none resize-none"
                        rows={2}
                        placeholder="Antwort..."
                      />
                      <AiImproveButton
                        value={faq.answer}
                        onImprove={(improved) => {
                          const updated = [...faqSchema]
                          updated[i] = { ...updated[i], answer: improved }
                          setFaqSchema(updated)
                        }}
                        fieldType="faq-answer"
                        context={title}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Background image */}
        <div className="mt-4 pt-4 border-t border-brand-border">
          <label className="block text-xs font-medium text-brand-text-muted mb-2">
            Hintergrundbild
          </label>
          <div className="flex items-center gap-3">
            {backgroundImage ? (
              <div className="relative w-24 h-16 rounded-lg overflow-hidden bg-brand-bg-dark flex-shrink-0">
                <img src={backgroundImage} alt="Hintergrund" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-24 h-16 rounded-lg bg-brand-bg-dark flex items-center justify-center flex-shrink-0">
                <span className="text-[10px] text-brand-text-muted">Kein Bild</span>
              </div>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowBgPicker(true)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-brand-bg-dark text-brand-text-muted hover:text-brand-text transition-colors"
              >
                {backgroundImage ? 'Ändern' : 'Auswählen'}
              </button>
              {backgroundImage && (
                <button
                  type="button"
                  onClick={() => setBackgroundImage('')}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-brand-bg-dark text-red-500 hover:text-red-700 transition-colors"
                >
                  Entfernen
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Advanced Settings (collapsible) */}
        <div className="mt-4 pt-4 border-t border-brand-border">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full flex items-center justify-between text-xs group"
          >
            <span className="font-medium text-brand-text-muted group-hover:text-brand-text transition-colors">
              Erweiterte Einstellungen
            </span>
            <ChevronDownIcon className={`w-3.5 h-3.5 text-brand-text-muted transition-transform duration-200 ${showAdvanced ? 'rotate-180' : ''}`} />
          </button>

          {showAdvanced && (
            <div className="mt-3 space-y-4 animate-fade-in">
              {/* URL Path */}
              <div>
                <label className="block text-xs font-medium text-brand-text-muted mb-1">
                  URL-Pfad
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={path}
                    onChange={(e) => setPath(e.target.value)}
                    className="input-glass w-full text-sm font-mono"
                    placeholder="/pfad/zur/seite"
                  />
                  {path && (
                    <a
                      href={path}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-brand-accent hover:underline whitespace-nowrap"
                    >
                      Öffnen
                    </a>
                  )}
                </div>
              </div>

              {/* Menu Position */}
              <div>
                <label className="block text-xs font-medium text-brand-text-muted mb-2">
                  Menü-Position
                </label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-xs text-brand-text cursor-pointer">
                    <input
                      type="checkbox"
                      checked={inHeader}
                      onChange={(e) => {
                        setInHeader(e.target.checked)
                        toggleMenu('header', e.target.checked)
                      }}
                      className="rounded border-gray-300 text-brand-accent focus:ring-brand-accent"
                    />
                    Im Hauptmenü anzeigen
                  </label>
                  <label className="flex items-center gap-2 text-xs text-brand-text cursor-pointer">
                    <input
                      type="checkbox"
                      checked={inFooter}
                      onChange={(e) => {
                        setInFooter(e.target.checked)
                        toggleMenu('footer', e.target.checked)
                      }}
                      className="rounded border-gray-300 text-brand-accent focus:ring-brand-accent"
                    />
                    Im Footer anzeigen
                  </label>
                </div>
              </div>

              {/* Parent Pages */}
              {allPages.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-brand-text-muted mb-1">
                    Übergeordnete Seiten
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {allPages.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setParentIds((prev) =>
                            prev.includes(p.id) ? prev.filter((id) => id !== p.id) : [...prev, p.id]
                          )
                        }}
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

              {/* CTA Section */}
              <div>
                <label className="flex items-center gap-2 text-xs font-medium text-brand-text-muted mb-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!ctaSource}
                    onChange={(e) => {
                      if (!e.target.checked) {
                        setCtaSource('')
                        setCtaTitle('')
                        setCtaSubtitle('')
                      } else {
                        setCtaSource(page?.slug || 'kontakt')
                      }
                    }}
                    className="rounded border-gray-300 text-brand-accent focus:ring-brand-accent"
                  />
                  Kontaktformular anzeigen
                </label>
                {ctaSource && (
                  <div className="grid sm:grid-cols-3 gap-3 ml-5">
                    <div>
                      <label className="block text-[10px] text-brand-text-muted mb-0.5">Source</label>
                      <input
                        type="text"
                        value={ctaSource}
                        onChange={(e) => setCtaSource(e.target.value)}
                        className="input-glass w-full text-xs"
                      />
                    </div>
                    <div>
                      <label className="flex items-center gap-1.5 text-[10px] text-brand-text-muted mb-0.5">
                        Titel
                        <AiImproveButton value={ctaTitle} onImprove={setCtaTitle} fieldType="cta" context={title} />
                      </label>
                      <input
                        type="text"
                        value={ctaTitle}
                        onChange={(e) => setCtaTitle(e.target.value)}
                        className="input-glass w-full text-xs"
                        placeholder="Kontaktieren Sie uns"
                      />
                    </div>
                    <div>
                      <label className="flex items-center gap-1.5 text-[10px] text-brand-text-muted mb-0.5">
                        Untertitel
                        <AiImproveButton value={ctaSubtitle} onImprove={setCtaSubtitle} fieldType="cta" context={title} />
                      </label>
                      <input
                        type="text"
                        value={ctaSubtitle}
                        onChange={(e) => setCtaSubtitle(e.target.value)}
                        className="input-glass w-full text-xs"
                        placeholder="Wir freuen uns auf Sie..."
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* noIndex */}
              <label className="flex items-center gap-2 text-xs text-brand-text cursor-pointer">
                <input
                  type="checkbox"
                  checked={noIndex}
                  onChange={(e) => setNoIndex(e.target.checked)}
                  className="rounded border-gray-300 text-brand-accent focus:ring-brand-accent"
                />
                Nicht indexieren (noindex)
              </label>

              {/* Delete page */}
              <div className="pt-3 border-t border-brand-border">
                <button
                  type="button"
                  onClick={() => setShowDeleteDialog(true)}
                  className="px-4 py-2 text-xs font-medium rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                >
                  Seite löschen
                </button>
              </div>
            </div>
          )}
        </div>
        </div>
        )}
      </div>

      {/* Editor / Preview + Help Side Panel */}
      <div ref={containerRef} className="flex-1 min-h-0 flex gap-0">
        {/* Editor / Preview */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex-1 min-h-0">
            {editorMode === 'preview' ? (
              <div className="glass rounded-xl p-6 sm:p-8 h-full overflow-y-auto">
                <article>
                  <MarkdownContent content={content} />
                </article>
              </div>
            ) : editorMode === 'wysiwyg' ? (
              <div className="h-full">
                {contentJson && (
                  <PlateEditor
                    initialValue={contentJson}
                    onChange={(value) => setContentJson(value)}
                    onInsertImage={() => setShowMediaPicker(true)}
                    insertImageRef={plateInsertImageRef}
                  />
                )}
              </div>
            ) : (
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full h-full glass rounded-xl p-4 sm:p-6 font-mono text-sm text-brand-text placeholder-brand-text-muted/50 resize-none focus:outline-none focus:ring-2 focus:ring-brand-accent/30"
                placeholder="Markdown-Inhalt hier eingeben..."
                spellCheck={false}
              />
            )}
          </div>

          {/* Keyboard shortcut hint */}
          <div className="mt-2 flex items-center gap-2 text-xs text-brand-text-muted flex-shrink-0">
            <AiImproveButton value={content} onImprove={setContent} fieldType="content" context={title} />
            <span>
              <kbd className="px-1.5 py-0.5 bg-brand-bg-dark rounded text-[10px]">Cmd+S</kbd> zum Speichern
            </span>
            <span>|</span>
            <button
              type="button"
              onClick={() => setShowHelp(!showHelp)}
              className={`inline-flex items-center gap-1 transition-colors ${showHelp ? 'text-brand-accent' : 'hover:text-brand-text'}`}
            >
              <BookOpenIcon className="w-3.5 h-3.5" />
              Formatierungshilfe
            </button>
          </div>
        </div>

        {/* Resizable Help Side Panel */}
        {showHelp && (
          <>
            {/* Drag handle */}
            <div
              onMouseDown={startDrag}
              className="w-2 flex-shrink-0 cursor-col-resize group flex items-center justify-center hover:bg-brand-accent/10 rounded transition-colors"
            >
              <div className="w-0.5 h-8 bg-brand-border group-hover:bg-brand-accent/40 rounded-full transition-colors" />
            </div>

            {/* Help panel */}
            <div
              style={{ width: helpPanelWidth }}
              className="flex-shrink-0 glass rounded-xl overflow-hidden flex flex-col animate-fade-in"
            >
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-brand-border flex-shrink-0">
                <span className="text-xs font-semibold text-brand-text flex items-center gap-1.5">
                  <BookOpenIcon className="w-3.5 h-3.5" />
                  Formatierungshilfe
                </span>
                <button
                  type="button"
                  onClick={() => setShowHelp(false)}
                  className="text-brand-text-muted hover:text-brand-text transition-colors"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs text-brand-text-muted">
                {/* Text Formatting */}
                <div>
                  <p className="font-semibold text-brand-text mb-1.5">Textformatierung</p>
                  <pre className="bg-brand-bg-dark rounded p-2 overflow-x-auto whitespace-pre leading-relaxed">{`**fett**
*kursiv*
~~durchgestrichen~~
\`inline code\``}</pre>
                </div>

                {/* Headings */}
                <div>
                  <p className="font-semibold text-brand-text mb-1.5">Überschriften</p>
                  <pre className="bg-brand-bg-dark rounded p-2 overflow-x-auto whitespace-pre leading-relaxed">{`# Überschrift 1
## Überschrift 2
### Überschrift 3
#### Überschrift 4`}</pre>
                </div>

                {/* Lists */}
                <div>
                  <p className="font-semibold text-brand-text mb-1.5">Listen</p>
                  <pre className="bg-brand-bg-dark rounded p-2 overflow-x-auto whitespace-pre leading-relaxed">{`- Aufzählung
- Weiterer Punkt
  - Verschachtelt

1. Nummeriert
2. Zweiter Punkt

- [ ] Aufgabe offen
- [x] Aufgabe erledigt`}</pre>
                </div>

                {/* Links & Images */}
                <div>
                  <p className="font-semibold text-brand-text mb-1.5">Links & Bilder</p>
                  <pre className="bg-brand-bg-dark rounded p-2 overflow-x-auto whitespace-pre leading-relaxed">{`[Linktext](https://url.de)
![Bildalt](url)
![Alt|600x400](url)  Breite+Höhe
![Alt|600](url)      Nur Breite`}</pre>
                </div>

                {/* Blockquotes & Code */}
                <div>
                  <p className="font-semibold text-brand-text mb-1.5">Zitate & Code</p>
                  <pre className="bg-brand-bg-dark rounded p-2 overflow-x-auto whitespace-pre leading-relaxed">{`> Blockzitat
> Mehrzeilig

\`\`\`javascript
// Code-Block mit Sprache
const x = 42
\`\`\``}</pre>
                </div>

                {/* Tables */}
                <div>
                  <p className="font-semibold text-brand-text mb-1.5">Tabellen</p>
                  <pre className="bg-brand-bg-dark rounded p-2 overflow-x-auto whitespace-pre leading-relaxed">{`| Kopf 1  | Kopf 2  |
| ------- | ------- |
| Zelle 1 | Zelle 2 |
| Zelle 3 | Zelle 4 |`}</pre>
                </div>

                {/* Horizontal Rule */}
                <div>
                  <p className="font-semibold text-brand-text mb-1.5">Trennlinie</p>
                  <pre className="bg-brand-bg-dark rounded p-2 overflow-x-auto whitespace-pre leading-relaxed">{`---`}</pre>
                </div>

                {/* --- Custom Directives Section --- */}
                <div className="pt-3 border-t border-brand-border">
                  <p className="font-semibold text-brand-accent text-[11px] uppercase tracking-wide mb-3">Eigene Blöcke</p>
                </div>

                {/* Hero Block */}
                <div>
                  <p className="font-semibold text-brand-text mb-1.5">Hero-Block</p>
                  <pre className="bg-brand-bg-dark rounded p-2 overflow-x-auto whitespace-pre leading-relaxed">{`:::hero
# Seitentitel
Untertitel-Text hier...
:::`}</pre>
                </div>

                {/* Hero Section */}
                <div>
                  <p className="font-semibold text-brand-text mb-1.5">Hero-Section</p>
                  <pre className="bg-brand-bg-dark rounded p-2 overflow-x-auto whitespace-pre leading-relaxed">{`:::hero-section
Animierte Hero mit Inhalt
:::`}</pre>
                </div>

                {/* Callout Boxes */}
                <div>
                  <p className="font-semibold text-brand-text mb-1.5">Callout-Boxen</p>
                  <pre className="bg-brand-bg-dark rounded p-2 overflow-x-auto whitespace-pre leading-relaxed">{`:::info
Hinweistext hier...
:::

:::warning
Warnungstext...
:::

:::tip
Tipp-Text...
:::

:::danger
Achtung! Wichtig...
:::`}</pre>
                </div>

                {/* Feature Box */}
                <div>
                  <p className="font-semibold text-brand-text mb-1.5">Feature-Box (Glas-Karte)</p>
                  <pre className="bg-brand-bg-dark rounded p-2 overflow-x-auto whitespace-pre leading-relaxed">{`:::box
Inhalt in einer Glas-Karte
:::`}</pre>
                </div>

                {/* Columns */}
                <div>
                  <p className="font-semibold text-brand-text mb-1.5">Spalten-Layout</p>
                  <pre className="bg-brand-bg-dark rounded p-2 overflow-x-auto whitespace-pre leading-relaxed">{`:::columns-2
Spalte 1 Inhalt
---
Spalte 2 Inhalt
:::

:::columns-3
Spalte 1
---
Spalte 2
---
Spalte 3
:::`}</pre>
                </div>

                {/* Columns + Boxes nested */}
                <div>
                  <p className="font-semibold text-brand-text mb-1.5">Spalten mit Boxen</p>
                  <pre className="bg-brand-bg-dark rounded p-2 overflow-x-auto whitespace-pre leading-relaxed">{`:::columns-2
:::box
Box in Spalte 1
:::
---
:::box
Box in Spalte 2
:::
:::`}</pre>
                </div>

                {/* Showcase */}
                <div>
                  <p className="font-semibold text-brand-text mb-1.5">Showcase-Block</p>
                  <pre className="bg-brand-bg-dark rounded p-2 overflow-x-auto whitespace-pre leading-relaxed">{`:::showcase
Showcase-Inhalt...
:::`}</pre>
                </div>

                {/* Grid */}
                <div>
                  <p className="font-semibold text-brand-text mb-1.5">Organisches Grid</p>
                  <pre className="bg-brand-bg-dark rounded p-2 overflow-x-auto whitespace-pre leading-relaxed">{`:::grid
Grid-Inhalt...
:::`}</pre>
                </div>

                {/* CV Timeline */}
                <div>
                  <p className="font-semibold text-brand-text mb-1.5">CV-Timeline</p>
                  <pre className="bg-brand-bg-dark rounded p-2 overflow-x-auto whitespace-pre leading-relaxed">{`:::cv-timeline
Timeline-Einträge...
:::`}</pre>
                </div>

                {/* Project Bento */}
                <div>
                  <p className="font-semibold text-brand-text mb-1.5">Projekt-Bento</p>
                  <pre className="bg-brand-bg-dark rounded p-2 overflow-x-auto whitespace-pre leading-relaxed">{`:::project-bento
Projekt-Inhalte...
:::`}</pre>
                </div>

                {/* Banner */}
                <div>
                  <p className="font-semibold text-brand-text mb-1.5">Banner</p>
                  <pre className="bg-brand-bg-dark rounded p-2 overflow-x-auto whitespace-pre leading-relaxed">{`:::banner
:::

:::banner-meinBanner
:::`}</pre>
                </div>

                {/* Slider */}
                <div>
                  <p className="font-semibold text-brand-text mb-1.5">Slider</p>
                  <pre className="bg-brand-bg-dark rounded p-2 overflow-x-auto whitespace-pre leading-relaxed">{`:::slider-meinSlider
:::`}</pre>
                </div>

                {/* Hero Slider */}
                <div>
                  <p className="font-semibold text-brand-text mb-1.5">Hero-Slider (Bilder)</p>
                  <pre className="bg-brand-bg-dark rounded p-2 overflow-x-auto whitespace-pre leading-relaxed">{`:::hero-slider-viewport
image: https://example.com/slide1.jpg
heading: Willkommen
description: Untertitel-Text
button: Mehr erfahren
href: /ueber-uns
---
image: https://example.com/slide2.jpg
heading: Zweite Folie
---
image: https://example.com/slide3.jpg
:::

Varianten:
hero-slider-viewport  100vh
hero-slider-full      60vh
hero-slider-fitted    50vh (zentriert)`}</pre>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Versions Slide-Over */}
      {showVersions && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/20" onClick={() => { setShowVersions(false); setPreviewVersion(null) }} />
          <div className="relative w-full max-w-lg bg-brand-surface shadow-2xl border-l border-brand-border flex flex-col animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-brand-border flex-shrink-0">
              <h2 className="text-sm font-semibold text-brand-text flex items-center gap-2">
                <ClockIcon className="w-4 h-4" />
                Versionsverlauf
              </h2>
              <button
                onClick={() => { setShowVersions(false); setPreviewVersion(null) }}
                className="text-brand-text-muted hover:text-brand-text transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {previewVersion ? (
              /* Version Preview */
              <div className="flex-1 flex flex-col min-h-0">
                <div className="px-5 py-3 border-b border-brand-border flex-shrink-0">
                  <div className="flex items-center justify-between mb-2">
                    <button
                      onClick={() => setPreviewVersion(null)}
                      className="text-xs text-brand-accent hover:underline"
                    >
                      Zurück zur Liste
                    </button>
                    <span className="text-[10px] text-brand-text-muted">
                      {formatRelativeTime(previewVersion.savedAt)}
                      {previewVersion.savedBy && ` von ${previewVersion.savedBy}`}
                    </span>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-brand-text-muted mb-0.5">Version</p>
                      <p className="text-sm font-medium text-brand-text truncate">{previewVersion.title}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-brand-text-muted mb-0.5">Aktuell</p>
                      <p className="text-sm font-medium text-brand-text truncate">{title}</p>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-4">
                  <div className="prose prose-sm max-w-none">
                    <MarkdownContent content={previewVersion.content} />
                  </div>
                </div>

                <div className="px-5 py-3 border-t border-brand-border flex-shrink-0 flex items-center gap-2">
                  <button
                    onClick={() => restoreVersion(previewVersion.id)}
                    disabled={restoringVersion}
                    className="btn-primary text-xs !py-1.5 !px-4"
                  >
                    {restoringVersion ? 'Wird wiederhergestellt...' : 'Wiederherstellen'}
                  </button>
                  <button
                    onClick={() => setPreviewVersion(null)}
                    className="btn-secondary text-xs !py-1.5 !px-4"
                  >
                    Abbrechen
                  </button>
                </div>
              </div>
            ) : (
              /* Version List */
              <div className="flex-1 overflow-y-auto">
                {loadingVersions ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin h-6 w-6 border-2 border-brand-accent border-t-transparent rounded-full" />
                  </div>
                ) : versions.length === 0 ? (
                  <div className="text-center py-12 text-sm text-brand-text-muted">
                    Noch keine Versionen vorhanden.
                    <br />
                    <span className="text-xs">Versionen werden beim Speichern automatisch erstellt.</span>
                  </div>
                ) : (
                  <div className="divide-y divide-brand-border">
                    {versions.map((v) => (
                      <button
                        key={v.id}
                        onClick={() => loadVersionDetail(v.id)}
                        className="w-full text-left px-5 py-3 hover:bg-brand-bg-dark/50 transition-colors group"
                      >
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs font-medium text-brand-text group-hover:text-brand-accent transition-colors truncate max-w-[60%]">
                            {v.title}
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                            v.isPublished
                              ? 'bg-brand-primary-light/20 text-brand-accent'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {v.isPublished ? 'Veröffentlicht' : 'Entwurf'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-brand-text-muted">
                          <span>{formatRelativeTime(v.savedAt)}</span>
                          {v.savedBy && (
                            <>
                              <span>·</span>
                              <span>{v.savedBy}</span>
                            </>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <MediaPickerDialog
        open={showMediaPicker}
        onClose={() => setShowMediaPicker(false)}
        onSelect={insertImage}
      />

      <MediaPickerDialog
        open={showBgPicker}
        onClose={() => setShowBgPicker(false)}
        onSelect={(url) => {
          setBackgroundImage(url)
          setShowBgPicker(false)
        }}
      />

      <PageDeleteDialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onDeleted={() => router.push('/admin/content')}
        page={page ? { id: page.id, title: page.title, path: page.path, menuItems: page.menuItems } : null}
      />
    </div>
  )
}
