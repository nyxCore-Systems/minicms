'use client'

import React, { useCallback } from 'react'
import dynamic from 'next/dynamic'
import type { TElement } from '@udecode/plate'
import MarkdownContent from '@/components/MarkdownContent'
import { plateValueFor, markdownFrom, type EditorMode, type ContentEditorValue } from '@/lib/contentEditor'

const PlateEditor = dynamic(
  () => import('@/components/admin/editor/PlateEditor').then((m) => ({ default: m.PlateEditor })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center py-10">
        <div className="animate-spin h-6 w-6 border-2 border-brand-accent border-t-transparent rounded-full" />
      </div>
    ),
  },
)

interface MarkdownEditorFieldProps {
  value: string
  contentJson?: TElement[] | null
  editorMode?: EditorMode
  onChange: (next: ContentEditorValue) => void
  label?: string
  placeholder?: string
  minHeight?: number
}

export default function MarkdownEditorField({
  value,
  contentJson = null,
  editorMode = 'markdown',
  onChange,
  placeholder = 'Markdown eingeben...',
  minHeight = 200,
  label,
}: MarkdownEditorFieldProps) {
  // Merge a partial change with the current controlled state and emit the full triple.
  const emit = useCallback(
    (next: Partial<ContentEditorValue>) => {
      onChange({
        markdown: next.markdown ?? value,
        contentJson: next.contentJson ?? contentJson ?? [],
        editorMode: next.editorMode ?? editorMode,
      })
    },
    [onChange, value, contentJson, editorMode],
  )

  const switchMode = useCallback(
    (newMode: EditorMode) => {
      if (newMode === editorMode) return
      // Entering WYSIWYG: derive a fresh tree from the latest markdown (markdown is authoritative).
      if (newMode === 'wysiwyg' && editorMode !== 'wysiwyg') {
        emit({ contentJson: plateValueFor(value, null), editorMode: newMode })
        return
      }
      // Leaving WYSIWYG or toggling markdown<->preview: markdown is already current
      // (kept in sync on every WYSIWYG edit below), so just change the mode.
      emit({ editorMode: newMode })
    },
    [editorMode, value, emit],
  )

  const modeButton = (mode: EditorMode, text: string) => (
    <button
      type="button"
      onClick={() => switchMode(mode)}
      className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${
        editorMode === mode
          ? 'bg-white text-brand-text shadow-sm dark:bg-slate-600'
          : 'text-brand-text-muted hover:text-brand-text'
      }`}
    >
      {text}
    </button>
  )

  return (
    <div>
      {label && <label className="block text-sm font-medium text-brand-text mb-1">{label}</label>}

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
          <PlateEditor
            initialValue={plateValueFor(value, contentJson)}
            onChange={(val) => emit({ contentJson: val, markdown: markdownFrom(val) })}
          />
        </div>
      ) : (
        <textarea
          value={value}
          onChange={(e) => emit({ markdown: e.target.value })}
          placeholder={placeholder}
          spellCheck={false}
          className="w-full border border-brand-border bg-brand-surface rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:bg-brand-bg-dark transition-colors font-mono resize-y"
          style={{ minHeight }}
        />
      )}
    </div>
  )
}
