import { createPlatePlugin } from '@udecode/plate/react'
import { ELEMENT_BOX } from '../types'

export function createBoxPlugin() {
  return createPlatePlugin({
    key: ELEMENT_BOX,
    node: {
      isElement: true,
    },
  })
}
