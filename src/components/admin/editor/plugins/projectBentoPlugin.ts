import { createPlatePlugin } from '@udecode/plate/react'
import { ELEMENT_PROJECT_BENTO } from '../types'

export function createProjectBentoPlugin() {
  return createPlatePlugin({
    key: ELEMENT_PROJECT_BENTO,
    node: {
      isElement: true,
      isVoid: true,
    },
  })
}
