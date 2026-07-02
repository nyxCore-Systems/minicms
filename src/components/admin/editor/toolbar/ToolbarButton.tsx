'use client'

import React from 'react'

// Shared classes. Contrast-safe on the white admin editor surface (#ffffff):
// idle #4a4f54 (~8:1), hover #32373c (~11:1), active #a90707 (~7.7:1). Visible
// keyboard focus ring. No hard-coded gray (theme-blind); brand tokens adapt.
const BTN_BASE =
  'p-1.5 rounded transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-1'

interface ToolbarButtonProps {
  /** Accessible name (also used as the hover tooltip). */
  label: string
  onActivate: () => void
  children: React.ReactNode
  className?: string
}

/**
 * A toolbar command button. `onMouseDown` only prevents focus-steal (keeps the
 * editor selection on mouse use); `onClick` runs the command and fires exactly
 * once for both mouse-up and keyboard Enter/Space. Renders no `tabIndex` — the
 * parent `Toolbar` owns roving tabindex.
 */
export const ToolbarButton = React.forwardRef<HTMLButtonElement, ToolbarButtonProps>(
  function ToolbarButton({ label, onActivate, children, className = '' }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        data-toolbar-item="true"
        aria-label={label}
        title={label}
        onMouseDown={(e) => e.preventDefault()}
        onClick={onActivate}
        className={`${BTN_BASE} text-brand-text-muted hover:bg-brand-bg-dark hover:text-brand-text ${className}`}
      >
        {children}
      </button>
    )
  },
)

interface ToolbarToggleButtonProps {
  label: string
  /** Whether the mark/state is currently active (exposed via aria-pressed). */
  pressed: boolean
  onActivate: () => void
  children: React.ReactNode
}

/** A toolbar toggle (e.g. bold/italic). Adds `aria-pressed` and an active style. */
export function ToolbarToggleButton({ label, pressed, onActivate, children }: ToolbarToggleButtonProps) {
  return (
    <button
      type="button"
      data-toolbar-item="true"
      aria-label={label}
      aria-pressed={pressed}
      title={label}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onActivate}
      className={`${BTN_BASE} ${
        pressed
          ? 'bg-brand-accent/10 text-brand-accent'
          : 'text-brand-text-muted hover:bg-brand-bg-dark hover:text-brand-text'
      }`}
    >
      {children}
    </button>
  )
}
