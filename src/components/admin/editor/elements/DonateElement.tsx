'use client'

import React from 'react'
import { PlateElement, type PlateElementProps } from '@udecode/plate/react'
import { DirectiveWrapper } from './DirectiveWrapper'
import type { DonateElement as DonateElementType } from '../types'

export function DonateElement(props: PlateElementProps<DonateElementType>) {
  const { children } = props
  return (
    <PlateElement {...props}>
      <DirectiveWrapper label="PayPal-Spendenbutton" color="void">
        <div contentEditable={false} className="flex items-center gap-2">
          <span className="inline-flex items-center rounded bg-[#b87333]/10 px-2.5 py-1 text-xs font-medium text-[#b87333]">
            Jetzt spenden via PayPal &rarr;
          </span>
          <span className="text-xs text-gray-500">wird auf der Seite als Button gerendert</span>
        </div>
        <span className="hidden">{children}</span>
      </DirectiveWrapper>
    </PlateElement>
  )
}
