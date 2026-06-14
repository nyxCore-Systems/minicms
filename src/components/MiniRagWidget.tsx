'use client'

import { useEffect, useState } from 'react'

export default function MiniRagWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const miniragId = process.env.NEXT_PUBLIC_MINIRAG_ID
  const miniragUrl = process.env.NEXT_PUBLIC_MINIRAG_URL

  useEffect(() => {
    if (!miniragId || !miniragUrl) return

    // Inject MiniRag script
    const script = document.createElement('script')
    script.src = miniragUrl
    script.setAttribute('data-minirag-id', miniragId)
    script.async = true
    document.body.appendChild(script)

    return () => {
      document.body.removeChild(script)
    }
  }, [miniragId, miniragUrl])

  if (!miniragId || !miniragUrl) return null

  return (
    <button
      onClick={() => {
        setIsOpen(!isOpen)
        // Try to open MiniRag widget via its global API
        if (typeof window !== 'undefined' && (window as unknown as Record<string, unknown>).MiniRag) {
          const mr = (window as unknown as Record<string, unknown>).MiniRag as { toggle?: () => void }
          mr.toggle?.()
        }
      }}
      className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full btn-primary shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
      aria-label="Chat öffnen"
    >
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
        />
      </svg>
    </button>
  )
}
