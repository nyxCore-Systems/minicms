'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import type { TElement } from '@udecode/plate'
import { SlashCommandMenu } from './SlashCommandMenu'
import { Toolbar, ToolbarButton, ToolbarToggleButton, ToolbarSeparator } from './toolbar'

interface PlateToolbarProps {
  onInsertNode: (node: TElement) => void
  onToggleMark: (mark: string) => void
  onInsertImage: () => void
  activeMarks: Record<string, boolean>
}

export function PlateToolbar({ onInsertNode, onToggleMark, onInsertImage, activeMarks }: PlateToolbarProps) {
  const [showBlockMenu, setShowBlockMenu] = useState(false)
  const blockBtnRef = useRef<HTMLButtonElement>(null)
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | undefined>()

  const openBlockMenu = useCallback(() => {
    if (blockBtnRef.current) {
      const rect = blockBtnRef.current.getBoundingClientRect()
      setMenuPos({ top: rect.bottom + 4, left: rect.left })
    }
    setShowBlockMenu(true)
  }, [])

  // Menu-driven close (Escape / select): close AND return focus to the trigger.
  const closeBlockMenu = useCallback(() => {
    setShowBlockMenu(false)
    blockBtnRef.current?.focus()
  }, [])

  // Outside click: close WITHOUT refocusing the trigger (user is elsewhere).
  useEffect(() => {
    if (!showBlockMenu) return
    const handler = (e: MouseEvent) => {
      if (blockBtnRef.current?.contains(e.target as Node)) return
      setShowBlockMenu(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showBlockMenu])

  return (
    <>
      <Toolbar
        label="Formatierung"
        className="glass rounded-lg px-2 py-1 mb-2 flex items-center gap-0.5 flex-wrap"
      >
        <ToolbarToggleButton label="Fett" pressed={!!activeMarks.bold} onActivate={() => onToggleMark('bold')}>
          <span className="text-xs font-bold">B</span>
        </ToolbarToggleButton>
        <ToolbarToggleButton label="Kursiv" pressed={!!activeMarks.italic} onActivate={() => onToggleMark('italic')}>
          <span className="text-xs italic">I</span>
        </ToolbarToggleButton>
        <ToolbarToggleButton
          label="Durchgestrichen"
          pressed={!!activeMarks.strikethrough}
          onActivate={() => onToggleMark('strikethrough')}
        >
          <span className="text-xs line-through">S</span>
        </ToolbarToggleButton>

        <ToolbarSeparator />

        <ToolbarButton label="Überschrift 1" onActivate={() => onInsertNode({ type: 'h1', children: [{ text: '' }] })}>
          <span className="text-xs font-bold">H1</span>
        </ToolbarButton>
        <ToolbarButton label="Überschrift 2" onActivate={() => onInsertNode({ type: 'h2', children: [{ text: '' }] })}>
          <span className="text-xs font-bold">H2</span>
        </ToolbarButton>
        <ToolbarButton label="Überschrift 3" onActivate={() => onInsertNode({ type: 'h3', children: [{ text: '' }] })}>
          <span className="text-xs font-bold">H3</span>
        </ToolbarButton>

        <ToolbarSeparator />

        <ToolbarButton label="Bild einfügen" onActivate={onInsertImage}>
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5a1.5 1.5 0 0 0 1.5-1.5V5.25a1.5 1.5 0 0 0-1.5-1.5H3.75a1.5 1.5 0 0 0-1.5 1.5v14.25c0 .828.672 1.5 1.5 1.5Z"
            />
          </svg>
        </ToolbarButton>

        <ToolbarSeparator />

        <ToolbarButton ref={blockBtnRef} label="Block einfügen" onActivate={openBlockMenu}>
          <span className="text-xs font-medium">+ Block</span>
        </ToolbarButton>
      </Toolbar>

      {showBlockMenu && (
        <SlashCommandMenu onInsert={onInsertNode} onClose={closeBlockMenu} position={menuPos} />
      )}
    </>
  )
}
