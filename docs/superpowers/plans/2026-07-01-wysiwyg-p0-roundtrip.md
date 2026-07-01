# P0 — Roundtrip-Absicherung Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the hand-rolled markdown⇄Plate round-trip lossless for URLs containing parentheses and for unknown `:::` directives, and lock it behind golden round-trip tests before any new node types are added in P1–P9.

**Architecture:** Fix the inline/line URL parsers to tolerate one level of nested parens; add a "directive-raw" safety net so any `:::name` not on the known allowlist is preserved verbatim through the already-wired `ELEMENT_DIRECTIVE_RAW` node instead of being silently mangled; add a golden round-trip test suite as the merge gate.

**Tech Stack:** TypeScript, Plate v48 (serialization only — no runtime Plate/React in tests), `node:test` via `tsx`.

**Spec:** [2026-07-01-wysiwyg-p0-roundtrip-design.md](../specs/2026-07-01-wysiwyg-p0-roundtrip-design.md) · **Roadmap:** [2026-07-01-wysiwyg-roadmap.md](../specs/2026-07-01-wysiwyg-roadmap.md)

## Global Constraints

- **Tests run only from `src/lib/__tests__/*.test.ts`** (package.json `"test": "tsx --test src/lib/__tests__/*.test.ts"`). Any new test file MUST live there or CI will not run it.
- Test style = flat `node:assert/strict` assertions ending in a `console.log('✓ …')` line, matching `src/lib/__tests__/slug.test.ts`. No test runner framework.
- `@/` path alias resolves under `tsx` (verified). Import serialization via `@/components/admin/editor/serialization/…` and the parser via `@/lib/directiveParser`.
- **Three-files-in-sync rule:** a directive change touches `src/lib/directiveParser.ts`, the public renderer `src/components/MarkdownContent.tsx`, and the editor serializers — keep them consistent.
- Do NOT change the output node shapes (`{type:'a',url,children}`, `{type:'img',url,alt,children}`, text marks) — downstream editor elements depend on them.
- Branch: `feat/wysiwyg-p0-roundtrip` (already checked out).

---

## File Structure

- `src/components/admin/editor/serialization/markdownToPlate.ts` — inline URL/bracket parser fix; new `directive-raw` → `ELEMENT_DIRECTIVE_RAW` case; import `ELEMENT_DIRECTIVE_RAW`.
- `src/lib/directiveParser.ts` — `GENERIC_DIRECTIVE_RE`; `'directive-raw'` in `Block` union; unknown-fence handling + depth logic in `parseBlocks`; `splitColumns` depth uses generic fence.
- `src/lib/__tests__/editor-roundtrip.test.ts` — **new** golden round-trip test suite (the merge gate).
- `src/components/MarkdownContent.tsx` — **no change required** (verified: `RenderBlocks` `default` case at lines 190–191 renders `block.content` as markdown, so a `directive-raw` block degrades gracefully).

---

### Task 1: URL-paren fix in the inline + line parsers

**Files:**
- Modify: `src/components/admin/editor/serialization/markdownToPlate.ts` (`parseInlineMarkdown` regex ~line 39; `parseImageLine` regex ~line 131)
- Test: `src/lib/__tests__/editor-roundtrip.test.ts` (new)

**Interfaces:**
- Consumes: `markdownToPlate(md: string): TElement[]`, `plateToMarkdown(v: TElement[]): string` (existing, unchanged signatures).
- Produces: no new exports. Behavior change only: link/image nodes now carry the full URL when it contains balanced parens.

- [ ] **Step 1: Write the failing test**

Create `src/lib/__tests__/editor-roundtrip.test.ts`:

