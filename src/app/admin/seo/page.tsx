'use client'

import { useState, useEffect, useCallback } from 'react'
import KpiCards from '@/components/admin/seo/KpiCards'
import WebVitals from '@/components/admin/seo/WebVitals'
import ContentPerformance from '@/components/admin/seo/ContentPerformance'
import TrafficAnalysis from '@/components/admin/seo/TrafficAnalysis'
import SeoHealthScore from '@/components/admin/seo/SeoHealthScore'

interface DashboardData {
  period: { start: string; end: string; days: number }
  kpi: {
    pageViews: { current: number; previous: number; trend: number | null }
    avgTimeOnPage: { current: number; previous: number; trend: number | null }
    engagementRate: { current: number; previous: number; trend: number | null }
    vitalsPassRate: { current: number; previous: number; trend: number | null }
  }
  contentPerformance: Array<{
    path: string
    views: number
    avgScroll: number
    avgTime: number
    scroll100Rate: number
    engagementScore: number
    warnings: string[]
  }>
  webVitals: {
    summary: Array<{
      metric: string
      p75: number
      goodPct: number
      needsPct: number
      poorPct: number
      sampleCount: number
    }>
    perPage: Array<{
      path: string
      metrics: Record<string, { p75: number; rating: string }>
    }>
  }
  traffic: {
    devices: Array<{ device: string; count: number; pct: number }>
    referrers: Array<{ category: string; count: number; pct: number }>
    countries: Array<{ country: string; count: number; pct: number }>
    daily: Array<{ date: string; views: number }>
  }
  seoHealth: {
    siteAverage: number
    pages: Array<{
      slug: string
      title: string
      score: number
      checks: Array<{ name: string; passed: boolean; maxPoints: number; hint: string }>
    }>
  }
}

const PERIODS = [
  { label: '7 Tage', value: '7d' },
  { label: '30 Tage', value: '30d' },
  { label: '90 Tage', value: '90d' },
] as const

type Period = typeof PERIODS[number]['value']

export default function AdminSEOPage() {
  const [period, setPeriod] = useState<Period>('30d')
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async (p: Period) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/seo/dashboard?period=${p}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `Fehler beim Laden (${res.status})`)
      }
      const json: DashboardData = await res.json()
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData(period)
  }, [period, fetchData])

  return (
    <div>
      {/* Header with period selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-display font-bold text-brand-text">
          SEO & Analytics
        </h1>
        <div className="flex gap-1 p-1 glass rounded-xl">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                period === p.value
                  ? 'bg-brand-accent text-white shadow-sm'
                  : 'text-brand-text-muted hover:text-brand-text hover:bg-brand-bg-dark'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <svg className="w-8 h-8 text-brand-accent animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-sm text-brand-text-muted">Dashboard wird geladen...</p>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="glass-card border-red-200 bg-red-50/50">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-red-700">Fehler beim Laden des Dashboards</p>
              <p className="text-sm text-red-600 mt-1">{error}</p>
              <button
                onClick={() => fetchData(period)}
                className="mt-3 text-sm font-medium text-red-700 hover:text-red-800 underline"
              >
                Erneut versuchen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dashboard content */}
      {data && !loading && (
        <div className="space-y-6">
          <KpiCards data={data.kpi} />
          <WebVitals data={data.webVitals} />
          <ContentPerformance data={data.contentPerformance} />
          <TrafficAnalysis data={data.traffic} />
          <SeoHealthScore data={data.seoHealth} />
        </div>
      )}
    </div>
  )
}
