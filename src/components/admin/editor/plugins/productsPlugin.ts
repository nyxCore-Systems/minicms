import { createPlatePlugin } from '@udecode/plate/react'
import { ELEMENT_PRODUCTS } from '../types'

export function createProductsPlugin() {
  return createPlatePlugin({
    key: ELEMENT_PRODUCTS,
    node: {
      isElement: true,
      isVoid: true,
    },
  })
}
