'use client'

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
  QuestionMarkCircleIcon,
  XMarkIcon,
  LightBulbIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline'
import { adminHelpContent } from '@/lib/admin-help'

interface HelpButtonProps {
  pageKey: string
}

export default function HelpButton({ pageKey }: HelpButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  // Prevent body scroll when panel is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const handleBackdropClick = useCallback(() => {
    setIsOpen(false)
  }, [])

  const content = adminHelpContent[pageKey]
  if (!content) return null

  const panel = (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/30 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleBackdropClick}
      />

      {/* Slide-out panel */}
      <div
        className={`relative w-full max-w-md transform transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="h-full overflow-y-auto backdrop-blur-xl bg-brand-surface border-l border-brand-border shadow-2xl">
          {/* Header */}
          <div className="sticky top-0 backdrop-blur-xl bg-white/90 border-b border-brand-border px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <QuestionMarkCircleIcon className="w-5 h-5 text-brand-accent" />
              <h2 className="text-lg font-display font-bold text-brand-text">
                Hilfe
              </h2>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg text-brand-text-muted hover:text-brand-text hover:bg-brand-bg-dark transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Title & Description */}
            <div>
              <h3 className="text-xl font-display font-bold text-brand-text mb-2">
                {content.title}
              </h3>
              <p className="text-sm text-brand-text-muted leading-relaxed">
                {content.description}
              </p>
            </div>

            {/* Features */}
            {content.features.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-brand-text uppercase tracking-wider mb-3">
                  Funktionen
                </h4>
                <ul className="space-y-2">
                  {content.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <CheckCircleIcon className="w-4 h-4 text-brand-accent mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-brand-text leading-relaxed">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Tips */}
            {content.tips.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-brand-text uppercase tracking-wider mb-3">
                  Tipps
                </h4>
                <div className="space-y-3">
                  {content.tips.map((tip, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2.5 p-3 rounded-lg bg-brand-accent/5 border border-brand-accent/10"
                    >
                      <LightBulbIcon className="w-4 h-4 text-brand-accent mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-brand-text leading-relaxed">
                        {tip}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center justify-center w-7 h-7 rounded-full border border-brand-border text-brand-text-muted hover:text-brand-accent hover:border-brand-accent/30 transition-colors"
        title="Hilfe"
      >
        <span className="text-xs font-semibold">?</span>
      </button>

      {mounted && isOpen && createPortal(panel, document.body)}
    </>
  )
}
