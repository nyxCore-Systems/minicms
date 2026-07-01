# P1 — Editor-Konsolidierung Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collapse the markdown⇄Plate serialization (copied at 4 sites) into one tested, React-free helper module, fix the reusable 3-mode editor component so it no longer drops `contentJson`, and give Artist bios / Event descriptions the full 3-mode toggle — without changing any public render output.

**Architecture:** A new pure helper module `src/lib/contentEditor.ts` owns all serialization orchestration + the `HomepageSection` blob mapping (testable under `tsx --test`). `MarkdownEditorField` becomes the single *controlled* 3-mode field that consumes those helpers and emits the whole `{markdown, contentJson, editorMode}` triple on every change; artists, events and sections adopt it. The content editor (`content/[id]`) keeps its bespoke power-editor UI but routes its three inline serializer calls through the same helpers. `PlateEditor` and the serializers (`markdownToPlate`/`plateToMarkdown`) are unchanged.

**Tech Stack:** Next.js 15 (App Router, React 19, `'use client'` admin pages), TypeScript, Plate.js v48 (`@udecode/plate`), Node built-in test runner via `tsx`.

## Global Constraints

- **Markdown is authoritative, `contentJson` is a mirror/cache.** The public renderer always renders from markdown (`MarkdownContent` + `parseBlocks`, P0-lossless). `contentJson` only seeds the WYSIWYG surface.
- **No changes** to `src/lib/directiveParser.ts`, `src/components/admin/editor/serialization/markdownToPlate.ts`, `.../plateToMarkdown.ts`, or `src/components/admin/editor/PlateEditor.tsx`. The P0 golden gate (`src/lib/__tests__/editor-roundtrip.test.ts`) stays green and remains the merge gate.
- **No Prisma migration.** `HomepageSection.content` is already `Json?`; the triple is stored inside that blob. `Page`, `Artist`, `Event` already have `content/contentJson/editorMode`, `bio/bioJson/editorMode`, `description/descriptionJson/editorMode` respectively.
- **Serialization only via** `markdownToPlate`/`plateToMarkdown`, called *exclusively* through `contentEditor.ts`. No new call site imports the serializers directly after this plan.
- **Tests live only in `src/lib/__tests__/*.test.ts`** (the `package.json` glob) and follow the existing convention: `import assert from 'node:assert/strict'`, flat top-level assertions inside `{ … }` blocks (no `node:test` `describe/it`), ending with `console.log('✓ <file> — all assertions passed')`. Run all: `npm test`. Run one: `npx tsx --test src/lib/__tests__/<file>.test.ts`.
- **No React component test runner exists.** Component correctness is verified by `npm run build` (types) + manual admin spot-check. All testable logic lives in `contentEditor.ts`.
- **`editorMode` persistence convention:** only `'markdown'` or `'wysiwyg'` are ever persisted; `'preview'` is a transient view. The parent coerces `preview → 'markdown'` before saving (matches `content/[id]/page.tsx:236` and the artists/events APIs which clamp to `['markdown','wysiwyg']`).
- Import alias: `@/*` → `./src/*`.
- Commit after every task. Do not push (the controller/user handles finishing the branch).

---

## File Structure

| File | Responsibility | Change |
|------|----------------|--------|
| `src/lib/contentEditor.ts` | Pure, React-free serialization orchestration + `HomepageSection` blob mapping. Exports `EditorMode`, `ContentEditorValue`, `plateValueFor`, `markdownFrom`, `sectionContentToValue`, `valueToSectionContent`. | **Create** |
| `src/lib/__tests__/contentEditor.test.ts` | TDD coverage of the four helpers incl. edge cases. | **Create** |
| `src/components/admin/MarkdownEditorField.tsx` | The one controlled 3-mode field. Consumes `contentEditor.ts`; emits the triple. | **Rewrite** |
| `src/app/admin/sections/page.tsx` | Hold the triple; seed via `sectionContentToValue`; submit via `valueToSectionContent` (drop fix). | **Modify** |
| `src/app/admin/artists/[id]/page.tsx` | Replace bare `PlateEditor` with `<MarkdownEditorField>` (new 3-mode). | **Modify** |
| `src/app/admin/events/[id]/page.tsx` | Replace bare `PlateEditor` with `<MarkdownEditorField>` (new 3-mode). | **Modify** |
| `src/app/admin/content/[id]/page.tsx` | Route the 3 inline serializer calls through `plateValueFor`/`markdownFrom`. UI unchanged. | **Modify** |
| `src/components/admin/editor/PlateEditor.tsx` | — | **Unchanged** |
| `src/app/api/admin/sections/route.ts` | Blob passthrough already correct (`content: content ?? …`). | **Unchanged (verify only)** |

