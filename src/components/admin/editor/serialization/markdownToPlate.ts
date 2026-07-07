import { parseBlocks, splitColumns, type Block } from '@/lib/directiveParser'
import type { TElement, TText, Descendant } from '@udecode/plate'
import {
  ELEMENT_CALLOUT,
  ELEMENT_BOX,
  ELEMENT_HERO,
  ELEMENT_COLUMNS,
  ELEMENT_COLUMN,
  ELEMENT_HERO_SECTION,
  ELEMENT_HERO_SLIDER,
  ELEMENT_CV_TIMELINE,
  ELEMENT_PROJECT_BENTO,
  ELEMENT_SHOWCASE,
  ELEMENT_GRID,
  ELEMENT_BANNER,
  ELEMENT_DONATE,
  ELEMENT_SLIDER,
  ELEMENT_PRODUCTS,
  ELEMENT_DIRECTIVE_RAW,
  type HeroSliderSlide,
  type ShowcaseItem,
  type GridItem,
} from '../types'

// ── Inline markdown parsing ─────────────────────────────────────────

interface InlineToken {
  text: string
  bold?: boolean
  italic?: boolean
  strikethrough?: boolean
  code?: boolean
}

/** Parse inline markdown into Plate text nodes with marks + inline elements */
function parseInlineMarkdown(text: string): Descendant[] {
  const nodes: Descendant[] = []

  // Order matters: images before links (both start with [).
  // URL part tolerates one nested (...) group (e.g. Wikipedia_(Foo), shop/e(1)).
  // Link text tolerates one nested [...] group.
  const inlineRe = /!\[((?:[^\[\]]|\[[^\[\]]*\])*)\]\(((?:[^()]|\([^()]*\))+)\)|\[((?:[^\[\]]|\[[^\[\]]*\])*)\]\(((?:[^()]|\([^()]*\))+)\)|\*\*(.+?)\*\*|\*(.+?)\*|~~(.+?)~~|`([^`]+)`/g

  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = inlineRe.exec(text)) !== null) {
    // Add plain text before this match
    if (match.index > lastIndex) {
      const plain = text.slice(lastIndex, match.index)
      if (plain) nodes.push({ text: plain } as TText)
    }

    if (match[1] !== undefined || match[2] !== undefined) {
      // Image: ![alt](url)
      const alt = match[1] || ''
      const url = match[2] || ''
      nodes.push({
        type: 'img',
        url,
        alt,
        children: [{ text: '' }],
      } as TElement)
    } else if (match[3] !== undefined) {
      // Link: [text](url)
      const linkText = match[3]
      const url = match[4] || ''
      nodes.push({
        type: 'a',
        url,
        children: [{ text: linkText }],
      } as TElement)
    } else if (match[5] !== undefined) {
      // Bold: **text**
      nodes.push({ text: match[5], bold: true } as TText)
    } else if (match[6] !== undefined) {
      // Italic: *text*
      nodes.push({ text: match[6], italic: true } as TText)
    } else if (match[7] !== undefined) {
      // Strikethrough: ~~text~~
      nodes.push({ text: match[7], strikethrough: true } as TText)
    } else if (match[8] !== undefined) {
      // Inline code: `text`
      nodes.push({ text: match[8], code: true } as TText)
    }

    lastIndex = match.index + match[0].length
  }

  // Add remaining text
  if (lastIndex < text.length) {
    const remaining = text.slice(lastIndex)
    if (remaining) nodes.push({ text: remaining } as TText)
  }

  // Ensure at least one text node
  if (nodes.length === 0) nodes.push({ text: '' } as TText)

  return nodes
}

// ── Block-level markdown parsing ────────────────────────────────────

/** Minimal paragraph node with inline parsing */
function p(text: string): TElement {
  return { type: 'p', children: parseInlineMarkdown(text) } as TElement
}

/** Parse a heading line like "# Heading" */
function parseHeading(line: string): TElement | null {
  const m = line.match(/^(#{1,6})\s+(.*)$/)
  if (!m) return null
  const level = m[1].length
  return { type: `h${level}`, children: parseInlineMarkdown(m[2]) } as TElement
}

/** Parse a blockquote line */
function isBlockquoteLine(line: string): string | null {
  const m = line.match(/^>\s?(.*)$/)
  return m ? m[1] : null
}

/** Parse a list item line */
function parseListItem(line: string): { type: 'ul' | 'ol'; text: string } | null {
  const ul = line.match(/^[-*+]\s+(.*)$/)
  if (ul) return { type: 'ul', text: ul[1] }
  const ol = line.match(/^\d+\.\s+(.*)$/)
  if (ol) return { type: 'ol', text: ol[1] }
  return null
}

/** Parse an image-only line */
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

/** Check for horizontal rule */
function isHorizontalRule(line: string): boolean {
  return /^(---|\*\*\*|___)(\s*)$/.test(line)
}

/** Check for code block start */
function isCodeBlockStart(line: string): string | null {
  const m = line.match(/^```(\w*)$/)
  return m ? m[1] : null
}

