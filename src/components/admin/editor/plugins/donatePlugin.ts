import { createPlatePlugin } from '@udecode/plate/react'
import { ELEMENT_DONATE } from '../types'

export function createDonatePlugin() {
  return createPlatePlugin({
    key: ELEMENT_DONATE,
    node: {
      isElement: true,
      isVoid: true,
    },
  })
}
