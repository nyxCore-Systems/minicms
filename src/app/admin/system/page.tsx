'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ServerStackIcon,
  CircleStackIcon,
  CloudIcon,
  ClockIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'

interface SystemStatus {
  tenant: { id: string; slug: string; name: string }
  db: {
    latencyMs: number
    version: string
    counts: Record<string, number>
  }
  env: {
    nodeEnv: string
    vercelEnv: string | null
    region: string | null
    gitSha: string | null
    gitBranch: string | null
  }
  cache: {
    sliderApiMaxAge: number
    staleWhileRevalidate: number
    note: string
  }
  timestamp: string
}

interface RevalidateLog {
  path: string
  message: string
  timestamp: string
}

const QUICK_PATHS = [
  { label: 'Homepage', path: '/' },
  { label: 'Slider API', path: '/api/sliders' },
  { label: 'Banner API', path: '/api/banners' },
  { label: 'Menu API', path: '/api/menu' },
  { label: 'Products API', path: '/api/products' },
  { label: 'Alle Haendler', path: '/haendler' },
  { label: 'Alle Produkte', path: '/produkte' },
]

const DB_COUNT_LABELS: Record<string, string> = {
  pages: 'Seiten',
  media: 'Medien',
  vendors: 'Haendler',
  products: 'Produkte',
  sliders: 'Slider',
  sliderItems: 'Slider-Elemente',
  leads: 'Leads',
  sections: 'Sektionen',
  categories: 'Kategorien',
  menuItems: 'Menuepunkte',
}