/** Convert standard markdown text into Plate nodes */
function markdownTextToNodes(text: string): TElement[] {
  if (!text.trim()) return [p('')]

  const lines = text.split('\n')
  const nodes: TElement[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Empty line — skip
    if (!line.trim()) {
      i++
      continue
    }

    // Horizontal rule
    if (isHorizontalRule(line)) {
      nodes.push({ type: 'hr', children: [{ text: '' }] } as TElement)
      i++
      continue
    }

    // Heading
    const heading = parseHeading(line)
    if (heading) {
      nodes.push(heading)
      i++
      continue
    }

    // Code block
    const codeLang = isCodeBlockStart(line)
    if (codeLang !== null) {
      i++
      const codeLines: string[] = []
      while (i < lines.length && !lines[i].match(/^```\s*$/)) {
        codeLines.push(lines[i])
        i++
      }
      i++ // skip closing ```
      nodes.push({
        type: 'code_block',
        lang: codeLang || undefined,
        children: codeLines.map(cl => ({
          type: 'code_line',
          children: [{ text: cl }],
        })),
      } as TElement)
      continue
    }

    // Image on its own line
    const img = parseImageLine(line)
    if (img) {
      nodes.push(img)
      i++
      continue
    }

    // Blockquote — collect consecutive lines
    const bqText = isBlockquoteLine(line)
    if (bqText !== null) {
      const bqLines: string[] = [bqText]
      i++
      while (i < lines.length) {
        const next = isBlockquoteLine(lines[i])
        if (next !== null) {
          bqLines.push(next)
          i++
        } else break
      }
      nodes.push({
        type: 'blockquote',
        children: [p(bqLines.join('\n'))],
      } as TElement)
      continue
    }

    // List — collect consecutive list items
    const listItem = parseListItem(line)
    if (listItem) {
      const listType = listItem.type
      const items: string[] = [listItem.text]
      i++
      while (i < lines.length) {
        const next = parseListItem(lines[i])
        if (next && next.type === listType) {
          items.push(next.text)
          i++
        } else break
      }
      nodes.push({
        type: listType,
        children: items.map(itemText => ({
          type: 'li',
          children: [{
            type: 'lic',
            children: parseInlineMarkdown(itemText),
          }],
        })),
      } as TElement)
      continue
    }

    // Regular paragraph — collect lines until empty line or block-level element
    const paraLines: string[] = [line]
    i++
    while (i < lines.length) {
      const nextLine = lines[i]
      // Stop on empty line, heading, hr, code block, image line, blockquote, list
      if (!nextLine.trim() ||
          parseHeading(nextLine) ||
          isHorizontalRule(nextLine) ||
          isCodeBlockStart(nextLine) !== null ||
          parseImageLine(nextLine) ||
          isBlockquoteLine(nextLine) !== null ||
          parseListItem(nextLine)) {
        break
      }
      paraLines.push(nextLine)
      i++
    }
    nodes.push(p(paraLines.join('\n')))
  }

  return nodes.length > 0 ? nodes : [p('')]
}

// ── Structured data parsers ─────────────────────────────────────────

/** Parse hero slider content into slide objects */
function parseHeroSliderSlides(content: string): HeroSliderSlide[] {
  const entries = content.split(/\n---\n/)
  return entries.map((entry) => {
    const slide: HeroSliderSlide = { image: '' }
    for (const line of entry.split('\n')) {
      const m = line.match(/^(\w+):\s*(.*)$/)
      if (m) {
        const [, key, value] = m
        if (key === 'image') slide.image = value
        else if (key === 'heading') slide.heading = value
        else if (key === 'description') slide.description = value
        else if (key === 'button') slide.button = value
        else if (key === 'href') slide.href = value
      }
    }
    return slide
  }).filter(s => s.image)
}

/** Parse showcase / grid style YAML-like items */
function parseYamlItems(content: string, keys: string[]): Record<string, string>[] {
  const entries = content.split(/\n---\n/)
  return entries.map((entry) => {
    const item: Record<string, string> = {}
    for (const line of entry.split('\n')) {
      const m = line.match(/^(\w+):\s*(.*)$/)
      if (m && keys.includes(m[1])) {
        item[m[1]] = m[2]
      }
    }
    return item
  }).filter(item => Object.keys(item).length > 0)
}

// ── Block-to-Plate conversion ───────────────────────────────────────

/** Convert a parsed Block into Plate element(s) */
function blockToPlateNodes(block: Block): TElement[] {
  switch (block.type) {
    case 'markdown':
      return markdownTextToNodes(block.content)

    case 'callout':
      return [{
        type: ELEMENT_CALLOUT,
        variant: block.variant || 'info',
        children: convertBlocksToPlateNodes(block.content),
      } as TElement]

    case 'box':
      return [{
        type: ELEMENT_BOX,
        children: convertBlocksToPlateNodes(block.content),
      } as TElement]

    case 'hero':
      return [{
        type: ELEMENT_HERO,
        children: convertBlocksToPlateNodes(block.content),
      } as TElement]

    case 'columns': {
      const cols = splitColumns(block.content)
      return [{
        type: ELEMENT_COLUMNS,
        columnCount: block.columnCount || 2,
        children: cols.map((colContent) => ({
          type: ELEMENT_COLUMN,
          children: convertBlocksToPlateNodes(colContent.trim()),
        })),
      } as TElement]
    }

    case 'hero-section':
      return [{
        type: ELEMENT_HERO_SECTION,
        rawMarkdown: block.content,
        children: [{ text: '' }],
      } as TElement]

    case 'hero-slider':
      return [{
        type: ELEMENT_HERO_SLIDER,
        variant: (block.variant || 'viewport') as 'viewport' | 'full' | 'fitted',
        slides: parseHeroSliderSlides(block.content),
        children: [{ text: '' }],
      } as TElement]

    case 'cv-timeline':
      return [{
        type: ELEMENT_CV_TIMELINE,
        rawMarkdown: block.content,
        children: [{ text: '' }],
      } as TElement]

    case 'project-bento':
      return [{
        type: ELEMENT_PROJECT_BENTO,
        rawMarkdown: block.content,
        children: [{ text: '' }],
      } as TElement]

    case 'showcase':
      return [{
        type: ELEMENT_SHOWCASE,
        items: parseYamlItems(block.content, ['name', 'description', 'href', 'image', 'count']) as unknown as ShowcaseItem[],
        children: [{ text: '' }],
      } as TElement]

    case 'grid':
      return [{
        type: ELEMENT_GRID,
        items: parseYamlItems(block.content, ['title', 'image', 'href', 'description']) as unknown as GridItem[],
        children: [{ text: '' }],
      } as TElement]

    case 'banner':
      return [{
        type: ELEMENT_BANNER,
        bannerId: block.directiveId || undefined,
        children: [{ text: '' }],
      } as TElement]

    case 'donate':
      return [{
        type: ELEMENT_DONATE,
        children: [{ text: '' }],
      } as TElement]

    case 'slider':
      return [{
        type: ELEMENT_SLIDER,
        slug: block.directiveId || '',
        children: [{ text: '' }],
      } as TElement]

    case 'products':
      return [{
        type: ELEMENT_PRODUCTS,
        slug: block.directiveId || '',
        children: [{ text: '' }],
      } as TElement]

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

    default:
      return [p(block.content)]
  }
}

/** Recursively convert inner content through parseBlocks */
function convertBlocksToPlateNodes(content: string): TElement[] {
  if (!content.trim()) return [p('')]
  const blocks = parseBlocks(content)
  const nodes = blocks.flatMap(blockToPlateNodes)
  return nodes.length > 0 ? nodes : [p('')]
}

/** Main entry point: markdown string → Plate document value */
export function markdownToPlate(markdown: string): TElement[] {
  if (!markdown.trim()) return [p('')]
  return convertBlocksToPlateNodes(markdown)
}
