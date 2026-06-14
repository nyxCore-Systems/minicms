'use client'

import React, { useCallback, useState } from 'react'
import { PlateElement, type PlateElementProps } from '@udecode/plate/react'
import { DirectiveWrapper } from './DirectiveWrapper'
import type { HeroSectionElement as HeroSectionElementType } from '../types'

export function HeroSectionElement(props: PlateElementProps<HeroSectionElementType>) {
  const { children, element, editor } = props
  const [raw, setRaw] = useState(element.rawMarkdown || '')

  const update = useCallback((value: string) => {
    setRaw(value)
    const path = editor.api.findPath(element)
    if (path) {
      editor.tf.setNodes({ rawMarkdown: value } as any, { at: path })
    }
  }, [editor, element])

  return (
    <PlateElement {...props}>
      <DirectiveWrapper label="Hero-Section" color="hero">
        <div contentEditable={false}>
          <textarea
            value={raw}
            onChange={(e) => update(e.target.value)}
            className="w-full bg-brand-surface border border-gray-200 rounded p-2 font-mono text-xs resize-y min-h-[4rem]"
            placeholder="Hero-Section Inhalt..."
          />
        </div>
        <span className="hidden">{children}</span>
      </DirectiveWrapper>
    </PlateElement>
  )
}
