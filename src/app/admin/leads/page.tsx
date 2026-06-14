'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  TrashIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'

interface Lead {
  id: string
  name: string
  email: string
  phone: string | null
  company: string | null
  message: string | null
  source: string | null
  status: string
  createdAt: string
}

const STATUSES = ['new', 'contacted', 'qualified', 'converted', 'closed'] as const

const STATUS_LABELS: Record<string, string> = {
  new: 'Neu',
  contacted: 'Kontaktiert',
  qualified: 'Qualifiziert',
  converted: 'Konvertiert',
  closed: 'Geschlossen',
}

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-green-100/50 text-green-800',
  contacted: 'bg-blue-100/50 text-blue-800',
  qualified: 'bg-yellow-100/50 text-yellow-800',
  converted: 'bg-purple-100/50 text-purple-800',
  closed: 'bg-gray-100/50 text-gray-600',
}

export default function AdminLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/leads')
      if (!res.ok) throw new Error('Laden fehlgeschlagen')
      const data = await res.json()
      setLeads(data)
    } catch {
      setError('Leads konnten nicht geladen werden')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const statusCounts = leads.reduce<Record<string, number>>((acc, lead) => {
    acc[lead.status] = (acc[lead.status] || 0) + 1
    return acc
  }, {})

  const filtered = filterStatus === 'all'
    ? leads
    : leads.filter((l) => l.status === filterStatus)

  async function updateStatus(id: string, status: string) {
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/leads/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error('Fehler beim Aktualisieren')
      await fetchData()
    } catch {
      setError('Status konnte nicht aktualisiert werden')
    } finally {
      setSaving(false)
    }
  }

  async function deleteLead(id: string) {
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/leads/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Fehler beim Loschen')
      setDeleteConfirm(null)
      await fetchData()
    } catch {
      setError('Lead konnte nicht geloscht werden')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-2 border-brand-accent border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-brand-text">
            Leads ({leads.length})
          </h1>
          <p className="text-sm text-brand-text-muted mt-1">
            Anfragen und Kontakte verwalten
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl mb-4">
          {error}
          <button onClick={() => setError('')} className="ml-2 underline">
            Schliessen
          </button>
        </div>
      )}

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setFilterStatus('all')}
          className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
            filterStatus === 'all'
              ? 'bg-brand-accent text-white'
              : 'bg-brand-bg-dark text-brand-text-muted hover:bg-brand-bg-dark'
          }`}
        >
          Alle ({leads.length})
        </button>
        {STATUSES.map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              filterStatus === status
                ? 'bg-brand-accent text-white'
                : 'bg-brand-bg-dark text-brand-text-muted hover:bg-brand-bg-dark'
            }`}
          >
            {STATUS_LABELS[status]} ({statusCounts[status] || 0})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="glass-card text-center py-12">
          <p className="text-brand-text-muted">
            {leads.length === 0
              ? 'Noch keine Leads vorhanden.'
              : 'Keine Leads mit diesem Status.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((lead) => (
            <div key={lead.id} className="glass-card">
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-sm font-semibold text-brand-text">
                      {lead.name}
                    </span>
                    <span
                      className={`px-2 py-0.5 text-xs rounded-full ${
                        STATUS_COLORS[lead.status] || STATUS_COLORS.new
                      }`}
                    >
                      {STATUS_LABELS[lead.status] || lead.status}
                    </span>
                    {lead.source && (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-brand-accent/10 text-brand-accent">
                        {lead.source}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-brand-text-muted mb-1 flex-wrap">
                    <a href={`mailto:${lead.email}`} className="text-brand-accent hover:underline">
                      {lead.email}
                    </a>
                    {lead.phone && <span>{lead.phone}</span>}
                    {lead.company && <span>{lead.company}</span>}
                    <span>{new Date(lead.createdAt).toLocaleDateString('de-DE', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}</span>
                  </div>
                  {lead.message && (
                    <div>
                      <button
                        onClick={() => setExpandedId(expandedId === lead.id ? null : lead.id)}
                        className="text-xs text-brand-accent hover:underline"
                      >
                        {expandedId === lead.id ? 'Nachricht verbergen' : 'Nachricht anzeigen'}
                      </button>
                      {expandedId === lead.id && (
                        <p className="text-sm text-brand-text-muted mt-2 p-3 rounded-lg bg-brand-bg-dark whitespace-pre-wrap">
                          {lead.message}
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <select
                    value={lead.status}
                    onChange={(e) => updateStatus(lead.id, e.target.value)}
                    disabled={saving}
                    className="input-glass text-xs py-1 px-2"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                  {deleteConfirm === lead.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => deleteLead(lead.id)}
                        disabled={saving}
                        className="p-1.5 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                      >
                        <CheckIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="p-1.5 rounded-lg hover:bg-brand-bg-dark transition-colors"
                      >
                        <XMarkIcon className="w-4 h-4 text-brand-text-muted" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(lead.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                      title="Loschen"
                    >
                      <TrashIcon className="w-4 h-4 text-brand-text-muted hover:text-red-500" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
