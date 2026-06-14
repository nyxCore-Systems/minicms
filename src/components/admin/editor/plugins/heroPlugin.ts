import { createPlatePlugin } from '@udecode/plate/react'
import { ELEMENT_HERO } from '../types'

export function createHeroPlugin() {
  return createPlatePlugin({
    key: ELEMENT_HERO,
    node: {
      isElement: true,
    },
  })
}
