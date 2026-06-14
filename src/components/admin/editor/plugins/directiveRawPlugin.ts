import { createPlatePlugin } from '@udecode/plate/react'
import { ELEMENT_DIRECTIVE_RAW } from '../types'

export function createDirectiveRawPlugin() {
  return createPlatePlugin({
    key: ELEMENT_DIRECTIVE_RAW,
    node: {
      isElement: true,
      isVoid: true,
    },
  })
}
