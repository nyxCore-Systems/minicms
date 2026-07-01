import type { TElement } from '@udecode/plate'
import { markdownToPlate } from '@/components/admin/editor/serialization/markdownToPlate'
import { plateToMarkdown } from '@/components/admin/editor/serialization/plateToMarkdown'

export type EditorMode = 'markdown' | 'wysiwyg' | 'preview'

export interface ContentEditorValue {
  /** Source of truth. */
  markdown: string
  /** Mirror of the Plate tree; seeds WYSIWYG losslessly. */
  contentJson: TElement[]
  editorMode: EditorMode
}

const EDITOR_MODES: readonly EditorMode[] = ['markdown', 'wysiwyg', 'preview']

function normalizeMode(mode: unknown): EditorMode {
  return EDITOR_MODES.includes(mode as EditorMode) ? (mode as EditorMode) : 'markdown'
}

/**
 * Plate tree to seed the WYSIWYG surface. A non-empty mirror wins (exact
 * rehydration of what was saved); otherwise derive from the authoritative
 * markdown. Pass `null` to force a fresh derivation (mode-toggle re-entry).
 */
export function plateValueFor(markdown: string, contentJson: TElement[] | null): TElement[] {
  if (contentJson && contentJson.length > 0) return contentJson
  return markdownToPlate(markdown ?? '')
}

/** Regenerate authoritative markdown from a Plate tree. */
export function markdownFrom(plate: TElement[]): string {
  return plateToMarkdown(plate)
}

/**
 * Map a `HomepageSection.content` JSON blob to the triple. Backward-compatible
 * with legacy blobs that only carry `{ markdown }`, and with null/garbage.
 */
export function sectionContentToValue(blob: unknown): ContentEditorValue {
  const b = blob && typeof blob === 'object' ? (blob as Record<string, unknown>) : {}
  return {
    markdown: typeof b.markdown === 'string' ? b.markdown : '',
    contentJson: Array.isArray(b.contentJson) ? (b.contentJson as TElement[]) : [],
    editorMode: normalizeMode(b.editorMode),
  }
}

/**
 * Normalize the triple into the blob to persist into `HomepageSection.content`:
 * `contentJson` is never null (-> []), `editorMode` is always valid.
 */
export function valueToSectionContent(
  v: ContentEditorValue,
): { markdown: string; contentJson: TElement[]; editorMode: EditorMode } {
  return {
    markdown: typeof v.markdown === 'string' ? v.markdown : '',
    contentJson: Array.isArray(v.contentJson) ? v.contentJson : [],
    editorMode: normalizeMode(v.editorMode),
  }
}
