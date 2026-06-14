'use client'

import React from 'react'
import { PlateElement, type PlateElementProps } from '@udecode/plate/react'
import { DirectiveWrapper } from './DirectiveWrapper'
import type { HeroElement as HeroElementType } from '../types'

export function HeroElement(props: PlateElementProps<HeroElementType>) {
  const { children } = props

  return (
    <PlateElement {...props}>
      <DirectiveWrapper label="Hero" color="hero">
        {children}
      </DirectiveWrapper>
    </PlateElement>
  )
}
