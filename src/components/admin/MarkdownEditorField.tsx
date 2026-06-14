'use client'

import React, { useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import type { TElement } from '@udecode/plate'
import { markdownToPlate } from '@/components/admin/editor/serialization/markdownToPlate'
import { plateToMarkdown } from '@/components/admin/editor/serialization/plateToMarkdown'
import MarkdownContent from '@/components/MarkdownContent'

const PlateEditor = dynamic(
  () => import('@/components/admin/editor/PlateEditor').then(m => ({ default: m.PlateEditor })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center py-10">
        <div className="animate-spin h-6 w-6 border-2 border-brand-accent border-t-transparent rounded-full" />
      </div>
    ),
  }
)

type EditorMode = 'markdown' | 'wysiwyg' | 'preview'

interface MarkdownEditorFieldProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  minHeight?: string
  label?: string
}

export default function MarkdownEditorField({
  value,
  onChange,
  placeholder = 'Markdown eingeben...',
  minHeight = '200px',
  label,
}: MarkdownEditorFieldProps) {
  const [editorMode, setEditorMode] = useState<EditorMode>('markdown')
  const [contentJson, setContentJson] = useState<TElement[] | null>(null)

  const switchEditorMode = useCallback((newMode: EditorMode) => {
    if (newMode === editorMode) return

    if (editorMode === 'markdown' && newMode === 'wysiwyg') {
      const plateValue = markdownToPlate(value)
      setContentJson(plateValue)
    } else if (editorMode === 'wysiwyg' && (newMode === 'markdown' || newMode === 'preview')) {
      if (contentJson) {
        const md = plateToMarkdown(contentJson)
        onChange(md)
      }
    }

    setEditorMode(newMode)
  }, [editorMode, value, contentJson, onChange])

  const modeButton = (mode: EditorMode, label: string) => (
    <button
      type="button"
      onClick={() => switchEditorMode(mode)}
      className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${
        editorMode === mode
          ? 'bg-white text-brand-text shadow-sm'
          : 'text-brand-text-muted hover:text-brand-text'
      }`}
    >
      {label}
    </button>
  )

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-brand-text mb-1">
          {label}
        </label>
      )}

      <div className="flex items-center justify-end mb-1.5">
        <div className="flex items-center bg-brand-bg-dark rounded-full p-0.5">
          {modeButton('markdown', 'Markdown')}
          {modeButton('wysiwyg', 'WYSIWYG')}
          {modeButton('preview', 'Vorschau')}
        </div>
      </div>

      {editorMode === 'preview' ? (
        <div
          className="border border-brand-border bg-brand-surface rounded-lg p-4 overflow-y-auto"
          style={{ minHeight }}
        >
          {value.trim() ? (
            <article className="prose-glass">
              <MarkdownContent content={value} />
            </article>
          ) : (
            <p className="text-sm text-brand-text-muted/50 italic">Keine Vorschau verfügbar</p>
          )}
        </div>
      ) : editorMode === 'wysiwyg' ? (
        <div style={{ minHeight }}>
          {contentJson && (
            <PlateEditor
              initialValue={contentJson}
              onChange={(val) => setContentJson(val)}
            />
          )}
        </div>
      ) : (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          spellCheck={false}
          className="w-full border border-brand-border bg-brand-surface rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:bg-brand-bg-dark transition-colors font-mono resize-y"
          style={{ minHeight }}
        />
      )}
    </div>
  )
}
