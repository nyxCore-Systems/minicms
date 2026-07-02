# P2 — Barrierefreie Toolbar-Primitive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Plate editor toolbar a conformant WAI-ARIA toolbar — keyboard-operable buttons that preserve the editor's text selection, roving tabindex, `aria-pressed`/`aria-label`, a visible focus ring, a contrast-safe palette, and a no-keyboard-trap "+ Block" menu — built on a small set of reusable primitives that P3/P4 will reuse.

**Architecture:** The only testable logic — "given a key + current focus index, what's the next index" — is a pure function `src/lib/toolbarNav.ts` (node:test). A dependency-free primitive set under `src/components/admin/editor/toolbar/` (`Toolbar`, `ToolbarButton`, `ToolbarToggleButton`, `ToolbarSeparator`) implements the roving-tabindex mechanics; `Toolbar` owns roving via DOM queries + an imperative tabindex layout-effect. `PlateToolbar` is rewritten to compose the primitives; `PlateEditor`'s command handlers append `editor.tf.focus()` so keyboard activation returns the caret to the text.

**Tech Stack:** Next.js 15 (React 19, `'use client'`), TypeScript, Plate.js v48 (`@udecode/plate`), Node built-in test runner via `tsx`.

## Global Constraints

- **No new toolbar buttons.** Undo/Redo is P3, link UI is P4. This plan only makes the *existing* controls (bold/italic/strike, H1–H3, image, "+ Block") accessible.
- **Buttons must work by mouse AND keyboard without losing the editor selection.** Pattern in every primitive: `onMouseDown` → `preventDefault()` **only** (no action); `onClick` → run the command (fires once for both mouse-up and keyboard Enter/Space). Focus is returned to the editor by `PlateEditor`'s handlers (`editor.tf.focus()`), not by the primitives.
- **Primitives stay editor-agnostic** (expose `onActivate`; no Plate imports) so P3/P4 reuse them.
- **WAI-ARIA Toolbar pattern:** container `role="toolbar"` + `aria-label` + `aria-orientation="horizontal"`; exactly one focusable control is tabbable (roving tabindex); ArrowLeft/Right (+ Up/Down aliases) move focus with wrap, Home/End jump to ends; separators are not focusable.
- **Contrast (Accessibility-Gate #5):** the admin editor `.glass` background is `--brand-surface` = `#ffffff`. Use theme-adaptive brand tokens verified ≥4.5:1 on white: idle `text-brand-text-muted` (`#4a4f54`), hover `text-brand-text` (`#32373c`) — **not** the theme-blind `text-gray-700` — active `text-brand-accent` (`#a90707`), plus a visible `focus-visible:ring-2 focus-visible:ring-brand-accent`.
- **`SlashCommandMenu` is not modified** — it already calls `onClose` on every close path (Escape, Enter-select, click-select). Focus-return-to-trigger lives in `PlateToolbar`'s `onClose`.
- **No changes** to serialization, directives, `directiveParser.ts`, or the P0 golden gate. Tests live only in `src/lib/__tests__/*.test.ts` (convention: `node:assert/strict`, flat `{ }` assertion blocks, no `node:test` describe/it, end with a `console.log('✓ …')` line). Run all: `npm test`. Run one: `npx tsx --test src/lib/__tests__/<file>.test.ts`. Build: `npm run build`.
- Import alias `@/*` → `./src/*`. Commit after every task; do not push (controller finishes the branch).

---

## File Structure

| File | Responsibility | Change |
|---|---|---|
| `src/lib/toolbarNav.ts` | Pure `nextToolbarIndex(key, current, count)` — roving-index math. | **Create** |
| `src/lib/__tests__/toolbarNav.test.ts` | node:test coverage of the nav function. | **Create** |
| `src/components/admin/editor/toolbar/Toolbar.tsx` | Container: role/aria + roving tabindex (DOM query + imperative tabindex). | **Create** |
| `src/components/admin/editor/toolbar/ToolbarButton.tsx` | `ToolbarButton` (forwardRef) + `ToolbarToggleButton` (aria-pressed). | **Create** |
| `src/components/admin/editor/toolbar/ToolbarSeparator.tsx` | Non-focusable `role="separator"`. | **Create** |
| `src/components/admin/editor/toolbar/index.ts` | Barrel re-export. | **Create** |
| `src/components/admin/editor/PlateToolbar.tsx` | Rewrite to compose primitives; block-menu focus-return. | **Rewrite** |
| `src/components/admin/editor/PlateEditor.tsx` | Append `editor.tf.focus()` in `toggleMark`/`insertNode`. | **Modify** |
| `src/components/admin/editor/SlashCommandMenu.tsx` | — | **Unchanged** |

---

## Task 1: Pure roving-index logic `toolbarNav.ts` (TDD)

**Files:**
- Create: `src/lib/toolbarNav.ts`
- Test: `src/lib/__tests__/toolbarNav.test.ts`

**Interfaces:**
- Produces (consumed by Task 2's `Toolbar`): `nextToolbarIndex(key: string, current: number, count: number): number | null`.

- [ ] **Step 1: Write the failing test**

Create `src/lib/__tests__/toolbarNav.test.ts`:

```ts
import assert from 'node:assert/strict'
import { nextToolbarIndex } from '@/lib/toolbarNav'

// ArrowRight / ArrowDown advance, wrapping at the end
assert.equal(nextToolbarIndex('ArrowRight', 0, 3), 1)
assert.equal(nextToolbarIndex('ArrowRight', 2, 3), 0) // wrap to first
assert.equal(nextToolbarIndex('ArrowDown', 1, 3), 2)  // Down is an alias for Right

// ArrowLeft / ArrowUp retreat, wrapping at the start
assert.equal(nextToolbarIndex('ArrowLeft', 1, 3), 0)
assert.equal(nextToolbarIndex('ArrowLeft', 0, 3), 2)  // wrap to last
assert.equal(nextToolbarIndex('ArrowUp', 2, 3), 1)    // Up is an alias for Left

// Home / End jump to the ends
assert.equal(nextToolbarIndex('Home', 2, 3), 0)
assert.equal(nextToolbarIndex('End', 0, 3), 2)

// Non-navigation keys return null (event passes through)
assert.equal(nextToolbarIndex('Enter', 0, 3), null)
assert.equal(nextToolbarIndex(' ', 0, 3), null)
assert.equal(nextToolbarIndex('a', 0, 3), null)

// Single-item toolbar: wrap keeps index at 0
assert.equal(nextToolbarIndex('ArrowRight', 0, 1), 0)
assert.equal(nextToolbarIndex('ArrowLeft', 0, 1), 0)
assert.equal(nextToolbarIndex('End', 0, 1), 0)

// Empty toolbar guard: never returns a bad index
assert.equal(nextToolbarIndex('ArrowRight', 0, 0), null)
assert.equal(nextToolbarIndex('Home', 0, 0), null)

console.log('✓ toolbarNav.test.ts — all assertions passed')
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx tsx --test src/lib/__tests__/toolbarNav.test.ts`
Expected: FAIL — `@/lib/toolbarNav` does not exist yet (module-resolution error).

- [ ] **Step 3: Write the minimal implementation**

Create `src/lib/toolbarNav.ts`:

```ts
/**
 * Roving-tabindex math for a horizontal WAI-ARIA toolbar.
 * Returns the next focus index for a navigation key, or null if `key` is not
 * a navigation key (the caller then lets the event through). Arrow movement
 * wraps; Home/End jump to the ends.
 *
 * @param key     KeyboardEvent.key
 * @param current index of the currently focused control (0-based)
 * @param count   number of focusable controls in the toolbar
 */
export function nextToolbarIndex(key: string, current: number, count: number): number | null {
  if (count <= 0) return null
  switch (key) {
    case 'ArrowRight':
    case 'ArrowDown':
      return (current + 1) % count
    case 'ArrowLeft':
    case 'ArrowUp':
      return (current - 1 + count) % count
    case 'Home':
      return 0
    case 'End':
      return count - 1
    default:
      return null
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx tsx --test src/lib/__tests__/toolbarNav.test.ts`
Expected: PASS, output pristine, ends with `✓ toolbarNav.test.ts — all assertions passed`.

- [ ] **Step 5: Run the full suite (guard the P0 gate)**

Run: `npm test`
Expected: all files green (new `toolbarNav.test.ts` + existing incl. P0 `editor-roundtrip.test.ts` and P1 `contentEditor.test.ts`).

- [ ] **Step 6: Commit**

```bash
git add src/lib/toolbarNav.ts src/lib/__tests__/toolbarNav.test.ts
git commit -m "feat(editor): pure nextToolbarIndex for accessible toolbar roving tabindex"
```

---

## Task 2: Reusable toolbar primitives

**Files:**
- Create: `src/components/admin/editor/toolbar/Toolbar.tsx`
- Create: `src/components/admin/editor/toolbar/ToolbarButton.tsx`
- Create: `src/components/admin/editor/toolbar/ToolbarSeparator.tsx`
- Create: `src/components/admin/editor/toolbar/index.ts`

**Interfaces:**
- Consumes: `nextToolbarIndex` (Task 1).
- Produces (consumed by Task 3, and later P3/P4):
  - `Toolbar({ label: string; className?: string; children: React.ReactNode })`
  - `ToolbarButton` — `React.forwardRef<HTMLButtonElement, { label: string; onActivate: () => void; children: React.ReactNode; className?: string }>`
  - `ToolbarToggleButton({ label: string; pressed: boolean; onActivate: () => void; children: React.ReactNode })`
  - `ToolbarSeparator()` (no props)

**Design notes for the implementer:**
- Roving tabindex is owned by `Toolbar`: it does **not** track child indices in React state. On keydown it queries its focusable children via `[data-toolbar-item="true"]`, finds the focused one, computes the next index with `nextToolbarIndex`, and `.focus()`es it. A `useLayoutEffect` sets `tabIndex` imperatively on those DOM nodes (active → `0`, rest → `-1`) — the buttons render **no** `tabIndex` prop so React never fights the imperative value. `onFocusCapture` keeps `activeIndex` in sync when a button is focused by Tab/click.
- Buttons carry `data-toolbar-item="true"`; the separator does **not**, so roving skips it.
- `ToolbarButton` is `forwardRef` because Task 3 needs a ref on the "+ Block" trigger.

- [ ] **Step 1: Create `Toolbar.tsx`**

```tsx
'use client'

import React, { useRef, useState, useLayoutEffect, useCallback } from 'react'
import { nextToolbarIndex } from '@/lib/toolbarNav'

interface ToolbarProps {
  /** Accessible name announced for the toolbar (WAI-ARIA requires one). */
  label: string
  className?: string
  children: React.ReactNode
}

/**
 * WAI-ARIA toolbar container with roving tabindex. Exactly one focusable
 * control (marked `data-toolbar-item="true"`) is tabbable at a time; arrow
 * keys / Home / End move focus among them.
 */
export function Toolbar({ label, className, children }: ToolbarProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)

  const getItems = useCallback((): HTMLButtonElement[] => {
    if (!ref.current) return []
    return Array.from(ref.current.querySelectorAll<HTMLButtonElement>('[data-toolbar-item="true"]'))
  }, [])

  // Roving tabindex: only the active control is tabbable.
  useLayoutEffect(() => {
    const items = getItems()
    if (items.length === 0) return
    const active = Math.min(activeIndex, items.length - 1)
    items.forEach((el, i) => { el.tabIndex = i === active ? 0 : -1 })
  }, [activeIndex, getItems])

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    const items = getItems()
    if (items.length === 0) return
    const current = Math.max(0, items.indexOf(document.activeElement as HTMLButtonElement))
    const next = nextToolbarIndex(e.key, current, items.length)
    if (next === null) return
    e.preventDefault()
    setActiveIndex(next)
    items[next]?.focus()
  }, [getItems])

  // Keep activeIndex in sync when a control gains focus via Tab or click.
  const onFocusCapture = useCallback((e: React.FocusEvent) => {
    const idx = getItems().indexOf(e.target as HTMLButtonElement)
    if (idx >= 0) setActiveIndex(idx)
  }, [getItems])

  return (
    <div
      ref={ref}
      role="toolbar"
      aria-label={label}
      aria-orientation="horizontal"
      onKeyDown={onKeyDown}
      onFocusCapture={onFocusCapture}
      className={className}
    >
      {children}
    </div>
  )
}
```

- [ ] **Step 2: Create `ToolbarButton.tsx` (`ToolbarButton` + `ToolbarToggleButton`)**

```tsx
'use client'

import React from 'react'

// Shared classes. Contrast-safe on the white admin editor surface (#ffffff):
// idle #4a4f54 (~8:1), hover #32373c (~11:1), active #a90707 (~7.7:1). Visible
// keyboard focus ring. No hard-coded gray (theme-blind); brand tokens adapt.
const BTN_BASE =
  'p-1.5 rounded transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-1'

interface ToolbarButtonProps {
  /** Accessible name (also used as the hover tooltip). */
  label: string
  onActivate: () => void
  children: React.ReactNode
  className?: string
}

/**
 * A toolbar command button. `onMouseDown` only prevents focus-steal (keeps the
 * editor selection on mouse use); `onClick` runs the command and fires exactly
 * once for both mouse-up and keyboard Enter/Space. Renders no `tabIndex` — the
 * parent `Toolbar` owns roving tabindex.
 */
export const ToolbarButton = React.forwardRef<HTMLButtonElement, ToolbarButtonProps>(
  function ToolbarButton({ label, onActivate, children, className = '' }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        data-toolbar-item="true"
        aria-label={label}
        title={label}
        onMouseDown={(e) => e.preventDefault()}
        onClick={onActivate}
        className={`${BTN_BASE} text-brand-text-muted hover:bg-brand-bg-dark hover:text-brand-text ${className}`}
      >
        {children}
      </button>
    )
  },
)

interface ToolbarToggleButtonProps {
  label: string
  /** Whether the mark/state is currently active (exposed via aria-pressed). */
  pressed: boolean
  onActivate: () => void
  children: React.ReactNode
}

/** A toolbar toggle (e.g. bold/italic). Adds `aria-pressed` and an active style. */
export function ToolbarToggleButton({ label, pressed, onActivate, children }: ToolbarToggleButtonProps) {
  return (
    <button
      type="button"
      data-toolbar-item="true"
      aria-label={label}
      aria-pressed={pressed}
      title={label}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onActivate}
      className={`${BTN_BASE} ${
        pressed
          ? 'bg-brand-accent/10 text-brand-accent'
          : 'text-brand-text-muted hover:bg-brand-bg-dark hover:text-brand-text'
      }`}
    >
      {children}
    </button>
  )
}
```

- [ ] **Step 3: Create `ToolbarSeparator.tsx`**

```tsx
'use client'

import React from 'react'

/** Non-focusable vertical separator between toolbar groups (skipped by roving). */
export function ToolbarSeparator() {
  return <div role="separator" aria-orientation="vertical" className="w-px h-4 bg-brand-border mx-1" />
}
```

- [ ] **Step 4: Create the barrel `index.ts`**

```ts
export { Toolbar } from './Toolbar'
export { ToolbarButton, ToolbarToggleButton } from './ToolbarButton'
export { ToolbarSeparator } from './ToolbarSeparator'
```

- [ ] **Step 5: Build to typecheck the primitives**

Run: `npm run build`
Expected: `prisma generate` + `next build` succeed, no type errors in the new `toolbar/` files. (Nothing imports them yet — Task 3 wires them; this step only proves they typecheck.)

- [ ] **Step 6: Run the suite**

Run: `npm test`
Expected: all green (unchanged; no test files touched).

- [ ] **Step 7: Commit**

```bash
git add src/components/admin/editor/toolbar/
git commit -m "feat(editor): reusable accessible toolbar primitives (Toolbar/Button/Toggle/Separator)"
```

---

## Task 3: Rewrite `PlateToolbar` on the primitives + editor focus-restore + block-menu focus-return

**Files:**
- Rewrite: `src/components/admin/editor/PlateToolbar.tsx`
- Modify: `src/components/admin/editor/PlateEditor.tsx` (`toggleMark` ~:42-53, `insertNode` ~:55-62)

**Interfaces:**
- Consumes: `Toolbar`, `ToolbarButton`, `ToolbarToggleButton`, `ToolbarSeparator` from `./toolbar` (Task 2); `editor.tf.focus()` (Plate v48, verified present).
- Produces: nothing downstream (final integration).

**Context:** `PlateToolbar` currently renders raw `<button onMouseDown=…>` controls with no keyboard path, no roles, no `aria-pressed`, and `title`-only labels. `SlashCommandMenu` already calls `onClose` on Escape / Enter-select / click-select, so a single `onClose` that closes + refocuses the trigger gives focus-return on all its own close paths; the outside-click path (in `PlateToolbar`'s effect) closes without refocusing. The image button opens a page-level `MediaPickerDialog` (focus goes to the dialog) — no editor focus-restore needed for it.

- [ ] **Step 1: Add editor focus-restore in `PlateEditor.tsx`**

In `src/components/admin/editor/PlateEditor.tsx`, in `toggleMark` (the `useCallback` at ~:42), after the `editor.tf.toggleMark(mark)` call and the `setActiveMarks({…})` that follows it, append a focus-restore so keyboard activation returns the caret to the text:

```tsx
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
  editor.tf.focus() // return focus to the editor (keyboard activation path)
}, [editor])
```

In `insertNode` (the `useCallback` at ~:55), after `editor.tf.insertNodes(node)`, append the same:

```tsx
const insertNode = useCallback((node: TElement) => {
  if (!editor) return
  // Collapse selection to end so inserting a block doesn't delete selected text
  if (editor.selection) {
    editor.tf.collapse({ edge: 'end' })
  }
  editor.tf.insertNodes(node)
  editor.tf.focus() // return focus to the editor (keyboard activation path)
}, [editor])
```

(On the mouse path `onMouseDown`+`preventDefault` already kept focus in the editor, so `editor.tf.focus()` is a harmless no-op there.)

- [ ] **Step 2: Verify the focus API typechecks**

Run: `npm run build`
Expected: success. If TypeScript reports `editor.tf.focus` does not exist, use `editor.api.focus()` instead (both are valid depending on the Plate build) — but `editor.tf.focus()` is expected to compile (Plate v48 uses it internally).

- [ ] **Step 3: Rewrite `PlateToolbar.tsx`**

Replace the entire contents of `src/components/admin/editor/PlateToolbar.tsx` with:

```tsx
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
```

Notes:
- All buttons now use the uniform `p-1.5` padding from the primitive (the old "+ Block" used slightly wider `px-2 py-1`; uniform padding is an intentional minor normalization).
- The image `<svg>` gets `aria-hidden="true"` (decorative; the button carries the `aria-label`).
- `SlashCommandMenu` is passed `onClose={closeBlockMenu}` so Escape and both select paths return focus to the "+ Block" trigger; the outside-click effect closes without refocus.

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: success, no type errors (esp. the `ref` on `ToolbarButton` and the `./toolbar` imports resolve).

- [ ] **Step 5: Run the suite**

Run: `npm test`
Expected: all green (no test files changed; confirms nothing regressed at import time).

- [ ] **Step 6: Manual accessibility pass (record results in the report)**

Start the dev server (`npm run dev`) and open any editor with WYSIWYG mode (e.g. `/admin/content/[id]`, switch to WYSIWYG). Verify and note each:

- **Keyboard-only:** Tab reaches the toolbar and lands on a single control (roving); Arrow Left/Right (and Home/End) move focus across the buttons with a **visible focus ring**, wrapping at the ends and skipping separators; select some text, focus Bold, press **Enter** and **Space** → bold toggles and the caret returns to the text; H1/H2/H3 insert and return to the text; "+ Block" opens the menu via keyboard, the search input is focused, **Escape** closes it and focus returns to the "+ Block" button, and selecting an item inserts it then returns focus to the trigger.
- **Screen reader (VoiceOver/NVDA):** the group is announced as a *toolbar* ("Formatierung"); each button announces its name (Fett/Kursiv/…); Bold/Italic/Strike announce their **pressed** state and it updates when toggled.
- **Contrast:** idle/hover/active/focus states are legible on the white editor surface (tokens are pre-verified ≥4.5:1; confirm nothing looks washed out).

- [ ] **Step 7: Commit**

```bash
git add src/components/admin/editor/PlateToolbar.tsx src/components/admin/editor/PlateEditor.tsx
git commit -m "feat(editor): accessible WAI-ARIA toolbar wiring + keyboard focus restore"
```

---

## Final Verification (after all tasks)

- [ ] `npm test` — all green incl. new `toolbarNav.test.ts`, P0 `editor-roundtrip.test.ts`, P1 `contentEditor.test.ts`.
- [ ] `npm run build` — clean.
- [ ] `SlashCommandMenu.tsx` shows **no** diff on the branch (confirm it stayed unchanged): `git diff --name-only <base>..HEAD` does not list it.
- [ ] Manual keyboard-only + screen-reader pass (Task 3 Step 6) recorded and green.

---

## Self-Review

**1. Spec coverage.**
- WAI-ARIA toolbar (role/label/orientation, roving, arrows/Home/End) → Task 2 `Toolbar` + Task 1 `nextToolbarIndex`. ✅
- Keyboard-operable buttons preserving selection (mousedown-preventDefault + onClick + `editor.tf.focus()`) → Task 2 primitives + Task 3 Step 1. ✅
- Reusable primitives for P3/P4 → Task 2 (`toolbar/` barrel). ✅
- `aria-pressed` / `aria-label` / visible focus ring → Task 2 primitives. ✅
- Contrast pass (adaptive brand tokens, drop `gray-700`) → Task 2 `BTN_BASE`/classes + Task 3 Step 6 check. ✅
- "+ Block" keyboard-openable, focus in (menu autofocus, unchanged) + return to trigger on Escape/select, no refocus on outside-click → Task 3 `closeBlockMenu` + effect. ✅
- Non-goals respected: no new buttons; `SlashCommandMenu` unchanged; no serialization/directive/P0 changes. ✅

**2. Placeholder scan.** No TBD/TODO/"handle edge cases"; every code step carries full code + exact commands. The one deferred detail in the spec (exact contrast tokens) is resolved here to concrete tokens with measured ratios. ✅

**3. Type/name consistency.** `nextToolbarIndex(key, current, count)` defined in Task 1 and called verbatim in Task 2's `Toolbar`. Primitive names (`Toolbar`, `ToolbarButton`, `ToolbarToggleButton`, `ToolbarSeparator`) defined in Task 2 and imported verbatim from `./toolbar` in Task 3. `ToolbarButton` is `forwardRef` so Task 3's `ref={blockBtnRef}` typechecks. `data-toolbar-item="true"` is written by the buttons (Task 2) and queried by `Toolbar` (Task 2) identically. `editor.tf.focus()` used consistently in Task 3. ✅

**4. Edge cases.** Empty/single-item toolbar (Task 1 tests); separators excluded from roving (`data-toolbar-item` only on buttons); mouse vs keyboard double-fire avoided (action only in `onClick`); outside-click vs menu-close focus split (Task 3). ✅
