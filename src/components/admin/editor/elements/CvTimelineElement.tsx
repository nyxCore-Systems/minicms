'use client'

import React, { useCallback, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { PlateElement, type PlateElementProps } from '@udecode/plate/react'
import { DirectiveWrapper } from './DirectiveWrapper'
import type { CvTimelineElement as CvTimelineElementType } from '../types'

function TimelinePreview({ content }: { content: string }) {
  const entries = content
    .split(/\n---\n/)
    .map((s) => s.trim())
    .filter(Boolean)

  if (entries.length === 0) {
    return (
      <p className="text-xs text-brand-text-muted italic py-2">
        Noch keine Einträge. Markdown eingeben und mit --- trennen.
      </p>
    )
  }

  return (
    <div className="relative my-2">
      <div className="absolute left-[7px] top-0 bottom-0 w-0.5 bg-brand-text-muted/20" />
      {entries.map((entry, i) => (
        <div key={i} className="relative pl-8 pb-4 last:pb-0">
          <div className="absolute left-0 top-1.5 w-4 h-4 rounded-full border-2 border-brand-accent bg-brand-bg z-[1]" />
          <div className="prose-glass text-sm [&>:first-child]:mt-0 [&>:last-child]:mb-0 [&_img]:max-h-32 [&_img]:rounded">
            <ReactMarkdown>{entry}</ReactMarkdown>
          </div>
        </div>
      ))}
    </div>
  )
}

export function CvTimelineElement(props: PlateElementProps<CvTimelineElementType>) {
  const { children, element, editor } = props
  const [raw, setRaw] = useState(element.rawMarkdown || '')
  const [editing, setEditing] = useState(!element.rawMarkdown)

  const update = useCallback((value: string) => {
    setRaw(value)
    const path = editor.api.findPath(element)
    if (path) {
      editor.tf.setNodes({ rawMarkdown: value } as any, { at: path })
    }
  }, [editor, element])

  return (
    <PlateElement {...props}>
      <DirectiveWrapper label="CV-Timeline" color="void">
        <div contentEditable={false}>
          {editing ? (
            <>
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] text-brand-text-muted">Einträge mit --- trennen</p>
                {raw && (
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="text-[10px] text-brand-accent hover:underline"
                  >
                    Vorschau
                  </button>
                )}
              </div>
              <textarea
                value={raw}
                onChange={(e) => update(e.target.value)}
                className="w-full bg-brand-surface border border-gray-200 rounded p-2 font-mono text-xs resize-y min-h-[6rem]"
                placeholder={"### 25.03.2026 — Titel\nBeschreibung...\n---\n### 24.03.2026 — Titel\nBeschreibung..."}
              />
            </>
          ) : (
            <>
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] text-brand-text-muted">{raw.split(/\n---\n/).filter(s => s.trim()).length} Einträge</p>
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="text-[10px] text-brand-accent hover:underline"
                >
                  Bearbeiten
                </button>
              </div>
              <TimelinePreview content={raw} />
            </>
          )}
        </div>
        <span className="hidden">{children}</span>
      </DirectiveWrapper>
    </PlateElement>
  )
}
