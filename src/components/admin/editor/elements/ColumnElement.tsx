'use client'

import React from 'react'
import { PlateElement, type PlateElementProps } from '@udecode/plate/react'
import type { ColumnElement as ColumnElementType } from '../types'

export function ColumnElement(props: PlateElementProps<ColumnElementType>) {
  const { children } = props

  return (
    <PlateElement {...props}>
      <div className="border border-dashed border-gray-300 rounded-lg p-2 min-h-[3rem]">
        {children}
      </div>
    </PlateElement>
  )
}
