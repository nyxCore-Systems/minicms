'use client'

import React, { useCallback, useRef, useState, useEffect } from 'react'
import { Plate, PlateContent } from '@udecode/plate/react'
import type { TElement } from '@udecode/plate'
import { useEditorConfig } from './useEditorConfig'
import { PlateToolbar } from './PlateToolbar'

interface PlateEditorProps {
  initialValue: TElement[]
  onChange: (value: TElement[]) => void
  onInsertImage?: () => void
  insertImageRef?: React.MutableRefObject<((url: string, alt: string) => void) | null>
}

export function PlateEditor({ initialValue, onChange, onInsertImage, insertImageRef }: PlateEditorProps) {
  const editor = useEditorConfig(initialValue)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const [activeMarks, setActiveMarks] = useState<Record<string, boolean>>({})

  const handleChange = useCallback(({ value }: { value: TElement[] }) => {
    onChangeRef.current(value)
  }, [])

  const handleSelectionChange = useCallback(() => {
    if (!editor) return
    // Save selection so we can restore it after media picker closes
    if (editor.selection) {
      savedSelectionRef.current = JSON.parse(JSON.stringify(editor.selection))
    }
    // Check active marks at current selection
    const marks = editor.api.marks() || {}
    setActiveMarks({
      bold: !!marks.bold,
      italic: !!marks.italic,
      strikethrough: !!marks.strikethrough,
      code: !!marks.code,
    })
  }, [editor])

  const toggleMark = useCallback((mark: string) => {
    if (!editor) return
    editor.tf.toggleMark(mark)
    // Update active marks after toggle
    const marks = editor.api.marks() || {}
    setActiveMarks({
      bold: !!marks.bold,
      italic: !!marks.italic,
      strikethrough: !!marks.strikethrough,
      code: !!marks.code,
    })
  }, [editor])

  const insertNode = useCallback((node: TElement) => {
    if (!editor) return
    // Collapse selection to end so inserting a block doesn't delete selected text
    if (editor.selection) {
      editor.tf.collapse({ edge: 'end' })
    }
    editor.tf.insertNodes(node)
  }, [editor])

  // Track last known selection so image insertion works after dialog closes
  const savedSelectionRef = useRef(editor?.selection)
  const handleInsertImage = useCallback(() => {
    onInsertImage?.()
  }, [onInsertImage])

  // Expose image insertion to parent via ref
  useEffect(() => {
    if (insertImageRef && editor) {
      insertImageRef.current = (url: string, alt: string) => {
        // Restore saved selection or insert at end
        const sel = savedSelectionRef.current || editor.selection
        if (sel) {
          editor.tf.select(sel)
          editor.tf.collapse({ edge: 'end' })
        } else {
          // No selection — insert at the end of the document
          const lastPath = [editor.children.length - 1]
          editor.tf.select(lastPath)
          editor.tf.collapse({ edge: 'end' })
        }
        editor.tf.insertNodes({
          type: 'img',
          url,
          alt,
          children: [{ text: '' }],
        } as TElement)
      }
      return () => { insertImageRef.current = null }
    }
  }, [editor, insertImageRef])

  if (!editor) return null

  return (
    <Plate editor={editor} onValueChange={handleChange} onSelectionChange={handleSelectionChange}>
      <PlateToolbar
        onInsertNode={insertNode}
        onToggleMark={toggleMark}
        onInsertImage={handleInsertImage}
        activeMarks={activeMarks}
      />
      <PlateContent
        className="glass rounded-xl p-4 sm:p-6 prose-glass min-h-[300px] h-full overflow-y-auto focus:outline-none focus:ring-2 focus:ring-brand-accent/30"
        placeholder="Inhalt hier eingeben..."
        spellCheck={false}
      />
    </Plate>
  )
}
