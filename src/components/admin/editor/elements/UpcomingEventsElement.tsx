'use client'

import React from 'react'
import { PlateElement, type PlateElementProps } from '@udecode/plate/react'
import { DirectiveWrapper } from './DirectiveWrapper'
import type { UpcomingEventsElement as UpcomingEventsElementType } from '../types'

export function UpcomingEventsElement(props: PlateElementProps<UpcomingEventsElementType>) {
  const { children } = props
  return (
    <PlateElement {...props}>
      <DirectiveWrapper label="Kommende Events" color="void">
        <div contentEditable={false} className="text-xs text-gray-500">
          Alle kommenden Events – wird auf der Seite als Grid gerendert.
        </div>
        <span className="hidden">{children}</span>
      </DirectiveWrapper>
    </PlateElement>
  )
}
