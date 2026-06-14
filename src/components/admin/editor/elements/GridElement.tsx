'use client'

import React, { useCallback, useState } from 'react'
import { PlateElement, type PlateElementProps } from '@udecode/plate/react'
import { DirectiveWrapper } from './DirectiveWrapper'
import type { GridElement as GridElementType, GridItem } from '../types'

export function GridElement(props: PlateElementProps<GridElementType>) {
  const { children, element, editor } = props
  const [items, setItems] = useState<GridItem[]>(element.items || [])

  const updateElement = useCallback((updated: GridItem[]) => {
    setItems(updated)
    const path = editor.api.findPath(element)
    if (path) {
      editor.tf.setNodes({ items: updated } as any, { at: path })
    }
  }, [editor, element])

  const updateItem = useCallback((index: number, field: keyof GridItem, value: string) => {
    const updated = items.map((item, i) => i === index ? { ...item, [field]: value } : item)
    updateElement(updated)
  }, [items, updateElement])

  const addItem = useCallback(() => {
    updateElement([...items, { title: '' }])
  }, [items, updateElement])

  const removeItem = useCallback((index: number) => {
    updateElement(items.filter((_, i) => i !== index))
  }, [items, updateElement])

  return (
    <PlateElement {...props}>
      <DirectiveWrapper label="Grid" color="void">
        <div contentEditable={false} className="space-y-2">
          {items.map((item, i) => (
            <div key={i} className="bg-brand-surface border border-gray-200 rounded p-2 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium text-brand-text-muted">#{i + 1}</span>
                <button type="button" onMouseDown={(e) => { e.preventDefault(); removeItem(i) }} className="text-[10px] text-red-500 hover:text-red-700">Entfernen</button>
              </div>
              <input type="text" value={item.title} onChange={e => updateItem(i, 'title', e.target.value)} placeholder="Titel" className="w-full text-xs border border-gray-200 rounded px-2 py-1" />
              <div className="grid grid-cols-2 gap-1.5">
                <input type="text" value={item.image || ''} onChange={e => updateItem(i, 'image', e.target.value)} placeholder="Bild-URL" className="w-full text-xs border border-gray-200 rounded px-2 py-1" />
                <input type="text" value={item.href || ''} onChange={e => updateItem(i, 'href', e.target.value)} placeholder="Link-URL" className="w-full text-xs border border-gray-200 rounded px-2 py-1" />
              </div>
              <input type="text" value={item.description || ''} onChange={e => updateItem(i, 'description', e.target.value)} placeholder="Beschreibung" className="w-full text-xs border border-gray-200 rounded px-2 py-1" />
            </div>
          ))}
          <button type="button" onMouseDown={(e) => { e.preventDefault(); addItem() }} className="text-xs text-brand-accent hover:underline">+ Eintrag hinzufügen</button>
        </div>
        <span className="hidden">{children}</span>
      </DirectiveWrapper>
    </PlateElement>
  )
}
