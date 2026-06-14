import { createPlatePlugin } from '@udecode/plate/react'
import { ELEMENT_SLIDER } from '../types'

export function createSliderPlugin() {
  return createPlatePlugin({
    key: ELEMENT_SLIDER,
    node: {
      isElement: true,
      isVoid: true,
    },
  })
}
