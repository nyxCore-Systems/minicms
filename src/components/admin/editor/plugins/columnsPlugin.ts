import { createPlatePlugin } from '@udecode/plate/react'
import { ELEMENT_COLUMNS, ELEMENT_COLUMN } from '../types'

export function createColumnsPlugin() {
  return createPlatePlugin({
    key: ELEMENT_COLUMNS,
    node: {
      isElement: true,
    },
  })
}

export function createColumnPlugin() {
  return createPlatePlugin({
    key: ELEMENT_COLUMN,
    node: {
      isElement: true,
    },
  })
}
