'use client'

import React from 'react'
import { PlateElement, type PlateElementProps } from '@udecode/plate/react'
import { DirectiveWrapper } from './DirectiveWrapper'
import type { ArtistsGridElement as ArtistsGridElementType } from '../types'

export function ArtistsGridElement(props: PlateElementProps<ArtistsGridElementType>) {
  const { children } = props
  return (
    <PlateElement {...props}>
      <DirectiveWrapper label="Künstler-Grid" color="void">
        <div contentEditable={false} className="text-xs text-gray-500">
          Alle veröffentlichten Künstler:innen – wird auf der Seite als Grid gerendert.
        </div>
        <span className="hidden">{children}</span>
      </DirectiveWrapper>
    </PlateElement>
  )
}
