'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface Tenant {
  id: string
  name: string
  slug: string
  domain: string | null
  plan: string
  isActive: boolean
  createdAt: string
}

export default function SuperAdminTenantsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'loading') return
    if (!session?.user?.isSuperAdmin && session?.user?.role !== 'SUPER_ADMIN') {
      router.replace('/admin')
      return
    }

    async function fetchTenants() {
      try {
        const res = await fetch('/api/admin/super/tenants')
        if (!res.ok) throw new Error('Fehler beim Laden der Mandanten')
        const data = await res.json()
        setTenants(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Fehler')
      } finally {
        setLoading(false)
      }
    }

    fetchTenants()
  }, [session, status, router])

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-accent" />
      </div>
    )
  }

  if (!session?.user?.isSuperAdmin && session?.user?.role !== 'SUPER_ADMIN') {
    return null
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-brand-text mb-1">
            Mandanten
          </h1>
          <p className="text-sm text-brand-text-muted">
            Alle Mandanten verwalten (Super-Admin).
          </p>
        </div>
        <Link
          href="/admin/super/tenants/new"
          className="px-4 py-2 bg-brand-accent text-white rounded-lg text-sm font-medium hover:bg-brand-accent/90 transition-colors"
        >
          + Neuer Mandant
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {tenants.length === 0 ? (
        <div className="text-center py-12 bg-brand-surface border border-brand-border rounded-lg">
          <p className="text-brand-text-muted">Keine Mandanten vorhanden.</p>
        </div>
      ) : (
        <div className="bg-brand-surface border border-brand-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-border bg-brand-bg-dark">
                <th className="text-left px-4 py-3 font-medium text-brand-text-muted">Name</th>
                <th className="text-left px-4 py-3 font-medium text-brand-text-muted">Slug</th>
                <th className="text-left px-4 py-3 font-medium text-brand-text-muted">Domain</th>
                <th className="text-left px-4 py-3 font-medium text-brand-text-muted">Plan</th>
                <th className="text-left px-4 py-3 font-medium text-brand-text-muted">Status</th>
                <th className="text-left px-4 py-3 font-medium text-brand-text-muted">Erstellt</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((tenant) => (
                <tr key={tenant.id} className="border-b border-brand-border last:border-0 hover:bg-brand-bg-dark">
                  <td className="px-4 py-3 font-medium text-brand-text">{tenant.name}</td>
                  <td className="px-4 py-3 text-brand-text-muted font-mono text-xs">{tenant.slug}</td>
                  <td className="px-4 py-3 text-brand-text-muted">{tenant.domain || '-'}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
                      {tenant.plan}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        tenant.isActive
                          ? 'bg-green-50 text-green-700'
                          : 'bg-red-50 text-red-600'
                      }`}
                    >
                      {tenant.isActive ? 'Aktiv' : 'Inaktiv'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-brand-text-muted text-xs">
                    {new Date(tenant.createdAt).toLocaleDateString('de-DE')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
