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
