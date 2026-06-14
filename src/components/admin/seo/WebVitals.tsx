'use client'

import { useState } from 'react'

interface VitalSummary {
  metric: string
  p75: number
  goodPct: number
  needsPct: number
  poorPct: number
  sampleCount: number
}

interface PerPageVital {
  path: string
  metrics: Record<string, { p75: number; rating: string }>
}

interface WebVitalsData {
  summary: VitalSummary[]
  perPage: PerPageVital[]
}

const METRIC_ORDER = ['LCP', 'FCP', 'INP', 'CLS', 'TTFB']

const THRESHOLDS: Record<string, { good: number; poor: number }> = {
  LCP: { good: 2.5, poor: 4.0 },
  FCP: { good: 1.8, poor: 3.0 },
  INP: { good: 200, poor: 500 },
  CLS: { good: 0.1, poor: 0.25 },
  TTFB: { good: 800, poor: 1800 },
}

function formatVitalValue(metric: string, value: number): string {
  switch (metric) {
    case 'LCP':
    case 'FCP':
      return `${(value / 1000).toFixed(1)}s`
    case 'TTFB':
      return `${Math.round(value)}ms`
    case 'INP':
      return `${Math.round(value)}ms`
    case 'CLS':
      return value.toFixed(2)
    default:
      return value.toFixed(1)
  }
}

function ratingColor(metric: string, p75: number): string {
  const t = THRESHOLDS[metric]
  if (!t) return 'bg-gray-400'
  // Normalize: LCP/FCP are stored in ms in our data, thresholds in seconds
  const val = (metric === 'LCP' || metric === 'FCP') ? p75 / 1000 : p75
  if (val <= t.good) return 'bg-green-500'
  if (val <= t.poor) return 'bg-yellow-400'
  return 'bg-red-500'
}

function ratingTextColor(rating: string): string {
  switch (rating) {
    case 'good': return 'text-green-600'
    case 'needs-improvement': return 'text-yellow-600'
    case 'poor': return 'text-red-500'
    default: return 'text-brand-text-light'
  }
}

export default function WebVitals({ data }: { data: WebVitalsData }) {
  const [expanded, setExpanded] = useState(false)

  const sortedSummary = METRIC_ORDER
    .map((m) => data.summary.find((s) => s.metric === m))
    .filter(Boolean) as VitalSummary[]

  if (sortedSummary.length === 0) {
    return (
      <div className="glass-card">
        <h2 className="text-lg font-semibold text-brand-text mb-4">Core Web Vitals</h2>
        <p className="text-sm text-brand-text-muted">Noch keine Web-Vital-Daten vorhanden.</p>
      </div>
    )
  }

  return (
    <div className="glass-card">
      <h2 className="text-lg font-semibold text-brand-text mb-4">Core Web Vitals</h2>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {sortedSummary.map((vital) => (
          <div key={vital.metric} className="glass rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-2.5 h-2.5 rounded-full ${ratingColor(vital.metric, vital.p75)}`} />
              <span className="text-xs font-medium text-brand-text-muted uppercase tracking-wide">
                {vital.metric}
              </span>
            </div>
            <p className="text-xl font-bold text-brand-text">
              {formatVitalValue(vital.metric, vital.p75)}
            </p>
            <p className="text-xs text-brand-text-muted mt-1">p75 ({vital.sampleCount} Proben)</p>

            {/* Distribution bar */}
            <div className="flex h-3 rounded-full overflow-hidden mt-3">
              {vital.goodPct > 0 && (
                <div
                  className="bg-green-500 transition-all"
                  style={{ width: `${vital.goodPct}%` }}
                  title={`Gut: ${vital.goodPct.toFixed(0)}%`}
                />
              )}
              {vital.needsPct > 0 && (
                <div
                  className="bg-yellow-400 transition-all"
                  style={{ width: `${vital.needsPct}%` }}
                  title={`Verbesserung noetig: ${vital.needsPct.toFixed(0)}%`}
                />
              )}
              {vital.poorPct > 0 && (
                <div
                  className="bg-red-500 transition-all"
                  style={{ width: `${vital.poorPct}%` }}
                  title={`Schlecht: ${vital.poorPct.toFixed(0)}%`}
                />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Per-page breakdown */}
      {data.perPage.length > 0 && (
        <div className="mt-6">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-2 text-sm font-medium text-brand-accent hover:text-brand-accent-light transition-colors"
          >
            <svg
              className={`w-4 h-4 transition-transform ${expanded ? 'rotate-90' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
            Details pro Seite
          </button>

          {expanded && (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-brand-border">
                    <th className="text-left p-2 text-xs font-medium text-brand-text-muted uppercase">Seite</th>
                    {METRIC_ORDER.map((m) => (
                      <th key={m} className="text-right p-2 text-xs font-medium text-brand-text-muted uppercase">{m}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.perPage.map((page) => (
                    <tr key={page.path} className="border-b border-gray-100">
                      <td className="p-2 text-brand-text truncate max-w-[200px]" title={page.path}>
                        {page.path}
                      </td>
                      {METRIC_ORDER.map((m) => {
                        const metric = page.metrics[m]
                        if (!metric) return <td key={m} className="p-2 text-right text-brand-text-muted">---</td>
                        return (
                          <td key={m} className={`p-2 text-right font-medium ${ratingTextColor(metric.rating)}`}>
                            {formatVitalValue(m, metric.p75)}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
