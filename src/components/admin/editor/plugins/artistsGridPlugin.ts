import { createPlatePlugin } from '@udecode/plate/react'
import { ELEMENT_ARTISTS_GRID } from '../types'

export function createArtistsGridPlugin() {
  return createPlatePlugin({
    key: ELEMENT_ARTISTS_GRID,
    node: {
      isElement: true,
      isVoid: true,
    },
  })
}