```ts
import assert from 'node:assert/strict'
import { markdownToPlate } from '@/components/admin/editor/serialization/markdownToPlate'
import { plateToMarkdown } from '@/components/admin/editor/serialization/plateToMarkdown'

const rt = (md: string) => plateToMarkdown(markdownToPlate(md))

// Recursively collect every node (elements + inline) from a Plate value.
function walk(nodes: any[]): any[] {
  const out: any[] = []
  for (const n of nodes) {
    out.push(n)
    if (n && Array.isArray(n.children)) out.push(...walk(n.children))
  }
  return out
}
function firstOfType(nodes: any[], type: string): any {
  return walk(nodes).find((n) => n && n.type === type) || null
}

// --- Task 1: URL with parentheses must survive at the NODE level ---
// (string round-trip alone is deceptive: the truncated ")" gets re-appended
//  as trailing text so the string looks stable while the href is corrupted.)
{
  const md = '[Wiki](https://de.wikipedia.org/wiki/Foo_(Bar))'
  const link = firstOfType(markdownToPlate(md), 'a')
  assert.ok(link, 'link node exists')
  assert.equal(link.url, 'https://de.wikipedia.org/wiki/Foo_(Bar)')
  assert.equal(rt(md), md)
}
// Inline link inside a sentence, followed by more text
{
  const md = 'See [tix](https://shop.io/e(1)) now'
  const link = firstOfType(markdownToPlate(md), 'a')
  assert.equal(link.url, 'https://shop.io/e(1)')
  assert.equal(rt(md), md)
}
// Nested brackets in link text are recognized as a link
{
  const md = '[a [b] c](https://x.y)'
  const link = firstOfType(markdownToPlate(md), 'a')
  assert.ok(link, 'nested-bracket link recognized')
  assert.equal(link.url, 'https://x.y')
}
// Image-only line with parens in the URL
{
  const md = '![pic](https://a.b/img(1).png)'
  const img = firstOfType(markdownToPlate(md), 'img')
  assert.ok(img, 'image node exists')
  assert.equal(img.url, 'https://a.b/img(1).png')
  assert.equal(rt(md), md)
}

console.log('✓ editor-roundtrip.test.ts — all assertions passed')
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/lib/__tests__/editor-roundtrip.test.ts`
Expected: FAIL — first assertion `link.url` is `https://de.wikipedia.org/wiki/Foo_(Bar` (missing final `)`).

- [ ] **Step 3: Fix `parseInlineMarkdown`**

In `src/components/admin/editor/serialization/markdownToPlate.ts`, replace the `inlineRe` definition (the single regex around line 39) with one that allows one level of nested parens in URLs and one level of nested brackets in link text. Group numbering (1–8) is unchanged — the added `(?:…)` groups are non-capturing:

