import { createPlatePlugin } from '@udecode/plate/react'
import { ELEMENT_CV_TIMELINE } from '../types'

export function createCvTimelinePlugin() {
  return createPlatePlugin({
    key: ELEMENT_CV_TIMELINE,
    node: {
      isElement: true,
      isVoid: true,
    },
  })
}
