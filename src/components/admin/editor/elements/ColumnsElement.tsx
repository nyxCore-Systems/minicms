'use client'

import React, { useCallback } from 'react'
import { PlateElement, type PlateElementProps } from '@udecode/plate/react'
import { DirectiveWrapper } from './DirectiveWrapper'
import type { ColumnsElement as ColumnsElementType } from '../types'

export function ColumnsElement(props: PlateElementProps<ColumnsElementType>) {
  const { children, element, editor } = props
  const count = element.columnCount || 2

  const setColumnCount = useCallback((newCount: 2 | 3) => {
    const path = editor.api.findPath(element)
    if (path) {
      editor.tf.setNodes({ columnCount: newCount } as any, { at: path })
    }
  }, [editor, element])

  return (
    <PlateElement {...props}>
      <DirectiveWrapper label={`${count} Spalten`} color="columns">
        <div className="flex items-center gap-1 mb-2" contentEditable={false}>
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); setColumnCount(2) }}
            className={`px-1.5 py-0.5 text-[10px] rounded transition-colors ${
              count === 2 ? 'bg-gray-800 text-white' : 'bg-brand-bg-dark text-brand-text-muted hover:bg-gray-200'
            }`}
          >
            2 Spalten
          </button>
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); setColumnCount(3) }}
            className={`px-1.5 py-0.5 text-[10px] rounded transition-colors ${
              count === 3 ? 'bg-gray-800 text-white' : 'bg-brand-bg-dark text-brand-text-muted hover:bg-gray-200'
            }`}
          >
            3 Spalten
          </button>
        </div>
        <div className={`grid gap-3 ${count === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
          {children}
        </div>
      </DirectiveWrapper>
    </PlateElement>
  )
}
