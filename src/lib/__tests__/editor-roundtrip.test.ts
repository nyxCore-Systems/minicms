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
// --- PayPal donate directive: known leaf, parses + round-trips exactly ---
{
  const md = ':::donate\n:::'
  const blocks = parseBlocks(md)
  assert.equal(blocks.length, 1)
  assert.equal(blocks[0].type, 'donate')
  const node = firstOfType(markdownToPlate(md), 'donate')
  assert.ok(node, 'donate element emitted')
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
  ':::donate\n:::',
  ':::slider-main-2026\n:::',
  ':::products-merch\n:::',
  ':::artists-grid\n:::',
  ':::upcoming-events\n:::',
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

// --- Finding 2 (final review): nested paren-URL must survive at the NODE level ---
// Mirrors Task 1's node-level assertion, but for a link nested inside a known
// directive (callout). Idempotence alone is deceptive here: a truncated ")"
// re-appends as trailing text so the STRING looks stable while the href is
// corrupted — only a node-level check on `link.url` catches that.
{
  const md = ':::info\nSee [wiki](https://en.wikipedia.org/wiki/A_(b))\n:::'
  const link = firstOfType(markdownToPlate(md), 'a')
  assert.ok(link, 'link node exists (nested in callout)')
  assert.equal(link.url, 'https://en.wikipedia.org/wiki/A_(b)')
}

// --- Finding 1 (final review): extended corpus covering all known directives ---
// Same two invariants as CORPUS: (a) idempotence, (b) public-renderer block-type
// fidelity. Fixtures use realistic inner content matching each directive's actual
// serialization model (see markdownToPlate.ts / plateToMarkdown.ts):
//  - hero, box: content is recursively parsed via parseBlocks (nested markdown)
//  - hero-section, cv-timeline, project-bento: opaque `rawMarkdown` passthrough
//  - hero-slider-*: per-slide `key: value` lines, slides separated by `---`
//  - showcase, grid: per-item `key: value` lines, items separated by `---`
//  - banner-*/slider-*/products-*: data-only, id/slug encoded in the fence name
const DIRECTIVE_CORPUS: string[] = [
  // hero: recursively-parsed markdown children (heading + paragraph)
  ':::hero\n## Festival 2026\n\nDrei Tage. Zwei Bühnen. Ein Sommer.\n:::',
  // hero-section: opaque rawMarkdown passthrough
  ':::hero-section\ntitle: Festival 2026\nsubtitle: Drei Tage Musik\nimage: /hero.jpg\n:::',
  // hero-slider-viewport: two slides, `key: value` lines, `---`-separated
  ':::hero-slider-viewport\nimage: /slide1.jpg\nheading: Slide One\ndescription: First slide description\nbutton: Learn more\nhref: /learn-more\n---\nimage: /slide2.jpg\nheading: Slide Two\ndescription: Second slide description\nbutton: Buy tickets\nhref: /tickets\n:::',
  // cv-timeline: opaque rawMarkdown passthrough
  ':::cv-timeline\n2023: Erste e-Ventschau\n2024: Über 5000 Besucher\n2025: Neue Hauptbühne\n:::',
  // project-bento: opaque rawMarkdown passthrough
  ':::project-bento\n## Highlights\n\n- Bühne A\n- Bühne B\n:::',
  // showcase: `key: value` items, `---`-separated
  ':::showcase\nname: Foodtruck Alley\ndescription: Streetfood aus aller Welt\nhref: /vendors\nimage: /foodtrucks.jpg\ncount: 12\n---\nname: Kunsthandwerk\ndescription: Lokale Handwerkskunst\nhref: /kunsthandwerk\nimage: /kunsthandwerk.jpg\ncount: 8\n:::',
  // grid: `key: value` items, `---`-separated
  ':::grid\ntitle: Bühne Nord\nimage: /buehne-nord.jpg\nhref: /buehnen/nord\ndescription: Die große Hauptbühne\n---\ntitle: Bühne Süd\nimage: /buehne-sued.jpg\nhref: /buehnen/sued\ndescription: Die kleine Bühne\n:::',
  // warning callout with inline bold
  ':::warning\n**Achtung:** Der Zugang ist nur mit gültigem Ticket möglich.\n:::',
  // danger callout
  ':::danger\nDer Bereich ist gesperrt und darf nicht betreten werden.\n:::',
  // dynamic directives nested inside a box (top level already covered in CORPUS;
  // nesting inside columns would collide with columns' own `---` splitting, so
  // box is used here instead)
  ':::box\n:::banner-hero1\n:::\n:::',
  ':::box\n:::slider-main-2026\n:::\n:::',
  ':::box\n:::products-merch\n:::\n:::',
  ':::box\n:::artists-grid\n:::\n:::',
  ':::box\n:::upcoming-events\n:::\n:::',
]

for (const md of DIRECTIVE_CORPUS) {
  const once = rt(md)
  assert.equal(rt(once), once, `idempotent: ${JSON.stringify(md).slice(0, 60)}`)
  assert.deepEqual(
    parseBlocks(md).map((b) => b.type),
    parseBlocks(once).map((b) => b.type),
    `block-type stable: ${JSON.stringify(md).slice(0, 60)}`,
  )
}

console.log('✓ editor-roundtrip.test.ts — all assertions passed')
