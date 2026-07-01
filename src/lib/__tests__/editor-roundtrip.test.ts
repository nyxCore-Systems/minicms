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

console.log('✓ editor-roundtrip.test.ts — all assertions passed')