---

## Task 1: Pure helpers `contentEditor.ts` (TDD)

**Files:**
- Create: `src/lib/contentEditor.ts`
- Test: `src/lib/__tests__/contentEditor.test.ts`

**Interfaces:**
- Consumes: `markdownToPlate(markdown: string): TElement[]` and `plateToMarkdown(value: TElement[]): string` from `@/components/admin/editor/serialization/*` (unchanged).
- Produces (relied on by Tasks 2–5):
  - `type EditorMode = 'markdown' | 'wysiwyg' | 'preview'`
  - `interface ContentEditorValue { markdown: string; contentJson: TElement[]; editorMode: EditorMode }`
  - `plateValueFor(markdown: string, contentJson: TElement[] | null): TElement[]` — non-empty mirror wins, else derive from markdown.
  - `markdownFrom(plate: TElement[]): string` — regenerate authoritative markdown.
  - `sectionContentToValue(blob: unknown): ContentEditorValue` — read a `HomepageSection.content` blob (legacy `{markdown}` safe).
  - `valueToSectionContent(v: ContentEditorValue): { markdown: string; contentJson: TElement[]; editorMode: EditorMode }` — normalize the blob to persist (never `null` json; valid mode).

**Behavioral notes (established empirically):** `markdownToPlate('')` returns `[{type:'p',children:[{text:''}]}]` (length 1, not `[]`); `plateToMarkdown([])` and `plateToMarkdown(markdownToPlate(''))` both return `''`. So "non-empty mirror" must test `contentJson.length > 0` — a stored `[]` or `null` falls back to deriving from markdown.

- [ ] **Step 1: Write the failing test**

Create `src/lib/__tests__/contentEditor.test.ts`:

```ts
import assert from 'node:assert/strict'
import { markdownToPlate } from '@/components/admin/editor/serialization/markdownToPlate'
import {
  plateValueFor,
  markdownFrom,
  sectionContentToValue,
  valueToSectionContent,
  type ContentEditorValue,
} from '@/lib/contentEditor'

// plateValueFor: a non-empty mirror is preferred verbatim (lossless rehydration)
{
  const mirror = markdownToPlate('# Aus JSON')
  assert.deepEqual(plateValueFor('# Aus Markdown', mirror), mirror)
}
// plateValueFor: null mirror -> derive from markdown
{
  assert.deepEqual(plateValueFor('# Hallo', null), markdownToPlate('# Hallo'))
}
// plateValueFor: empty-array mirror (legacy record) -> derive from markdown
{
  assert.deepEqual(plateValueFor('# Hallo', []), markdownToPlate('# Hallo'))
}
// markdownFrom: round-trips a derived tree back to identical markdown (P0-lossless)
{
  const md = '# Titel\n\nAbsatz mit **fett** und *kursiv*.'
  assert.equal(markdownFrom(markdownToPlate(md)), md)
}
// markdownFrom: empty tree -> empty string
{
  assert.equal(markdownFrom([]), '')
}
// sectionContentToValue: full triple blob passes through unchanged
{
  const tree = markdownToPlate('# X')
  assert.deepEqual(
    sectionContentToValue({ markdown: '# X', contentJson: tree, editorMode: 'wysiwyg' }),
    { markdown: '# X', contentJson: tree, editorMode: 'wysiwyg' },
  )
}
// sectionContentToValue: legacy { markdown } blob -> safe defaults
{
  assert.deepEqual(
    sectionContentToValue({ markdown: 'alt' }),
    { markdown: 'alt', contentJson: [], editorMode: 'markdown' },
  )
}
// sectionContentToValue: null / non-object blob -> empty defaults
{
  const expected = { markdown: '', contentJson: [], editorMode: 'markdown' }
  assert.deepEqual(sectionContentToValue(null), expected)
  assert.deepEqual(sectionContentToValue(undefined), expected)
  assert.deepEqual(sectionContentToValue('nope'), expected)
}
// sectionContentToValue: invalid editorMode -> 'markdown'
{
  assert.equal(sectionContentToValue({ markdown: 'x', editorMode: 'bogus' }).editorMode, 'markdown')
}
// valueToSectionContent: null contentJson normalized to []
{
  const v = { markdown: 'x', contentJson: null, editorMode: 'wysiwyg' } as unknown as ContentEditorValue
  assert.deepEqual(valueToSectionContent(v), { markdown: 'x', contentJson: [], editorMode: 'wysiwyg' })
}
// valueToSectionContent: invalid editorMode -> 'markdown'; missing markdown -> ''
{
  const v = { markdown: undefined, contentJson: [], editorMode: 'bogus' } as unknown as ContentEditorValue
  assert.deepEqual(valueToSectionContent(v), { markdown: '', contentJson: [], editorMode: 'markdown' })
}

console.log('✓ contentEditor.test.ts — all assertions passed')
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx tsx --test src/lib/__tests__/contentEditor.test.ts`
Expected: FAIL — the module `@/lib/contentEditor` does not exist yet (module-resolution / import error).

