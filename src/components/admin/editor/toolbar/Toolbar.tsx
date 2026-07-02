'use client'

import React, { useRef, useState, useLayoutEffect, useCallback } from 'react'
import { nextToolbarIndex } from '@/lib/toolbarNav'

interface ToolbarProps {
  /** Accessible name announced for the toolbar (WAI-ARIA requires one). */
  label: string
  className?: string
  children: React.ReactNode
}

/**
 * WAI-ARIA toolbar container with roving tabindex. Exactly one focusable
 * control (marked `data-toolbar-item="true"`) is tabbable at a time; arrow
 * keys / Home / End move focus among them.
 */
export function Toolbar({ label, className, children }: ToolbarProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)

  const getItems = useCallback((): HTMLButtonElement[] => {
    if (!ref.current) return []
    return Array.from(ref.current.querySelectorAll<HTMLButtonElement>('[data-toolbar-item="true"]'))
  }, [])

  // Roving tabindex: only the active control is tabbable. No dependency array
  // (runs after every render) so item-set changes — buttons conditionally
  // mounted/unmounted by a consumer without an `activeIndex` change — are
  // always reconciled, not just when `activeIndex` itself changes.
  useLayoutEffect(() => {
    const items = getItems()
    if (items.length === 0) return
    const active = Math.min(activeIndex, items.length - 1)
    items.forEach((el, i) => { el.tabIndex = i === active ? 0 : -1 })
  })

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    const items = getItems()
    if (items.length === 0) return
    const current = Math.max(0, items.indexOf(document.activeElement as HTMLButtonElement))
    const next = nextToolbarIndex(e.key, current, items.length)
    if (next === null) return
    e.preventDefault()
    setActiveIndex(next)
    items[next]?.focus()
  }, [getItems])

  // Keep activeIndex in sync when a control gains focus via Tab or click.
  const onFocusCapture = useCallback((e: React.FocusEvent) => {
    const idx = getItems().indexOf(e.target as HTMLButtonElement)
    if (idx >= 0) setActiveIndex(idx)
  }, [getItems])

  return (
    <div
      ref={ref}
      role="toolbar"
      aria-label={label}
      aria-orientation="horizontal"
      onKeyDown={onKeyDown}
      onFocusCapture={onFocusCapture}
      className={className}
    >
      {children}
    </div>
  )
}
