import { createPlatePlugin } from '@udecode/plate/react'
import { ELEMENT_BANNER } from '../types'

export function createBannerPlugin() {
  return createPlatePlugin({
    key: ELEMENT_BANNER,
    node: {
      isElement: true,
      isVoid: true,
    },
  })
}
