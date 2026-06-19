'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    setLoading(false)

    if (result?.error) {
      setError('Ungültige E-Mail oder Passwort.')
    } else {
      router.push('/admin')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-10 h-10 rounded-sm bg-brand-primary flex items-center justify-center">
              <span className="text-white font-bold">DM</span>
            </div>
          </Link>
          <h1 className="mt-4 text-2xl font-display font-bold text-brand-text">
            Admin-Bereich
          </h1>
          <p className="mt-1 text-sm text-brand-text-muted">
            Melden Sie sich an, um fortzufahren.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="glass-card space-y-4">
          <div>
            <label
              htmlFor="login-email"
              className="block text-sm font-medium text-brand-text mb-1.5"
            >
              E-Mail
            </label>
            <input
              type="email"
              id="login-email"
              required
              className="input-glass"
              placeholder="admin@e-ventschau.de"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>

          <div>
            <label
              htmlFor="login-password"
              className="block text-sm font-medium text-brand-text mb-1.5"
            >
              Passwort
            </label>
            <input
              type="password"
              id="login-password"
              required
              className="input-glass"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50/50 rounded-lg p-2 text-center">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3 disabled:opacity-60"
          >
            {loading ? 'Anmeldung...' : 'Anmelden'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-brand-text-muted-light">
          <Link href="/" className="hover:text-brand-text transition-colors">
            Zurück zur Website
          </Link>
        </p>
      </div>
    </div>
  )
}
