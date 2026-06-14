'use client'

import React, { useCallback, useState } from 'react'
import { PlateElement, type PlateElementProps } from '@udecode/plate/react'
import { DirectiveWrapper } from './DirectiveWrapper'
import type { ProductsElement as ProductsElementType } from '../types'

export function ProductsElement(props: PlateElementProps<ProductsElementType>) {
  const { children, element, editor } = props
  const [slug, setSlug] = useState(element.slug || '')

  const update = useCallback((value: string) => {
    setSlug(value)
    const path = editor.api.findPath(element)
    if (path) {
      editor.tf.setNodes({ slug: value } as any, { at: path })
    }
  }, [editor, element])

  return (
    <PlateElement {...props}>
      <DirectiveWrapper label="Produkte" color="void">
        <div contentEditable={false} className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Kategorie-Slug:</span>
          <input
            type="text"
            value={slug}
            onChange={(e) => update(e.target.value)}
            placeholder="kategorie-slug"
            className="flex-1 text-xs border border-gray-200 rounded px-2 py-1"
          />
        </div>
        <span className="hidden">{children}</span>
      </DirectiveWrapper>
    </PlateElement>
  )
}
