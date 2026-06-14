'use client'

import { useState } from 'react'
import Link from 'next/link'
import PageCreateDialog from './PageCreateDialog'
import PageDeleteDialog from './PageDeleteDialog'

function simpleHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0
  }
  return hash.toString(36)
}

interface PageItem {
  id: string
  slug: string
  title: string
  path: string | null
  metaDescription: string | null
  isPublished: boolean
  isFeatured: boolean
  noIndex: boolean
  ctaSource: string | null
  seoData: unknown
  faqSchema: unknown
  content: string
  contentHash: string | null
  updatedAt: string
  menuItems: { id: string; location: string }[]
  parentLinks: { parentId: string }[]
  childLinks: { childId: string }[]
}

interface SeoGenerationResult {
  metaTitle: string
  metaDescription: string
  metaKeywords: string[]
  faqItems: { question: string; answer: string }[]
}

export default function ContentListClient({ pages: initialPages }: { pages: PageItem[] }) {
  const [pages, setPages] = useState(initialPages)
  const [generatingId, setGeneratingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [deletePage, setDeletePage] = useState<PageItem | null>(null)

  async function generateSeo(page: PageItem) {
    setGeneratingId(page.id)
    setError(null)

    try {
      const res = await fetch('/api/admin/ai/generate-seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: page.content,
          slug: page.slug,
          title: page.title,
          currentMeta: {
            metaTitle: page.title,
            metaDescription: page.metaDescription || undefined,
          },
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'SEO-Generierung fehlgeschlagen')
      }

      const seoResult: SeoGenerationResult = await res.json()

      const saveRes = await fetch(`/api/admin/pages/${page.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metaTitle: seoResult.metaTitle,
          metaDescription: seoResult.metaDescription,
          metaKeywords: seoResult.metaKeywords.join(', '),
          seoData: seoResult,
          faqSchema: seoResult.faqItems.length > 0 ? seoResult.faqItems : undefined,
        }),
      })

      if (!saveRes.ok) {
        throw new Error('Fehler beim Speichern der SEO-Daten')
      }

      setPages((prev) =>
        prev.map((p) =>
          p.id === page.id
            ? { ...p, seoData: seoResult, faqSchema: seoResult.faqItems, metaDescription: seoResult.metaDescription, contentHash: simpleHash(page.content) }
            : p
        )
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'SEO-Generierung fehlgeschlagen')
    } finally {
      setGeneratingId(null)
    }
  }

  async function toggleFeatured(page: PageItem) {
    const prev = pages
    setPages((ps) => ps.map((p) => p.id === page.id ? { ...p, isFeatured: !p.isFeatured } : p))
    try {
      const res = await fetch(`/api/admin/pages/${page.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFeatured: !page.isFeatured }),
      })
      if (!res.ok) throw new Error('Fehler')
    } catch {
      setPages(prev)
      setError('Featured-Status konnte nicht geändert werden')
    }
  }

  function handleDeleted() {
    if (deletePage) {
      setPages((prev) => prev.filter((p) => p.id !== deletePage.id))
    }
  }

  const headerMenuPages = pages.filter((p) => p.menuItems.some((m) => m.location === 'header'))
  const footerMenuPages = pages.filter((p) => p.menuItems.some((m) => m.location === 'footer'))

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-brand-text mb-1">
            Seiten verwalten
          </h1>
          <p className="text-sm text-brand-text-muted">
            Seiten erstellen, bearbeiten, löschen und veröffentlichen.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="btn-primary text-sm !py-2 !px-4 inline-flex items-center gap-1.5"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Neue Seite
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {pages.length === 0 ? (
        <div className="glass-card text-center py-12">
          <p className="text-brand-text-muted">
            Keine Seiten gefunden.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {pages.map((page) => {
            const hasSeo = !!page.seoData
            const currentHash = simpleHash(page.content)
            const isOutdated = hasSeo && page.contentHash !== currentHash
            const isGenerating = generatingId === page.id
            const needsSeo = !hasSeo || isOutdated
            const inHeader = page.menuItems.some((m) => m.location === 'header')
            const inFooter = page.menuItems.some((m) => m.location === 'footer')

            return (
              <div
                key={page.id}
                className="glass-card group hover:shadow-lg transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <Link
                    href={`/admin/content/${page.id}`}
                    className="min-w-0 flex-1"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                          hasSeo
                            ? isOutdated
                              ? 'bg-yellow-400'
                              : 'bg-green-500'
                            : 'bg-red-400'
                        }`}
                        title={
                          hasSeo
                            ? isOutdated
                              ? 'SEO-Daten veraltet — Inhalt wurde geändert'
                              : 'SEO-Daten aktuell'
                            : 'Keine SEO-Daten'
                        }
                      />
                      <h3 className="text-lg font-semibold text-brand-text group-hover:text-brand-accent transition-colors truncate">
                        {page.title}
                      </h3>
                    </div>
                    {page.metaDescription && (
                      <p className="text-sm text-brand-text-muted mt-1 line-clamp-1">
                        {page.metaDescription}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      {page.path && (
                        <span className="text-xs text-brand-text-muted font-mono">
                          {page.path}
                        </span>
                      )}
                      {!page.path && (
                        <span className="text-xs text-brand-text-muted">
                          /{page.slug}
                        </span>
                      )}
                      <span className="text-xs text-brand-text-muted">
                        {new Date(page.updatedAt).toLocaleDateString('de-DE')}
                      </span>
                      {inHeader && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded-full">
                          Header
                        </span>
                      )}
                      {inFooter && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-purple-50 text-purple-600 rounded-full">
                          Footer
                        </span>
                      )}
                      {page.noIndex && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-brand-bg-dark text-brand-text-muted rounded-full">
                          noindex
                        </span>
                      )}
                      {page.ctaSource && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-green-50 text-green-600 rounded-full">
                          CTA
                        </span>
                      )}
                    </div>
                  </Link>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Featured toggle */}
                    <button
                      onClick={(e) => { e.preventDefault(); toggleFeatured(page) }}
                      className="p-1.5 rounded-lg hover:bg-amber-50 transition-colors"
                      title={page.isFeatured ? 'Featured entfernen' : 'Als Featured markieren'}
                    >
                      {page.isFeatured ? (
                        <svg className="w-4 h-4 text-amber-500" viewBox="0 0 24 24" fill="currentColor">
                          <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 text-brand-text-muted hover:text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
                        </svg>
                      )}
                    </button>
                    {/* SEO generate/update button */}
                    {needsSeo && (
                      <button
                        onClick={() => generateSeo(page)}
                        disabled={isGenerating}
                        className={`px-3 py-1 text-xs font-medium rounded-full transition-colors inline-flex items-center gap-1.5 disabled:opacity-50 ${
                          isOutdated
                            ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                            : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                        }`}
                      >
                        {isGenerating ? (
                          <>
                            <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Generiert...
                          </>
                        ) : (
                          <>
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
                            </svg>
                            {isOutdated ? 'SEO aktualisieren' : 'SEO generieren'}
                          </>
                        )}
                      </button>
                    )}
                    <span
                      className={`px-3 py-1 text-xs rounded-full font-medium ${
                        page.isPublished
                          ? 'bg-brand-primary-light/15 text-brand-accent'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {page.isPublished ? 'Veröffentlicht' : 'Entwurf'}
                    </span>
                    {/* Delete button */}
                    <button
                      onClick={(e) => { e.preventDefault(); setDeletePage(page) }}
                      className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                      title="Seite löschen"
                    >
                      <svg className="w-4 h-4 text-brand-text-muted hover:text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                    </button>
                    <Link
                      href={`/admin/content/${page.id}`}
                      className="flex-shrink-0"
                    >
                      <svg
                        className="w-5 h-5 text-brand-text-muted group-hover:text-brand-accent transition-colors"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                      </svg>
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <PageCreateDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        pages={pages.map((p) => ({ id: p.id, title: p.title, path: p.path }))}
      />

      <PageDeleteDialog
        open={!!deletePage}
        onClose={() => setDeletePage(null)}
        onDeleted={handleDeleted}
        page={deletePage}
      />
    </div>
  )
}