- [ ] **Step 3: Write the minimal implementation**

Create `src/lib/contentEditor.ts`:

```ts
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx tsx --test src/lib/__tests__/contentEditor.test.ts`
Expected: PASS, output pristine, ending with `✓ contentEditor.test.ts — all assertions passed`.

- [ ] **Step 5: Run the full suite (guard the P0 gate)**

Run: `npm test`
Expected: all four existing files + the new one pass; `editor-roundtrip.test.ts` still green.

- [ ] **Step 6: Commit**

```bash
git add src/lib/contentEditor.ts src/lib/__tests__/contentEditor.test.ts
git commit -m "feat(editor): pure contentEditor helpers for markdown<->Plate + section blob mapping"
```

---

## Task 2: Rewrite `MarkdownEditorField` + migrate the sections page (drop fix)

**Files:**
- Modify (rewrite): `src/components/admin/MarkdownEditorField.tsx`
- Modify: `src/app/admin/sections/page.tsx` (state `:449`, reset `:560`, load `:646`, submit `:778-780`, usage `:1592-1594`, imports `:29`)
- Verify only (no edit expected): `src/app/api/admin/sections/route.ts`

**Interfaces:**
- Consumes: `EditorMode`, `ContentEditorValue`, `plateValueFor`, `markdownFrom` (Task 1); `sectionContentToValue`, `valueToSectionContent` (Task 1); `PlateEditor` (unchanged), `MarkdownContent` (unchanged).
- Produces: the controlled component
  ```ts
  interface MarkdownEditorFieldProps {
    value: string
    contentJson?: TElement[] | null
    editorMode?: EditorMode            // default 'markdown'
    onChange: (next: ContentEditorValue) => void
    label?: string
    placeholder?: string
    minHeight?: number                 // px, default 200
  }
  ```
  relied on by Tasks 3 & 4.

**Why component + sections together:** sections is the component's only current caller. Rewriting the props/`onChange` signature breaks that caller's `onChange={setContentMarkdown}` and `minHeight="250px"` immediately, so both must land in one task to keep the build green — and this is exactly the `contentJson`-drop fix.

- [ ] **Step 1: Rewrite the component**

Replace the entire contents of `src/components/admin/MarkdownEditorField.tsx` with:

```tsx
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
          ? 'bg-white text-brand-text shadow-sm'
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
```

Notes for the implementer:
- The component is fully controlled — it holds **no** `useState`. `minHeight` is now a **number** (px); React renders `style={{ minHeight: 250 }}` as `min-height: 250px`.
- `PlateEditor.initialValue` is read once at mount (Plate builds the editor from it). Rendering it only when `editorMode === 'wysiwyg'` means it mounts with the freshly-seeded tree each time WYSIWYG is entered. Do not add a `key` or try to push updates into a mounted `PlateEditor`.
- In WYSIWYG, every edit regenerates markdown (`markdownFrom(val)`) so the parent's `markdown` is never stale at save time.

