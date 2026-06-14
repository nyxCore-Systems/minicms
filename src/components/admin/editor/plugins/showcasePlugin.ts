import { createPlatePlugin } from '@udecode/plate/react'
import { ELEMENT_SHOWCASE } from '../types'

export function createShowcasePlugin() {
  return createPlatePlugin({
    key: ELEMENT_SHOWCASE,
    node: {
      isElement: true,
      isVoid: true,
    },
  })
}
