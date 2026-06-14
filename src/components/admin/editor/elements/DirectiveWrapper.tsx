'use client'

import React from 'react'

interface DirectiveWrapperProps {
  label: string
  color?: string
  children: React.ReactNode
  className?: string
}

const COLOR_MAP: Record<string, string> = {
  info: 'border-blue-400 bg-blue-50/50',
  warning: 'border-yellow-400 bg-yellow-50/50',
  tip: 'border-green-400 bg-green-50/50',
  danger: 'border-red-400 bg-red-50/50',
  box: 'border-brand-accent/40 bg-brand-accent/5',
  hero: 'border-purple-400 bg-purple-50/50',
  columns: 'border-indigo-400 bg-indigo-50/50',
  void: 'border-gray-400 bg-gray-50/50',
}

export function DirectiveWrapper({ label, color = 'void', children, className = '' }: DirectiveWrapperProps) {
  const colorClasses = COLOR_MAP[color] || COLOR_MAP.void

  return (
    <div className={`relative border-l-4 rounded-lg p-3 my-2 ${colorClasses} ${className}`}>
      <span contentEditable={false} className="absolute -top-2.5 left-2 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-white rounded text-brand-text-muted border border-gray-200 select-none pointer-events-none">
        {label}
      </span>
      <div className="mt-1">
        {children}
      </div>
    </div>
  )
}
