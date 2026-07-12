import { createPlatePlugin } from '@udecode/plate/react'
import { ELEMENT_UPCOMING_EVENTS } from '../types'

export function createUpcomingEventsPlugin() {
  return createPlatePlugin({
    key: ELEMENT_UPCOMING_EVENTS,
    node: {
      isElement: true,
      isVoid: true,
    },
  })
}
