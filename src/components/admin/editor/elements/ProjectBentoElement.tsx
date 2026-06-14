'use client'

import React, { useCallback, useState } from 'react'
import { PlateElement, type PlateElementProps } from '@udecode/plate/react'
import { DirectiveWrapper } from './DirectiveWrapper'
import type { ProjectBentoElement as ProjectBentoElementType } from '../types'

export function ProjectBentoElement(props: PlateElementProps<ProjectBentoElementType>) {
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
      <DirectiveWrapper label="Projekt-Bento" color="void">
        <div contentEditable={false}>
          <textarea
            value={raw}
            onChange={(e) => update(e.target.value)}
            className="w-full bg-brand-surface border border-gray-200 rounded p-2 font-mono text-xs resize-y min-h-[6rem]"
            placeholder=":::box&#10;![Bild](url)&#10;Beschreibung...&#10;:::&#10;:::box&#10;..."
          />
        </div>
        <span className="hidden">{children}</span>
      </DirectiveWrapper>
    </PlateElement>
  )
}
