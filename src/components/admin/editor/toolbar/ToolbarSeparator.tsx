'use client'

import React from 'react'

/** Non-focusable vertical separator between toolbar groups (skipped by roving). */
export function ToolbarSeparator() {
  return <div role="separator" aria-orientation="vertical" className="w-px h-4 bg-brand-border mx-1" />
}
