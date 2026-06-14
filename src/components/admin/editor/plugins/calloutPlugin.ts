import { createPlatePlugin } from '@udecode/plate/react'
import { ELEMENT_CALLOUT } from '../types'

export function createCalloutPlugin() {
  return createPlatePlugin({
    key: ELEMENT_CALLOUT,
    node: {
      isElement: true,
    },
  })
}
