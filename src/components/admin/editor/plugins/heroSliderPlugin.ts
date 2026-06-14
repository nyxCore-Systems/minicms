import { createPlatePlugin } from '@udecode/plate/react'
import { ELEMENT_HERO_SLIDER } from '../types'

export function createHeroSliderPlugin() {
  return createPlatePlugin({
    key: ELEMENT_HERO_SLIDER,
    node: {
      isElement: true,
      isVoid: true,
    },
  })
}
