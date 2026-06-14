'use client'

import { useEffect, useState } from 'react'
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline'

export default function DarkModeToggle() {
  const [dark, setDark] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setDark(document.documentElement.classList.contains('dark'))
  }, [])

  function toggle() {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    try {
      localStorage.setItem('theme', next ? 'dark' : 'light')
    } catch {}
  }

  if (!mounted) {
    return (
      <button
        className="p-2 rounded-lg hover:bg-brand-bg-dark transition-colors"
        aria-label="Farbschema wechseln"
      >
        <span className="w-5 h-5 block" />
      </button>
    )
  }

  return (
    <button
      onClick={toggle}
      className="p-2 rounded-lg hover:bg-brand-bg-dark transition-colors"
      aria-label={dark ? 'Zum hellen Modus wechseln' : 'Zum dunklen Modus wechseln'}
      title={dark ? 'Helles Design' : 'Dunkles Design'}
    >
      {dark ? (
        <SunIcon className="w-5 h-5 text-brand-text" />
      ) : (
        <MoonIcon className="w-5 h-5 text-brand-text/70" />
      )}
    </button>
  )
}