export default function SystemPage() {
  const [status, setStatus] = useState<SystemStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [purging, setPurging] = useState<string | null>(null)
  const [logs, setLogs] = useState<RevalidateLog[]>([])
  const [customPath, setCustomPath] = useState('')

  const fetchStatus = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/system')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setStatus(await res.json())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  async function revalidate(path: string) {
    setPurging(path)
    try {
      const res = await fetch('/api/admin/system', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'revalidate', path }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Fehler')
      setLogs((prev) => [{ path, message: data.message, timestamp: data.timestamp }, ...prev.slice(0, 19)])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Revalidieren')
    } finally {
      setPurging(null)
    }
  }

  async function revalidateAll() {
    setPurging('__all__')
    try {
      const res = await fetch('/api/admin/system', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'revalidate_all' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Fehler')
      setLogs((prev) => [{ path: '*', message: data.message, timestamp: data.timestamp }, ...prev.slice(0, 19)])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Revalidieren')
    } finally {
      setPurging(null)
    }
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-brand-text">System</h1>
          <p className="text-sm text-brand-text-muted mt-1">
            Datenbank, Cache und Deployment-Status
          </p>
        </div>
        <button
          onClick={fetchStatus}
          disabled={loading}
          className="btn-secondary flex items-center gap-2 text-sm"
        >
          <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Aktualisieren
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}

      {status && (
        <>
          {/* Status Cards Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* DB Status */}
            <div className="glass-card p-5 space-y-3">
              <div className="flex items-center gap-2">
                <CircleStackIcon className="w-5 h-5 text-brand-primary" />
                <h2 className="font-semibold text-brand-text">Datenbank</h2>
                <span className={`ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                  status.db.latencyMs < 200
                    ? 'bg-green-100 text-green-700'
                    : status.db.latencyMs < 500
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-red-100 text-red-700'
                }`}>
                  <CheckCircleIcon className="w-3.5 h-3.5" />
                  {status.db.latencyMs}ms
                </span>
              </div>
              <p className="text-xs text-brand-text-muted truncate" title={status.db.version}>
                {status.db.version.split(' ').slice(0, 2).join(' ')}
              </p>
              <div className="text-xs text-brand-text-muted">
                Tenant: <span className="font-mono text-brand-text">{status.tenant.slug}</span>
              </div>
            </div>

            {/* Environment */}
            <div className="glass-card p-5 space-y-3">
              <div className="flex items-center gap-2">
                <ServerStackIcon className="w-5 h-5 text-brand-primary" />
                <h2 className="font-semibold text-brand-text">Environment</h2>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-brand-text-muted">Env</span>
                  <span className="font-mono text-brand-text">
                    {status.env.vercelEnv || status.env.nodeEnv}
                  </span>
                </div>
                {status.env.region && (
                  <div className="flex justify-between">
                    <span className="text-brand-text-muted">Region</span>
                    <span className="font-mono text-brand-text">{status.env.region}</span>
                  </div>
                )}
                {status.env.gitSha && (
                  <div className="flex justify-between">
                    <span className="text-brand-text-muted">Commit</span>
                    <span className="font-mono text-brand-text">
                      {status.env.gitBranch}@{status.env.gitSha}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Cache Info */}
            <div className="glass-card p-5 space-y-3">
              <div className="flex items-center gap-2">
                <CloudIcon className="w-5 h-5 text-brand-primary" />
                <h2 className="font-semibold text-brand-text">Cache</h2>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-brand-text-muted">Slider API</span>
                  <span className="font-mono text-brand-text">
                    s-maxage={status.cache.sliderApiMaxAge}s
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-brand-text-muted">SWR</span>
                  <span className="font-mono text-brand-text">
                    {status.cache.staleWhileRevalidate}s
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-brand-text-muted">Abgerufen</span>
                  <span className="font-mono text-brand-text">
                    {formatTime(status.timestamp)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* DB Counts Table */}
          <div className="glass-card p-5">
            <h2 className="font-semibold text-brand-text mb-4 flex items-center gap-2">
              <CircleStackIcon className="w-5 h-5 text-brand-primary" />
              Datenbankinhalt
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {Object.entries(status.db.counts).map(([key, count]) => (
                <div key={key} className="text-center p-3 rounded-lg bg-brand-bg/50 border border-brand-border">
                  <div className="text-2xl font-bold text-brand-text">{count}</div>
                  <div className="text-xs text-brand-text-muted mt-1">{DB_COUNT_LABELS[key] || key}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Cache Purge */}
          <div className="glass-card p-5">
            <h2 className="font-semibold text-brand-text mb-4 flex items-center gap-2">
              <TrashIcon className="w-5 h-5 text-brand-primary" />
              Cache leeren
            </h2>
            <p className="text-sm text-brand-text-muted mb-4">
              Erzwingt eine Neugenerierung der Seite beim naechsten Aufruf. Nuetzlich wenn Aenderungen nicht sichtbar sind.
            </p>

            {/* Purge all */}
            <button
              onClick={revalidateAll}
              disabled={purging !== null}
              className="btn-primary flex items-center gap-2 text-sm mb-6"
            >
              {purging === '__all__' ? (
                <ArrowPathIcon className="w-4 h-4 animate-spin" />
              ) : (
                <TrashIcon className="w-4 h-4" />
              )}
              Gesamten Cache leeren
            </button>

            {/* Quick paths */}
            <div className="space-y-2 mb-6">
              <h3 className="text-sm font-medium text-brand-text">Einzelne Pfade</h3>
              <div className="flex flex-wrap gap-2">
                {QUICK_PATHS.map(({ label, path }) => (
                  <button
                    key={path}
                    onClick={() => revalidate(path)}
                    disabled={purging !== null}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      purging === path
                        ? 'bg-brand-primary/10 border-brand-primary text-brand-primary'
                        : 'bg-brand-surface border-brand-border text-brand-text hover:bg-brand-bg-dark'
                    }`}
                  >
                    {purging === path ? (
                      <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CloudIcon className="w-3.5 h-3.5" />
                    )}
                    {label}
                    <span className="font-mono text-brand-text-muted">{path}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom path */}
            <div className="flex gap-2">
              <input
                type="text"
                value={customPath}
                onChange={(e) => setCustomPath(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && customPath.trim()) {
                    revalidate(customPath.trim())
                    setCustomPath('')
                  }
                }}
                className="input-glass text-sm flex-1"
                placeholder="Pfad eingeben, z.B. /haendler/hand-und-werk"
              />
              <button
                onClick={() => {
                  if (customPath.trim()) {
                    revalidate(customPath.trim())
                    setCustomPath('')
                  }
                }}
                disabled={purging !== null || !customPath.trim()}
                className="btn-secondary text-sm"
              >
                Revalidieren
              </button>
            </div>
          </div>

          {/* Log */}
          {logs.length > 0 && (
            <div className="glass-card p-5">
              <h2 className="font-semibold text-brand-text mb-3 flex items-center gap-2">
                <ClockIcon className="w-5 h-5 text-brand-primary" />
                Letzte Aktionen
              </h2>
              <div className="space-y-1">
                {logs.map((log, i) => (
                  <div key={i} className="flex items-center gap-3 text-xs py-1.5 border-b border-brand-border last:border-0">
                    <CheckCircleIcon className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span className="font-mono text-brand-text-muted">{formatTime(log.timestamp)}</span>
                    <span className="text-brand-text">{log.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {loading && !status && (
        <div className="flex items-center justify-center py-20">
          <ArrowPathIcon className="w-8 h-8 animate-spin text-brand-text-muted" />
        </div>
      )}
    </div>
  )
}
