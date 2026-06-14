'use client'

import { useState } from 'react'

interface Check {
  name: string
  passed: boolean
  maxPoints: number
  hint: string
}

interface PageHealth {
  slug: string
  title: string
  score: number
  checks: Check[]
}

interface SeoHealthData {
  siteAverage: number
  pages: PageHealth[]
}

function scoreColor(score: number): string {
  if (score >= 80) return 'text-green-600'
  if (score >= 50) return 'text-yellow-600'
  return 'text-red-500'
}

function scoreBgColor(score: number): string {
  if (score >= 80) return 'bg-green-100 text-green-700'
  if (score >= 50) return 'bg-yellow-100 text-yellow-700'
  return 'bg-red-100 text-red-700'
}

function scoreBarColor(score: number): string {
  if (score >= 80) return 'bg-green-500'
  if (score >= 50) return 'bg-yellow-400'
  return 'bg-red-500'
}

function PageRow({ page }: { page: PageHealth }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <>
      <tr
        className="border-b border-gray-100 hover:bg-brand-bg-dark transition-colors cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <td className="p-2">
          <div className="flex items-center gap-2">
            <svg
              className={`w-3.5 h-3.5 text-brand-text-muted transition-transform flex-shrink-0 ${expanded ? 'rotate-90' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
            <span className="text-sm text-brand-text truncate" title={page.title}>
              {page.title}
            </span>
          </div>
        </td>
        <td className="p-2 w-48">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 rounded-full bg-gray-200 overflow-hidden">
              <div
                className={`h-full rounded-full ${scoreBarColor(page.score)} transition-all`}
                style={{ width: `${page.score}%` }}
              />
            </div>
            <span className={`text-sm font-semibold w-8 text-right ${scoreColor(page.score)}`}>
              {page.score}
            </span>
          </div>
        </td>
        <td className="p-2 text-right">
          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${scoreBgColor(page.score)}`}>
            {page.score >= 80 ? 'Gut' : page.score >= 50 ? 'OK' : 'Schlecht'}
          </span>
        </td>
      </tr>
      {expanded && (
        <tr className="border-b border-gray-100">
          <td colSpan={3} className="p-2 pl-10">
            <div className="grid sm:grid-cols-2 gap-1 py-2">
              {page.checks.map((check) => (
                <div key={check.name} className="flex items-start gap-2 text-xs py-1">
                  {check.passed ? (
                    <svg className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                  <div>
                    <span className={check.passed ? 'text-brand-text' : 'text-brand-text-muted'}>
                      {check.name} ({check.maxPoints}P)
                    </span>
                    {!check.passed && check.hint && (
                      <p className="text-brand-text-muted mt-0.5">{check.hint}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

export default function SeoHealthScore({ data }: { data: SeoHealthData }) {
  if (data.pages.length === 0) {
    return (
      <div className="glass-card">
        <h2 className="text-lg font-semibold text-brand-text mb-4">SEO-Gesundheit</h2>
        <p className="text-sm text-brand-text-muted">Keine Seiten vorhanden.</p>
      </div>
    )
  }

  return (
    <div className="glass-card">
      <h2 className="text-lg font-semibold text-brand-text mb-4">SEO-Gesundheit</h2>

      {/* Site-wide average */}
      <div className="flex items-center gap-4 mb-6 p-4 glass rounded-xl">
        <div className="text-center">
          <p className={`text-4xl font-bold ${scoreColor(data.siteAverage)}`}>
            {Math.round(data.siteAverage)}
          </p>
          <p className="text-xs text-brand-text-muted mt-1">Durchschnitt</p>
        </div>
        <div className="flex-1">
          <div className="h-3 rounded-full bg-gray-200 overflow-hidden">
            <div
              className={`h-full rounded-full ${scoreBarColor(data.siteAverage)} transition-all`}
              style={{ width: `${data.siteAverage}%` }}
            />
          </div>
          <p className="text-xs text-brand-text-muted mt-1">
            {data.pages.length} Seiten analysiert
          </p>
        </div>
      </div>

      {/* Per-page table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-brand-border">
              <th className="text-left p-2 text-xs font-medium text-brand-text-muted uppercase">Seite</th>
              <th className="p-2 text-xs font-medium text-brand-text-muted uppercase text-left">Score</th>
              <th className="text-right p-2 text-xs font-medium text-brand-text-muted uppercase">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.pages
              .sort((a, b) => a.score - b.score)
              .map((page) => (
                <PageRow key={page.slug} page={page} />
              ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
