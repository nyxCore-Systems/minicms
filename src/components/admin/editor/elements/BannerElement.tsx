'use client'

import React, { useCallback, useState } from 'react'
import { PlateElement, type PlateElementProps } from '@udecode/plate/react'
import { DirectiveWrapper } from './DirectiveWrapper'
import type { BannerElement as BannerElementType } from '../types'

export function BannerElement(props: PlateElementProps<BannerElementType>) {
  const { children, element, editor } = props
  const [bannerId, setBannerId] = useState(element.bannerId || '')

  const update = useCallback((value: string) => {
    setBannerId(value)
    const path = editor.api.findPath(element)
    if (path) {
      editor.tf.setNodes({ bannerId: value || undefined } as any, { at: path })
    }
  }, [editor, element])

  return (
    <PlateElement {...props}>
      <DirectiveWrapper label="Banner" color="void">
        <div contentEditable={false} className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Banner-ID:</span>
          <input
            type="text"
            value={bannerId}
            onChange={(e) => update(e.target.value)}
            placeholder="leer = zufällig"
            className="flex-1 text-xs border border-gray-200 rounded px-2 py-1"
          />
        </div>
        <span className="hidden">{children}</span>
      </DirectiveWrapper>
    </PlateElement>
  )
}
