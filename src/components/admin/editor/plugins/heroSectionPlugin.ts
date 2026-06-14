import { createPlatePlugin } from '@udecode/plate/react'
import { ELEMENT_HERO_SECTION } from '../types'

export function createHeroSectionPlugin() {
  return createPlatePlugin({
    key: ELEMENT_HERO_SECTION,
    node: {
      isElement: true,
      isVoid: true,
    },
  })
}
