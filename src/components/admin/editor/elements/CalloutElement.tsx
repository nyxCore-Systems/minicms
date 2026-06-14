'use client'

import React, { useCallback } from 'react'
import { PlateElement, type PlateElementProps } from '@udecode/plate/react'
import { DirectiveWrapper } from './DirectiveWrapper'
import type { CalloutElement as CalloutElementType } from '../types'

const VARIANT_LABELS: Record<string, string> = {
  info: 'Info',
  warning: 'Warnung',
  tip: 'Tipp',
  danger: 'Achtung',
}

const VARIANTS = ['info', 'warning', 'tip', 'danger'] as const

export function CalloutElement(props: PlateElementProps<CalloutElementType>) {
  const { children, element, editor, ...rest } = props
  const variant = element.variant || 'info'

  const setVariant = useCallback((newVariant: string) => {
    const path = editor.api.findPath(element)
    if (path) {
      editor.tf.setNodes({ variant: newVariant } as any, { at: path })
    }
  }, [editor, element])

  return (
    <PlateElement {...props}>
      <DirectiveWrapper label={VARIANT_LABELS[variant] || variant} color={variant}>
        <div className="flex items-center gap-1 mb-2">
          {VARIANTS.map(v => (
            <button
              key={v}
              type="button"
              contentEditable={false}
              onMouseDown={(e) => { e.preventDefault(); setVariant(v) }}
              className={`px-1.5 py-0.5 text-[10px] rounded transition-colors ${
                v === variant
                  ? 'bg-gray-800 text-white'
                  : 'bg-brand-bg-dark text-brand-text-muted hover:bg-gray-200'
              }`}
            >
              {VARIANT_LABELS[v]}
            </button>
          ))}
        </div>
        {children}
      </DirectiveWrapper>
    </PlateElement>
  )
}
