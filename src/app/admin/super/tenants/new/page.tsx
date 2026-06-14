'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

const THEMES = [
  { value: 'vinyl', label: 'Vinyl', description: 'Dunkles Musikthema mit Retro-Look' },
  { value: 'messer', label: 'Messer', description: 'Warmes Waldthema mit Kupferakzenten' },
  { value: 'aurus', label: 'Aurus', description: 'Elegantes Gold-auf-Dunkel-Thema' },
  { value: 'minirag', label: 'MiniRag', description: 'Modernes minimalistisches Thema' },
]

const STEPS = ['Mandant', 'Admin-Benutzer', 'Theme', 'Einstellungen']

export default function NewTenantWizard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Step 1: Tenant info
  const [tenantName, setTenantName] = useState('')
  const [tenantSlug, setTenantSlug] = useState('')
  const [tenantDomain, setTenantDomain] = useState('')

  // Step 2: Admin user
  const [adminEmail, setAdminEmail] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [adminName, setAdminName] = useState('')

  // Step 3: Theme
  const [theme, setTheme] = useState('messer')

  // Step 4: Site settings
  const [siteName, setSiteName] = useState('')
  const [footerText, setFooterText] = useState('')

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-accent" />
      </div>
    )
  }

  if (!session?.user?.isSuperAdmin && session?.user?.role !== 'SUPER_ADMIN') {
    router.replace('/admin')
    return null
  }

  function slugify(text: string) {
    return text
      .toLowerCase()
      .replace(/[äöüß]/g, (c) =>
        c === 'ä' ? 'ae' : c === 'ö' ? 'oe' : c === 'ü' ? 'ue' : 'ss'
      )
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }

  function handleTenantNameChange(name: string) {
    setTenantName(name)
    if (!tenantSlug || tenantSlug === slugify(tenantName)) {
      setTenantSlug(slugify(name))
    }
  }

  function canProceed(): boolean {
    switch (step) {
      case 0:
        return tenantName.trim().length > 0 && tenantSlug.trim().length > 0
      case 1:
        return adminEmail.trim().length > 0 && adminPassword.length >= 6 && adminName.trim().length > 0
      case 2:
        return true
      case 3:
        return siteName.trim().length > 0
      default:
        return false
    }
  }

  async function handleSubmit() {
    setSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/admin/super/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: tenantName,
          slug: tenantSlug,
          domain: tenantDomain || null,
          adminEmail,
          adminPassword,
          adminName,
          themeSlug: theme,
          siteName,
          footerText: footerText || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Fehler beim Erstellen')
      }

      router.push('/admin/super/tenants')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Erstellen')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-display font-bold text-brand-text mb-1">
          Neuer Mandant
        </h1>
        <p className="text-sm text-brand-text-muted">
          Schritt {step + 1} von {STEPS.length}: {STEPS[step]}
        </p>
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                i < step
                  ? 'bg-brand-accent text-white'
                  : i === step
                    ? 'bg-brand-accent/20 text-brand-accent border-2 border-brand-accent'
                    : 'bg-brand-bg-dark text-brand-text-muted'
              }`}
            >
              {i < step ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              ) : (
                i + 1
              )}
            </div>
            {i < STEPS.length - 1 && (
              <div className={`w-8 h-0.5 ${i < step ? 'bg-brand-accent' : 'bg-brand-border'}`} />
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      <div className="bg-brand-surface border border-brand-border rounded-lg p-6">
        {/* Step 1: Tenant Info */}
        {step === 0 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-brand-text mb-1">
                Mandantenname *
              </label>
              <input
                type="text"
                value={tenantName}
                onChange={(e) => handleTenantNameChange(e.target.value)}
                className="w-full border border-brand-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent/50 bg-brand-surface text-brand-text"
                placeholder="z.B. Das Messer"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text mb-1">
                Slug *
              </label>
              <input
                type="text"
                value={tenantSlug}
                onChange={(e) => setTenantSlug(e.target.value)}
                className="w-full border border-brand-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-accent/50 bg-brand-surface text-brand-text"
                placeholder="z.B. das-messer"
              />
              <p className="text-xs text-brand-text-muted mt-1">
                Wird als Subdomain und interner Identifier verwendet.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text mb-1">
                Domain (optional)
              </label>
              <input
                type="text"
                value={tenantDomain}
                onChange={(e) => setTenantDomain(e.target.value)}
                className="w-full border border-brand-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent/50 bg-brand-surface text-brand-text"
                placeholder="z.B. das-messer.de"
              />
            </div>
          </div>
        )}

        {/* Step 2: Admin User */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-brand-text mb-1">
                Name *
              </label>
              <input
                type="text"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                className="w-full border border-brand-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent/50 bg-brand-surface text-brand-text"
                placeholder="Admin Name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text mb-1">
                E-Mail *
              </label>
              <input
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                className="w-full border border-brand-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent/50 bg-brand-surface text-brand-text"
                placeholder="admin@example.de"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text mb-1">
                Passwort * (min. 6 Zeichen)
              </label>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                className="w-full border border-brand-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent/50 bg-brand-surface text-brand-text"
                placeholder="Sicheres Passwort"
              />
            </div>
          </div>
        )}

        {/* Step 3: Theme */}
        {step === 2 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {THEMES.map((t) => (
              <button
                key={t.value}
                onClick={() => setTheme(t.value)}
                className={`text-left p-4 rounded-lg border-2 transition-colors ${
                  theme === t.value
                    ? 'border-brand-accent bg-brand-accent/5'
                    : 'border-brand-border hover:border-brand-text-muted'
                }`}
              >
                <p className="font-medium text-brand-text">{t.label}</p>
                <p className="text-xs text-brand-text-muted mt-1">{t.description}</p>
              </button>
            ))}
          </div>
        )}

        {/* Step 4: Site Settings */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-brand-text mb-1">
                Seitenname *
              </label>
              <input
                type="text"
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                className="w-full border border-brand-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent/50 bg-brand-surface text-brand-text"
                placeholder="z.B. Das Messer"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-brand-text mb-1">
                Footer-Text (optional)
              </label>
              <textarea
                value={footerText}
                onChange={(e) => setFooterText(e.target.value)}
                rows={3}
                className="w-full border border-brand-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent/50 bg-brand-surface text-brand-text"
                placeholder="Copyright-Text oder andere Footer-Informationen"
              />
            </div>
          </div>
        )}
      </div>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between mt-6">
        <button
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="px-4 py-2 text-sm font-medium text-brand-text bg-brand-bg-dark rounded-lg hover:bg-brand-bg-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Zurück
        </button>

        {step < STEPS.length - 1 ? (
          <button
            onClick={() => setStep((s) => s + 1)}
            disabled={!canProceed()}
            className="px-4 py-2 bg-brand-accent text-white rounded-lg text-sm font-medium hover:bg-brand-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Weiter
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={saving || !canProceed()}
            className="px-6 py-2 bg-brand-accent text-white rounded-lg text-sm font-medium hover:bg-brand-accent/90 transition-colors disabled:opacity-50"
          >
            {saving ? 'Erstellt...' : 'Mandant erstellen'}
          </button>
        )}
      </div>
    </div>
  )
}
