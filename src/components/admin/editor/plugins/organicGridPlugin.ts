import { createPlatePlugin } from '@udecode/plate/react'
import { ELEMENT_GRID } from '../types'

export function createOrganicGridPlugin() {
  return createPlatePlugin({
    key: ELEMENT_GRID,
    node: {
      isElement: true,
      isVoid: true,
    },
  })
}
