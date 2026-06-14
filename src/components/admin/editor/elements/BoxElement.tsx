'use client'

import React from 'react'
import { PlateElement, type PlateElementProps } from '@udecode/plate/react'
import { DirectiveWrapper } from './DirectiveWrapper'
import type { BoxElement as BoxElementType } from '../types'

export function BoxElement(props: PlateElementProps<BoxElementType>) {
  const { children } = props

  return (
    <PlateElement {...props}>
      <DirectiveWrapper label="Box" color="box">
        {children}
      </DirectiveWrapper>
    </PlateElement>
  )
}