- [ ] **Step 2: Migrate the sections page state**

In `src/app/admin/sections/page.tsx`:

Add imports near the existing `MarkdownEditorField` import (`:29`):

```ts
import type { TElement } from '@udecode/plate'
import { sectionContentToValue, valueToSectionContent, type EditorMode } from '@/lib/contentEditor'
```

Replace the state declaration at `:449`:

```ts
// from:
const [contentMarkdown, setContentMarkdown] = useState('')
// to:
const [contentMarkdown, setContentMarkdown] = useState('')
const [contentJson, setContentJson] = useState<TElement[]>([])
const [contentEditorMode, setContentEditorMode] = useState<EditorMode>('markdown')
```

- [ ] **Step 3: Seed on load and clear on reset**

Replace the reset at `:560` (`setContentMarkdown('')`):

```ts
setContentMarkdown('')
setContentJson([])
setContentEditorMode('markdown')
```

Replace the load at `:646` (`setContentMarkdown((content?.markdown as string) || '')`):

```ts
const cv = sectionContentToValue(content)
setContentMarkdown(cv.markdown)
setContentJson(cv.contentJson)
setContentEditorMode(cv.editorMode)
```

(`content` is the loaded section's `content` blob already in scope at that line.)

- [ ] **Step 4: Fix the submit (the drop)**

Replace the `formType === 'content'` branch at `:778-780`:

```ts
} else if (formType === 'content') {
  if (!contentMarkdown.trim()) throw new Error('Markdown-Inhalt darf nicht leer sein')
  parsedContent = valueToSectionContent({
    markdown: contentMarkdown,
    contentJson,
    // never persist 'preview' — it is a transient view
    editorMode: contentEditorMode === 'preview' ? 'markdown' : contentEditorMode,
  })
}
```

- [ ] **Step 5: Update the field usage**

Replace the `<MarkdownEditorField …>` block at `:1592-1594`:

```tsx
<MarkdownEditorField
  value={contentMarkdown}
  contentJson={contentJson}
  editorMode={contentEditorMode}
  onChange={(next) => {
    setContentMarkdown(next.markdown)
    setContentJson(next.contentJson)
    setContentEditorMode(next.editorMode)
  }}
  label="Markdown-Inhalt"
  placeholder="# Ueberschrift&#10;&#10;Ihr Markdown-Inhalt hier..."
  minHeight={250}
/>
```

- [ ] **Step 6: Verify the sections API passes the blob through (read-only)**

Read `src/app/api/admin/sections/route.ts` around `:62` (create) and `:100` (update). Confirm `content` is written as-is (`content: content || null` / `content: content !== undefined ? content : undefined`). No edit expected. If — and only if — it strips unknown keys, report it as a concern (do not change it without controller sign-off).

- [ ] **Step 7: Build**

Run: `npm run build`
Expected: `prisma generate` + `next build` succeed, no type errors (esp. in `sections/page.tsx` and `MarkdownEditorField.tsx`).

- [ ] **Step 8: Run the full suite**

Run: `npm test`
Expected: all green (this task changes no `.test.ts`, but confirms nothing regressed at the import graph).

- [ ] **Step 9: Commit**

```bash
git add src/components/admin/MarkdownEditorField.tsx src/app/admin/sections/page.tsx
git commit -m "feat(editor): controlled 3-mode MarkdownEditorField; fix sections contentJson drop"
```

---

## Task 3: Artists page → shared field (new 3-mode)

**Files:**
- Modify: `src/app/admin/artists/[id]/page.tsx` (imports `:5-9,11-14`, state `:40`, load `:59`, save `:67,73`, editor UI `:143`)

**Interfaces:**
- Consumes: `<MarkdownEditorField>` (Task 2), `EditorMode` (Task 1). The artist GET returns `bio`, `bioJson`, `editorMode`; the PUT accepts `bio`, `bioJson`, `editorMode` (API clamps mode to `['markdown','wysiwyg']`).
- Produces: nothing downstream.

**Context:** The bio editor is a *bare* `PlateEditor` (WYSIWYG-only, `editorMode` forced to `'wysiwyg'` on save). It has **no** image-insertion wiring (the page's `MediaPickerDialog` serves hero/gallery, not the bio), so the swap loses no functionality. Existing artist records were saved with `editorMode: 'wysiwyg'`, so they will open in WYSIWYG (unchanged UX); only records defaulting to `'markdown'` open in markdown.

- [ ] **Step 1: Update imports**

In `src/app/admin/artists/[id]/page.tsx`:
- Remove the now-unused serializer imports (`:8-9`) and the dynamic `PlateEditor` import (`:11-14`).
- Add:
  ```ts
  import MarkdownEditorField from '@/components/admin/MarkdownEditorField'
  import { type EditorMode } from '@/lib/contentEditor'
  ```
- Keep `import type { TElement } from '@udecode/plate'` (still used for `bioJson`).

- [ ] **Step 2: Replace bio state**

Replace `const [bioJson, setBioJson] = useState<TElement[] | null>(null)` (`:40`) with the triple + a load flag:

```ts
const [bio, setBio] = useState('')
const [bioJson, setBioJson] = useState<TElement[]>([])
const [bioMode, setBioMode] = useState<EditorMode>('markdown')
const [loaded, setLoaded] = useState(false)
```

- [ ] **Step 3: Seed the triple on load**

Replace `setBioJson(a.bioJson || markdownToPlate(a.bio || ''))` (`:59`) with:

```ts
setBio(a.bio || '')
setBioJson(Array.isArray(a.bioJson) ? a.bioJson : [])
setBioMode((a.editorMode === 'markdown' || a.editorMode === 'wysiwyg') ? a.editorMode : 'markdown')
```

Then, at the end of the same `.then((a) => { … })` callback (after `setGallery(...)`), add:

```ts
setLoaded(true)
```

- [ ] **Step 4: Send the triple on save**

In `save()` (`:65-83`), delete the line `const bio = bioJson ? plateToMarkdown(bioJson) : ''` (`:67`) — `bio` is now state, kept fresh by the field. Update the request body (`:73`) from:

```ts
bio, bioJson, editorMode: 'wysiwyg', socials, media: gallery,
```

to:

```ts
bio, bioJson, editorMode: bioMode, socials, media: gallery,
```

(`bio`, `bioJson`, `bioMode` all now refer to state.)

- [ ] **Step 5: Swap the editor UI**

Replace the bio editor line (`:143`):

```tsx
{bioJson !== null && <PlateEditor initialValue={bioJson} onChange={(v) => setBioJson(v)} />}
```

with:

```tsx
{loaded && (
  <MarkdownEditorField
    value={bio}
    contentJson={bioJson}
    editorMode={bioMode}
    onChange={(next) => {
      setBio(next.markdown)
      setBioJson(next.contentJson)
      setBioMode(next.editorMode)
    }}
    minHeight={300}
  />
)}
```

(Keep the surrounding `<h2 className="mb-2 font-semibold">Bio</h2>` heading; do not pass `label`.)

- [ ] **Step 6: Build**

Run: `npm run build`
Expected: success, no type errors. If `markdownToPlate`/`plateToMarkdown` or `PlateEditor`/`dynamic` are reported unused, confirm you removed their imports in Step 1.

- [ ] **Step 7: Commit**

```bash
git add "src/app/admin/artists/[id]/page.tsx"
git commit -m "feat(editor): artist bio uses shared 3-mode MarkdownEditorField"
```

---

## Task 4: Events page → shared field (new 3-mode)

**Files:**
- Modify: `src/app/admin/events/[id]/page.tsx` (imports `:5,7-9,13-16`, state `:45`, load `:66`, save `:81,88`, editor UI `:149`)

**Interfaces:**
- Consumes: `<MarkdownEditorField>` (Task 2), `EditorMode` (Task 1). The event GET returns `description`, `descriptionJson`, `editorMode`; the PUT accepts them (API clamps mode to `['markdown','wysiwyg']`).
- Produces: nothing downstream.

**Context:** Symmetric to Task 3. The description editor is a bare WYSIWYG-only `PlateEditor` with no media wiring. Events already have a `loaded` flag (`:50`), reused here.

- [ ] **Step 1: Update imports**

In `src/app/admin/events/[id]/page.tsx`:
- Remove the serializer imports (`:7-8`) and the dynamic `PlateEditor` import (`:13-16`).
- Add:
  ```ts
  import MarkdownEditorField from '@/components/admin/MarkdownEditorField'
  import { type EditorMode } from '@/lib/contentEditor'
  ```
- Keep `import type { TElement } from '@udecode/plate'` (still used for `descJson`).

- [ ] **Step 2: Replace description state**

Replace `const [descJson, setDescJson] = useState<TElement[] | null>(null)` (`:45`) with:

```ts
const [description, setDescription] = useState('')
const [descJson, setDescJson] = useState<TElement[]>([])
const [descMode, setDescMode] = useState<EditorMode>('markdown')
```

(The existing `loaded` state at `:50` is reused — do not remove it.)

- [ ] **Step 3: Seed the triple on load**

Replace `setDescJson(e.descriptionJson || markdownToPlate(e.description || ''))` (`:66`) with:

```ts
setDescription(e.description || '')
setDescJson(Array.isArray(e.descriptionJson) ? e.descriptionJson : [])
setDescMode((e.editorMode === 'markdown' || e.editorMode === 'wysiwyg') ? e.editorMode : 'markdown')
```

- [ ] **Step 4: Send the triple on save**

In `save()` (`:79-103`), delete `const description = descJson ? plateToMarkdown(descJson) : ''` (`:81`). Update the body (`:88`) from:

```ts
description, descriptionJson: descJson, editorMode: 'wysiwyg',
```

to:

```ts
description, descriptionJson: descJson, editorMode: descMode,
```

- [ ] **Step 5: Swap the editor UI**

Replace the description editor line (`:149`):

```tsx
{descJson !== null && <PlateEditor initialValue={descJson} onChange={(v: TElement[]) => setDescJson(v)} />}
```

with:

```tsx
{loaded && (
  <MarkdownEditorField
    value={description}
    contentJson={descJson}
    editorMode={descMode}
    onChange={(next) => {
      setDescription(next.markdown)
      setDescJson(next.contentJson)
      setDescMode(next.editorMode)
    }}
    minHeight={300}
  />
)}
```

(Keep the surrounding `<span className="mb-1 block text-sm font-medium">Beschreibung</span>` label markup.)

- [ ] **Step 6: Build**

Run: `npm run build`
Expected: success, no type errors / no unused-import errors.

- [ ] **Step 7: Commit**

```bash
git add "src/app/admin/events/[id]/page.tsx"
git commit -m "feat(editor): event description uses shared 3-mode MarkdownEditorField"
```

---

## Task 5: Content editor routes serialization through helpers (UI unchanged)

**Files:**
- Modify: `src/app/admin/content/[id]/page.tsx` (imports `:12-13`, save `:211`, mode-switch `:430,435`)

**Interfaces:**
- Consumes: `plateValueFor`, `markdownFrom` (Task 1).
- Produces: nothing downstream.

**Context:** The content editor keeps its bespoke UI (media picker in both modes, help panel, page-level toolbar toggle, versions). This task only removes the direct serializer imports, replacing the three call sites with the shared helpers — **behavior must stay identical**. Mapping:
- `markdownToPlate(content)` → `plateValueFor(content, null)` (identical: `null` mirror forces derive-from-markdown).
- `plateToMarkdown(contentJson)` → `markdownFrom(contentJson)` (identical thin wrapper).

- [ ] **Step 1: Swap the imports**

In `src/app/admin/content/[id]/page.tsx`, replace lines `:12-13`:

```ts
import { markdownToPlate } from '@/components/admin/editor/serialization/markdownToPlate'
import { plateToMarkdown } from '@/components/admin/editor/serialization/plateToMarkdown'
```

with:

```ts
import { plateValueFor, markdownFrom } from '@/lib/contentEditor'
```

- [ ] **Step 2: Route the save path**

In `save()` (`:210-212`), replace:

```ts
markdownContent = plateToMarkdown(contentJson)
```

with:

```ts
markdownContent = markdownFrom(contentJson)
```

- [ ] **Step 3: Route the mode-switch path**

In `switchEditorMode` (`:428-438`), replace the markdown→wysiwyg branch:

```ts
const plateValue = markdownToPlate(content)
setContentJson(plateValue)
```

with:

```ts
setContentJson(plateValueFor(content, null))
```

and the wysiwyg→markdown branch:

```ts
const md = plateToMarkdown(contentJson)
setContent(md)
```

with:

```ts
setContent(markdownFrom(contentJson))
```

- [ ] **Step 4: Confirm no other serializer references remain**

Run: `grep -n "markdownToPlate\|plateToMarkdown" "src/app/admin/content/[id]/page.tsx"`
Expected: **no output** (all three call sites and both imports are gone).

- [ ] **Step 5: Build**

Run: `npm run build`
Expected: success, no type errors / no unused-import errors.

- [ ] **Step 6: Run the full suite**

Run: `npm test`
Expected: all green.

- [ ] **Step 7: Commit**

```bash
git add "src/app/admin/content/[id]/page.tsx"
git commit -m "refactor(editor): content editor routes serialization through contentEditor helpers"
```

---

## Final Verification (after all tasks)

- [ ] `npm test` — all files green, incl. P0 `editor-roundtrip.test.ts` and new `contentEditor.test.ts`.
- [ ] `npm run build` — clean.
- [ ] `npm run lint` — no new errors (CI does not run lint; check locally).
- [ ] **Confirm the serializers are now called only through `contentEditor.ts`:**
      `grep -rn "serialization/markdownToPlate\|serialization/plateToMarkdown" src/ | grep -v "src/lib/contentEditor.ts\|src/lib/__tests__/\|src/components/admin/editor/serialization/"`
      Expected: **no output** (only `contentEditor.ts` and tests import the serializers).
- [ ] **Manual admin spot-check** (dev server), all four surfaces — load → toggle Markdown/WYSIWYG/Preview → edit → save → reload → verify persisted triple and unchanged public render:
  - `/admin/content/[id]` (Pages) — power-editor UI intact (media picker in both modes, help panel, versions).
  - `/admin/artists/[id]` — bio now has the 3-mode toggle; saved bio renders unchanged on `/kuenstler/[slug]`.
  - `/admin/events/[id]` — description now has the 3-mode toggle; renders unchanged on `/events/[slug]`.
  - `/admin/sections` — **drop fix:** edit a `content` section in WYSIWYG → save → reload → `contentJson` is persisted inside `HomepageSection.content`; public homepage render unchanged.

---

## Self-Review

**1. Spec coverage.**
- "One shared 3-mode component for the simple fields" → Task 2 (component) + Tasks 3/4 (artists, events adopt it) + Task 2 (sections adopts it). ✅
- "Serialization at one place, consumed by all four surfaces" → Task 1 (helpers); consumed by Task 2 (component + sections), Tasks 3/4 (via component), Task 5 (content page). Final-verification grep enforces no direct serializer imports remain elsewhere. ✅
- "contentJson drop at /admin/sections fixed" → Task 2 Steps 2–5. ✅
- "Artists/Events get full 3-mode" → Tasks 3 & 4. ✅
- "Content page keeps bespoke UI, shares serialization" (refined decision) → Task 5. ✅
- Non-goals (no textarea-only fields, no `*Json` removal, no directive/serializer changes, no migration) → respected; Global Constraints forbid serializer/parser edits and migrations. ✅

**2. Placeholder scan.** No `TBD`/`TODO`/"add error handling"/"similar to Task N" — every code step carries full code and exact commands. ✅

**3. Type consistency.** `EditorMode` and `ContentEditorValue` are defined once in Task 1 and imported everywhere. Helper names (`plateValueFor`, `markdownFrom`, `sectionContentToValue`, `valueToSectionContent`) are used verbatim in Tasks 2–5. `minHeight` is a `number` in the new component and every caller passes a number (`250`, `300`). `contentJson` state is typed `TElement[]` (never `null`) in the pages; the component prop is `TElement[] | null` and defaults to `null`. Consistent. ✅

**4. Edge-case coverage.** Empty content (`markdownToPlate('') → 1 empty paragraph`, `plateToMarkdown([]) → ''`), legacy `contentJson=null`/`[]` (falls back to markdown), legacy section blob `{markdown}` only, invalid/`preview` `editorMode` on persist — all covered by `contentEditor.test.ts` (Task 1) and the persistence convention in Task 2. ✅
