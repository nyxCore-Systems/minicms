'use client'

import { useState } from 'react'
import { SparklesIcon } from '@heroicons/react/24/outline'

interface AiImproveButtonProps {
  value: string
  onImprove: (improved: string) => void
  fieldType: string
  context?: string
  className?: string
}

export default function AiImproveButton({
  value,
  onImprove,
  fieldType,
  context,
  className = '',
}: AiImproveButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    if (!value.trim() || loading) return
    setLoading(true)

    try {
      const res = await fetch('/api/admin/ai/improve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: value, fieldType, context }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'AI-Verbesserung fehlgeschlagen')
      }

      const data = await res.json()
      if (data.improved) {
        onImprove(data.improved)
      }
    } catch (err) {
      console.error('AI improve error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading || !value.trim()}
      title="Mit KI verbessern"
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded-full
        bg-purple-50 text-purple-600 hover:bg-purple-100 transition-colors
        disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
    >
      <SparklesIcon className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
      {loading ? '...' : 'KI'}
    </button>
  )
}
