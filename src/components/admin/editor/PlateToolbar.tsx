'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import type { TElement } from '@udecode/plate'
import { SlashCommandMenu } from './SlashCommandMenu'

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

  // Close on outside click
  useEffect(() => {
    if (!showBlockMenu) return
    const handler = (e: MouseEvent) => {
      if (blockBtnRef.current?.contains(e.target as Node)) return
      setShowBlockMenu(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showBlockMenu])

  const ToolBtn = ({ label, mark, children }: { label: string; mark?: string; children: React.ReactNode }) => (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault()
        if (mark) onToggleMark(mark)
      }}
      className={`p-1.5 rounded transition-colors ${
        mark && activeMarks[mark] ? 'bg-brand-accent/10 text-brand-accent' : 'text-brand-text-muted hover:bg-brand-bg-dark hover:text-gray-700'
      }`}
      title={label}
    >
      {children}
    </button>
  )

  return (
    <>
      <div className="glass rounded-lg px-2 py-1 mb-2 flex items-center gap-0.5 flex-wrap">
        <ToolBtn label="Fett" mark="bold">
          <span className="text-xs font-bold">B</span>
        </ToolBtn>
        <ToolBtn label="Kursiv" mark="italic">
          <span className="text-xs italic">I</span>
        </ToolBtn>
        <ToolBtn label="Durchgestrichen" mark="strikethrough">
          <span className="text-xs line-through">S</span>
        </ToolBtn>

        <div className="w-px h-4 bg-gray-200 mx-1" />

        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault()
            onInsertNode({ type: 'h1', children: [{ text: '' }] })
          }}
          className="p-1.5 rounded text-brand-text-muted hover:bg-brand-bg-dark hover:text-gray-700 transition-colors"
          title="Überschrift 1"
        >
          <span className="text-xs font-bold">H1</span>
        </button>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault()
            onInsertNode({ type: 'h2', children: [{ text: '' }] })
          }}
          className="p-1.5 rounded text-brand-text-muted hover:bg-brand-bg-dark hover:text-gray-700 transition-colors"
          title="Überschrift 2"
        >
          <span className="text-xs font-bold">H2</span>
        </button>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault()
            onInsertNode({ type: 'h3', children: [{ text: '' }] })
          }}
          className="p-1.5 rounded text-brand-text-muted hover:bg-brand-bg-dark hover:text-gray-700 transition-colors"
          title="Überschrift 3"
        >
          <span className="text-xs font-bold">H3</span>
        </button>

        <div className="w-px h-4 bg-gray-200 mx-1" />

        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); onInsertImage() }}
          className="p-1.5 rounded text-brand-text-muted hover:bg-brand-bg-dark hover:text-gray-700 transition-colors"
          title="Bild einfügen"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5a1.5 1.5 0 0 0 1.5-1.5V5.25a1.5 1.5 0 0 0-1.5-1.5H3.75a1.5 1.5 0 0 0-1.5 1.5v14.25c0 .828.672 1.5 1.5 1.5Z" />
          </svg>
        </button>

        <div className="w-px h-4 bg-gray-200 mx-1" />

        <button
          ref={blockBtnRef}
          type="button"
          onMouseDown={(e) => { e.preventDefault(); openBlockMenu() }}
          className="px-2 py-1 rounded text-xs font-medium text-brand-text-muted hover:bg-brand-bg-dark hover:text-gray-700 transition-colors"
          title="Block einfügen"
        >
          + Block
        </button>
      </div>

      {showBlockMenu && (
        <SlashCommandMenu
          onInsert={onInsertNode}
          onClose={() => setShowBlockMenu(false)}
          position={menuPos}
        />
      )}
    </>
  )
}
