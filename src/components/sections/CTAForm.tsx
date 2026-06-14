'use client'

import { useState } from 'react'

interface CTAFormProps {
  source?: string
  title?: string
  subtitle?: string
}

export default function CTAForm({
  source = 'homepage_cta',
  title = 'Kontaktieren Sie uns',
  subtitle = 'Interesse an einer Partnerschaft oder Fragen zu unseren Messern? Schreiben Sie uns — wir freuen uns auf Sie.',
}: CTAFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    message: '',
  })
  const [status, setStatus] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, source }),
      })

      if (!res.ok) throw new Error('Fehler beim Senden')

      setStatus('success')
      setFormData({
        name: '',
        email: '',
        phone: '',
        company: '',
        message: '',
      })
    } catch {
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <section id="kontakt" className="py-20">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="glass-card py-12 px-8">
            <div className="w-16 h-16 rounded-full bg-brand-primary-light/20 flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-brand-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h3 className="text-2xl font-display font-bold text-brand-text mb-2">
              Vielen Dank!
            </h3>
            <p className="text-brand-text-muted">
              Wir haben Ihre Nachricht erhalten und melden uns zeitnah bei
              Ihnen.
            </p>
            <button
              onClick={() => setStatus('idle')}
              className="btn-secondary mt-6"
            >
              Weitere Nachricht senden
            </button>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section id="kontakt" className="py-20">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-brand-text mb-4">
            {title}
          </h2>
          <p className="text-brand-text-muted text-lg">{subtitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="glass-card space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="cta-name"
                className="block text-sm font-medium text-brand-text mb-1.5"
              >
                Name *
              </label>
              <input
                type="text"
                id="cta-name"
                required
                className="input-glass"
                placeholder="Ihr Name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>
            <div>
              <label
                htmlFor="cta-email"
                className="block text-sm font-medium text-brand-text mb-1.5"
              >
                E-Mail *
              </label>
              <input
                type="email"
                id="cta-email"
                required
                className="input-glass"
                placeholder="ihre@email.de"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="cta-phone"
                className="block text-sm font-medium text-brand-text mb-1.5"
              >
                Telefon
              </label>
              <input
                type="tel"
                id="cta-phone"
                className="input-glass"
                placeholder="+49 ..."
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
              />
            </div>
            <div>
              <label
                htmlFor="cta-company"
                className="block text-sm font-medium text-brand-text mb-1.5"
              >
                Unternehmen
              </label>
              <input
                type="text"
                id="cta-company"
                className="input-glass"
                placeholder="Firmenname"
                value={formData.company}
                onChange={(e) =>
                  setFormData({ ...formData, company: e.target.value })
                }
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="cta-message"
              className="block text-sm font-medium text-brand-text mb-1.5"
            >
              Ihre Nachricht
            </label>
            <textarea
              id="cta-message"
              rows={4}
              className="input-glass resize-none"
              placeholder="Erzählen Sie uns von Ihrem Anliegen..."
              value={formData.message}
              onChange={(e) =>
                setFormData({ ...formData, message: e.target.value })
              }
            />
          </div>

          <button
            type="submit"
            disabled={status === 'loading'}
            className="btn-primary w-full text-lg py-4 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {status === 'loading' ? 'Wird gesendet...' : 'Nachricht senden'}
          </button>

          {status === 'error' && (
            <p className="text-red-600 dark:text-red-400 text-sm text-center">
              Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.
            </p>
          )}

          <p className="text-xs text-brand-text-light text-center">
            Ihre Daten werden vertraulich behandelt und nicht an Dritte
            weitergegeben.
          </p>
        </form>
      </div>
    </section>
  )
}