```ts
  // Order matters: images before links (both start with [).
  // URL part tolerates one nested (...) group (e.g. Wikipedia_(Foo), shop/e(1)).
  // Link text tolerates one nested [...] group.
  const inlineRe = /!\[((?:[^\[\]]|\[[^\[\]]*\])*)\]\(((?:[^()]|\([^()]*\))+)\)|\[((?:[^\[\]]|\[[^\[\]]*\])*)\]\(((?:[^()]|\([^()]*\))+)\)|\*\*(.+?)\*\*|\*(.+?)\*|~~(.+?)~~|`([^`]+)`/g
```

Leave the entire `while ((match = inlineRe.exec(text)) !== null)` body unchanged — `match[1]`…`match[8]` keep the same meaning (img alt, img url, link text, link url, bold, italic, strike, code).

- [ ] **Step 4: Fix `parseImageLine`**

In the same file, replace the `parseImageLine` regex (~line 131) so the URL part matches the same balanced-paren pattern:

```ts
function parseImageLine(line: string): TElement | null {
  const m = line.match(/^!\[([^\]]*)\]\(((?:[^()]|\([^()]*\))+)\)\s*$/)
  if (!m) return null
  return {
    type: 'img',
    url: m[2],
    alt: m[1],
    children: [{ text: '' }],
  } as TElement
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx tsx --test src/lib/__tests__/editor-roundtrip.test.ts`
Expected: PASS — `✓ editor-roundtrip.test.ts — all assertions passed`.

- [ ] **Step 6: Commit**

```bash
git add src/components/admin/editor/serialization/markdownToPlate.ts src/lib/__tests__/editor-roundtrip.test.ts
git commit -m "fix(editor): preserve parens in link/image URLs on markdown round-trip

The inline and line-level parsers captured URLs with [^)]+, truncating any
URL containing ')' (Wikipedia, ticket links) and corrupting the stored href
even though the re-serialized string looked stable. Match one nested paren
group instead, and recognize nested brackets in link text. Adds a golden
round-trip test asserting node-level URL correctness.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Directive-raw safety net for unknown `:::` blocks

**Files:**
- Modify: `src/lib/directiveParser.ts` (add `GENERIC_DIRECTIVE_RE`, `'directive-raw'` in `Block['type']`, unknown-fence branch + depth logic in `parseBlocks`, `splitColumns` depth)
- Modify: `src/components/admin/editor/serialization/markdownToPlate.ts` (import `ELEMENT_DIRECTIVE_RAW`; add `case 'directive-raw'` in `blockToPlateNodes`)
- Test: `src/lib/__tests__/editor-roundtrip.test.ts` (extend)

**Interfaces:**
- Consumes: `parseBlocks(raw: string): Block[]`, `ELEMENT_DIRECTIVE_RAW` (from `../types`), `DirectiveRawElement` render/plugin/serializer (all already wired).
- Produces: `export const GENERIC_DIRECTIVE_RE: RegExp`; a new `Block` variant `{ type: 'directive-raw'; content: string; directiveId?: string }` (uses the existing optional `directiveId` field). `markdownToPlate` now emits `{ type: ELEMENT_DIRECTIVE_RAW, rawMarkdown, children:[{text:''}] }` for unknown directives.

- [ ] **Step 1: Write the failing test**

Append to `src/lib/__tests__/editor-roundtrip.test.ts`, **before** the final `console.log(...)` line:

```ts
// --- Task 2: unknown directives are preserved verbatim (directive-raw) ---
import { parseBlocks } from '@/lib/directiveParser'
{
  const md = ':::futuristic\nhello **world**\n:::'
  const blocks = parseBlocks(md)
  assert.equal(blocks.length, 1)
  assert.equal(blocks[0].type, 'directive-raw')
  assert.equal(blocks[0].directiveId, 'futuristic')
  const raw = firstOfType(markdownToPlate(md), 'directive-raw')
  assert.ok(raw, 'directive-raw node emitted')
  assert.equal(raw.rawMarkdown, ':::futuristic\nhello **world**\n:::')
  assert.equal(rt(md), md)
}
// Empty unknown directive
{
  const md = ':::foo\n:::'
  assert.equal(rt(md), md)
}
// Unknown directive nested inside a known callout round-trips (depth handling)
{
  const md = ':::info\n:::futuristic\nx\n:::\n:::'
  assert.equal(rt(md), md)
  const outer = parseBlocks(md)
  assert.equal(outer.length, 1)
  assert.equal(outer[0].type, 'callout')
}
```

(Move the `import { parseBlocks }` to the top import block if your linter prefers; `tsx` accepts the inline import either way.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/lib/__tests__/editor-roundtrip.test.ts`
Expected: FAIL — `blocks[0].type` is `'markdown'` (unknown fence currently swallowed into a markdown block), not `'directive-raw'`.

- [ ] **Step 3: Add the generic fence regex + `Block` variant**

In `src/lib/directiveParser.ts`, after the `CLOSE_RE` line add:

```ts
/** Matches ANY opening fence `:::name` (known or not). Used for the
 * directive-raw safety net and for nesting-depth tracking. */
export const GENERIC_DIRECTIVE_RE = /^:::([a-zA-Z0-9][a-zA-Z0-9-]*)\s*$/
```

Extend the `Block['type']` union to include `'directive-raw'`:

```ts
export interface Block {
  type: 'markdown' | 'hero' | 'hero-section' | 'hero-slider' | 'cv-timeline' | 'project-bento' | 'showcase' | 'grid' | 'callout' | 'columns' | 'box' | 'banner' | 'slider' | 'products' | 'directive-raw'
  content: string
  variant?: string
  columnCount?: 2 | 3
  directiveId?: string
}
```

- [ ] **Step 4: Handle unknown fences in `parseBlocks`**

Replace the body of the `while (i < lines.length)` loop in `parseBlocks` with the version below. The changes: match a generic opening fence too; count nesting depth on any opening fence (so unknown nested directives don't mis-close); route unknown fences to a `directive-raw` block; and make the markdown-collector stop at any opening fence.

```ts
  while (i < lines.length) {
    const line = lines[i]
    const knownMatch = line.match(DIRECTIVE_RE)
    const openMatch = line.match(GENERIC_DIRECTIVE_RE)

    if (knownMatch || openMatch) {
      const directive = knownMatch ? knownMatch[1] : openMatch![1]
      const isKnown = !!knownMatch
      i++

      // Collect inner lines respecting nested ::: depth (any opening fence)
      const innerLines: string[] = []
      let depth = 1
      while (i < lines.length && depth > 0) {
        if (lines[i].match(GENERIC_DIRECTIVE_RE)) {
          depth++
          innerLines.push(lines[i])
        } else if (lines[i].match(CLOSE_RE)) {
          depth--
          if (depth > 0) innerLines.push(lines[i])
        } else {
          innerLines.push(lines[i])
        }
        i++
      }

      const innerContent = innerLines.join('\n')

      if (!isKnown) {
        blocks.push({ type: 'directive-raw', content: innerContent, directiveId: directive })
        continue
      }

      if (directive === 'hero') {
        blocks.push({ type: 'hero', content: innerContent })
      } else if (directive === 'hero-section') {
        blocks.push({ type: 'hero-section', content: innerContent })
      } else if (directive.startsWith('hero-slider-')) {
        const v = directive.slice(12) as 'viewport' | 'full' | 'fitted'
        blocks.push({ type: 'hero-slider', content: innerContent, variant: v })
      } else if (directive === 'cv-timeline') {
        blocks.push({ type: 'cv-timeline', content: innerContent })
      } else if (directive === 'project-bento') {
        blocks.push({ type: 'project-bento', content: innerContent })
      } else if (directive === 'showcase') {
        blocks.push({ type: 'showcase', content: innerContent })
      } else if (directive === 'grid') {
        blocks.push({ type: 'grid', content: innerContent })
      } else if (CALLOUT_TYPES.has(directive)) {
        blocks.push({ type: 'callout', content: innerContent, variant: directive })
      } else if (directive.startsWith('columns-')) {
        const count = directive === 'columns-3' ? 3 : 2
        blocks.push({ type: 'columns', content: innerContent, columnCount: count })
      } else if (directive === 'box') {
        blocks.push({ type: 'box', content: innerContent })
      } else if (directive === 'banner') {
        blocks.push({ type: 'banner', content: '' })
      } else if (directive.startsWith('banner-')) {
        blocks.push({ type: 'banner', content: '', directiveId: directive.slice(7) })
      } else if (directive.startsWith('slider-')) {
        blocks.push({ type: 'slider', content: '', directiveId: directive.slice(7) })
      } else if (directive.startsWith('products-')) {
        blocks.push({ type: 'products', content: '', directiveId: directive.slice(9) })
      }
    } else {
      const mdLines: string[] = [line]
      i++
      while (i < lines.length && !lines[i].match(GENERIC_DIRECTIVE_RE)) {
        mdLines.push(lines[i])
        i++
      }
      const text = mdLines.join('\n')
      if (text.trim()) {
        blocks.push({ type: 'markdown', content: text })
      }
    }
  }
```

- [ ] **Step 5: Make `splitColumns` count depth on any fence**

In `splitColumns`, change the opening-fence check from `DIRECTIVE_RE` to `GENERIC_DIRECTIVE_RE` so an unknown directive nested in a column does not break top-level `---` splitting:

```ts
  for (const line of lines) {
    if (line.match(GENERIC_DIRECTIVE_RE)) {
      depth++
      columns[columns.length - 1].push(line)
    } else if (line.match(CLOSE_RE)) {
      depth = Math.max(0, depth - 1)
      columns[columns.length - 1].push(line)
    } else if (depth === 0 && line.trim() === '---') {
      columns.push([])
    } else {
      columns[columns.length - 1].push(line)
    }
  }
```

- [ ] **Step 6: Emit `ELEMENT_DIRECTIVE_RAW` from `markdownToPlate`**

In `src/components/admin/editor/serialization/markdownToPlate.ts`, add `ELEMENT_DIRECTIVE_RAW` to the import list from `'../types'` (it currently is not imported there):

```ts
  ELEMENT_PRODUCTS,
  ELEMENT_DIRECTIVE_RAW,
```

Then add a `case 'directive-raw'` to `blockToPlateNodes` (place it before the `default:` case). Rebuild the full fence so the existing serializer round-trips it byte-exact:

```ts
    case 'directive-raw': {
      const name = block.directiveId || ''
      const inner = block.content
      const rawMarkdown = inner ? `:::${name}\n${inner}\n:::` : `:::${name}\n:::`
      return [{
        type: ELEMENT_DIRECTIVE_RAW,
        rawMarkdown,
        children: [{ text: '' }],
      } as TElement]
    }
```

- [ ] **Step 7: Run test to verify it passes**

Run: `npx tsx --test src/lib/__tests__/editor-roundtrip.test.ts`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/lib/directiveParser.ts src/components/admin/editor/serialization/markdownToPlate.ts src/lib/__tests__/editor-roundtrip.test.ts
git commit -m "fix(editor): preserve unknown ::: directives via directive-raw safety net

parseBlocks matched directives against a fixed allowlist, so any unknown/
future/legacy ::: block fell into the markdown branch and had its inner
---/#/- lines re-interpreted (and mis-closed the nesting depth). Route
unknown fences to a directive-raw block, count nesting depth on any opening
fence, and emit the already-wired ELEMENT_DIRECTIVE_RAW node so it round-trips
verbatim. Public renderer degrades gracefully via its existing default case.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Golden corpus — known directives nested in blocks + mixed doc

**Files:**
- Test: `src/lib/__tests__/editor-roundtrip.test.ts` (extend)

**Interfaces:**
- Consumes: `rt`, `walk`, `firstOfType`, `parseBlocks` (defined in earlier tasks).
- Produces: none. This task adds the corpus that becomes the merge gate for P1–P9.

- [ ] **Step 1: Write the corpus test**

Append to `src/lib/__tests__/editor-roundtrip.test.ts`, before the final `console.log(...)`:

```ts
// --- Task 3: golden corpus — idempotence + renderer fidelity ---
// Invariants per fixture:
//  (a) rt is idempotent after one normalization pass: rt(rt(x)) === rt(x)
//  (b) the public renderer's block interpretation is stable across a round-trip:
//      parseBlocks(x) and parseBlocks(rt(x)) yield the same block-type sequence.
const CORPUS: string[] = [
  // callout containing markdown + a link with parens
  ':::info\nCheck [wiki](https://en.wikipedia.org/wiki/A_(b))\n:::',
  // box with a heading and list
  ':::box\n## Title\n\n- one\n- two\n:::',
  // two-column with a nested box in each column
  ':::columns-2\n:::box\nLeft\n:::\n---\n:::box\nRight\n:::\n:::',
  // three columns of plain markdown
  ':::columns-3\nA\n---\nB\n---\nC\n:::',
  // dynamic directives (data-only)
  ':::banner-hero1\n:::',
  ':::slider-main-2026\n:::',
  ':::products-merch\n:::',
  // callout wrapping an unknown directive
  ':::tip\n:::futuristic\ndeep\n:::\n:::',
  // mixed document: heading, paragraph, blockquote, list, hr, code
  '# Heading\n\nA paragraph with **bold** and *italic*.\n\n> a quote\n\n- item 1\n- item 2\n\n---\n\n```ts\nconst x = 1\n```',
]

for (const md of CORPUS) {
  const once = rt(md)
  assert.equal(rt(once), once, `idempotent: ${JSON.stringify(md).slice(0, 60)}`)
  assert.deepEqual(
    parseBlocks(md).map((b) => b.type),
    parseBlocks(once).map((b) => b.type),
    `block-type stable: ${JSON.stringify(md).slice(0, 60)}`,
  )
}
```

- [ ] **Step 2: Run the test**

Run: `npx tsx --test src/lib/__tests__/editor-roundtrip.test.ts`
Expected: PASS. If a fixture fails idempotence, that is a real serialization defect surfaced by the gate — fix it in `markdownToPlate.ts`/`directiveParser.ts` (not by weakening the assertion), then re-run.

- [ ] **Step 3: Run the full suite + build**

Run: `npm test`
Expected: all suites pass, including `editor-roundtrip.test.ts`.

Run: `npm run build`
Expected: `prisma generate` + `next build` succeed (route table printed, no type errors from the `Block` union / `blockToPlateNodes` changes).

- [ ] **Step 4: Commit**

```bash
git add src/lib/__tests__/editor-roundtrip.test.ts
git commit -m "test(editor): golden round-trip corpus for directives nested in blocks

Idempotence + public-renderer block-type fidelity over callouts, boxes,
columns (with nested boxes), dynamic banner/slider/products directives, an
unknown directive nested in a callout, and a mixed markdown document. This
corpus is the merge gate: no new node/directive lands in P1-P9 without a
fixture covering it nested inside a block.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Manual verification (after Task 3)

- In the admin, open a real Page (`/admin/content/[id]`), an Artist bio (`/admin/artists/[id]`), and an Event description (`/admin/events/[id]`); switch to WYSIWYG and back / save; confirm no unexpected structural change to the body (spot-check the diff vs. DB).
- Confirm a link with a parenthesis in its URL survives a WYSIWYG edit with the correct href.

## Self-Review (completed at write time)

- **Spec coverage:** Teil 1 (inline + line URL fix) → Task 1; Teil 2 (directive-raw in shared `parseBlocks` + editor emit + graceful public render) → Task 2; Teil 3 (golden tests: paren-URL, nested brackets, every directive nested in a block, unknown directive, mixed doc) → Tasks 1–3. Nicht-Ziele (plate-markdown AST, table parser, no-op-save suppression) correctly excluded.
- **Placeholder scan:** none — every code step shows complete code.
- **Type consistency:** `GENERIC_DIRECTIVE_RE`, `Block` union `'directive-raw'`, `directiveId`, `ELEMENT_DIRECTIVE_RAW`, and helper names (`rt`, `walk`, `firstOfType`) are used consistently across tasks.
- **CI gate:** test file placed in `src/lib/__tests__/` per the package.json glob (verified).
