/**
 * Shared directive parser — used by both MarkdownContent (public rendering)
 * and the Plate.js WYSIWYG editor (serialization layer).
 */

export const DIRECTIVE_RE = /^:::(hero-slider-viewport|hero-slider-full|hero-slider-fitted|hero|hero-section|cv-timeline|project-bento|showcase|grid|info|warning|tip|danger|columns-2|columns-3|box|artists-grid|upcoming-events|donate|banner|banner-[a-zA-Z0-9]+|slider-[a-zA-Z0-9-]+|products-[a-zA-Z0-9-]+)\s*$/
export const CLOSE_RE = /^:::\s*$/
/** Matches ANY opening fence `:::name` (known or not). Used for the
 * directive-raw safety net and for nesting-depth tracking. */
export const GENERIC_DIRECTIVE_RE = /^:::([a-zA-Z0-9][a-zA-Z0-9-]*)\s*$/
export const CALLOUT_TYPES = new Set(['info', 'warning', 'tip', 'danger'])

export interface Block {
  type: 'markdown' | 'hero' | 'hero-section' | 'hero-slider' | 'cv-timeline' | 'project-bento' | 'showcase' | 'grid' | 'callout' | 'columns' | 'box' | 'artists-grid' | 'upcoming-events' | 'donate' | 'banner' | 'slider' | 'products' | 'directive-raw'
  content: string
  variant?: string
  columnCount?: 2 | 3
  directiveId?: string
}

export function parseBlocks(raw: string): Block[] {
  const lines = raw.split('\n')
  const blocks: Block[] = []
  let i = 0

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
      } else if (directive === 'artists-grid') {
        blocks.push({ type: 'artists-grid', content: '' })
      } else if (directive === 'upcoming-events') {
        blocks.push({ type: 'upcoming-events', content: '' })
      } else if (directive === 'donate') {
        blocks.push({ type: 'donate', content: '' })
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

  return blocks
}

/** Split column content on `---` that is not inside a nested ::: block */
export function splitColumns(raw: string): string[] {
  const lines = raw.split('\n')
  const columns: string[][] = [[]]
  let depth = 0

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

  return columns.map(col => col.join('\n'))
}
