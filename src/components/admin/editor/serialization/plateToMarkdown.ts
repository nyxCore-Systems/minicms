import type { TElement, TText } from '@udecode/plate'
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
  ELEMENT_ARTISTS_GRID,
  ELEMENT_UPCOMING_EVENTS,
  ELEMENT_DIRECTIVE_RAW,
  type HeroSliderElement,
  type ShowcaseElement,
  type GridElement,
  type BannerElement,
  type SliderBlockElement,
  type ProductsElement,
} from '../types'

// ── Helpers ─────────────────────────────────────────────────────────

function isText(node: unknown): node is TText {
  return typeof node === 'object' && node !== null && 'text' in node
}

function isElement(node: unknown): node is TElement {
  return typeof node === 'object' && node !== null && 'type' in node && 'children' in node
}

/** Serialize inline marks on a text node */
function serializeTextNode(node: TText): string {
  let text = node.text
  if (!text) return ''
  if ((node as any).bold) text = `**${text}**`
  if ((node as any).italic) text = `*${text}*`
  if ((node as any).strikethrough) text = `~~${text}~~`
  if ((node as any).code) text = `\`${text}\``
  return text
}

/** Serialize children (text nodes + inline elements) to inline markdown */
function serializeInline(children: (TElement | TText)[]): string {
  return children.map((child) => {
    if (isText(child)) return serializeTextNode(child)
    if (isElement(child)) {
      if (child.type === 'a') {
        const url = (child as any).url || ''
        const text = serializeInline(child.children as (TElement | TText)[])
        return `[${text}](${url})`
      }
      if (child.type === 'img') {
        const url = (child as any).url || ''
        const alt = (child as any).alt || ''
        return `![${alt}](${url})`
      }
      // Fallback: just serialize child text
      return serializeInline(child.children as (TElement | TText)[])
    }
    return ''
  }).join('')
}

// ── Node serializers ────────────────────────────────────────────────

function serializeNode(node: TElement | TText, depth: number = 0): string {
  if (isText(node)) return serializeTextNode(node)
  if (!isElement(node)) return ''

  const el = node as TElement

  switch (el.type) {
    case 'p':
      return serializeInline(el.children as (TElement | TText)[])

    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4':
    case 'h5':
    case 'h6': {
      const level = parseInt(el.type.slice(1), 10)
      const hashes = '#'.repeat(level)
      return `${hashes} ${serializeInline(el.children as (TElement | TText)[])}`
    }

    case 'blockquote': {
      const inner = serializeChildren(el.children as TElement[])
      return inner.split('\n').map(line => `> ${line}`).join('\n')
    }

    case 'code_block': {
      const lang = (el as any).lang || ''
      const code = (el.children as TElement[])
        .map(line => serializeInline(line.children as (TElement | TText)[]))
        .join('\n')
      return `\`\`\`${lang}\n${code}\n\`\`\``
    }

    case 'hr':
      return '---'

    case 'ul':
    case 'ol': {
      return (el.children as TElement[]).map((li, i) => {
        const prefix = el.type === 'ol' ? `${i + 1}. ` : '- '
        const content = serializeChildren(li.children as TElement[])
        return `${prefix}${content}`
      }).join('\n')
    }

    case 'li':
      return serializeChildren(el.children as TElement[])

    case 'img': {
      const url = (el as any).url || ''
      const alt = (el as any).alt || ''
      return `![${alt}](${url})`
    }

    case 'table': {
      const rows = el.children as TElement[]
      if (rows.length === 0) return ''
      const headerRow = rows[0]
      const headerCells = (headerRow.children as TElement[]).map(cell =>
        serializeInline(((cell.children as TElement[])[0]?.children || []) as (TElement | TText)[])
      )
      const separator = headerCells.map(() => '-------').join(' | ')
      const header = headerCells.join(' | ')
      const bodyRows = rows.slice(1).map(row => {
        return (row.children as TElement[]).map(cell =>
          serializeInline(((cell.children as TElement[])[0]?.children || []) as (TElement | TText)[])
        ).join(' | ')
      })
      return [`| ${header} |`, `| ${separator} |`, ...bodyRows.map(r => `| ${r} |`)].join('\n')
    }

    // ── Custom directive elements ─────────────────────────────────

    case ELEMENT_CALLOUT: {
      const variant = (el as any).variant || 'info'
      const inner = serializeChildren(el.children as TElement[])
      return `:::${variant}\n${inner}\n:::`
    }

    case ELEMENT_BOX: {
      const inner = serializeChildren(el.children as TElement[])
      return `:::box\n${inner}\n:::`
    }

    case ELEMENT_HERO: {
      const inner = serializeChildren(el.children as TElement[])
      return `:::hero\n${inner}\n:::`
    }

    case ELEMENT_COLUMNS: {
      const count = (el as any).columnCount || 2
      const cols = (el.children as TElement[])
        .filter(c => c.type === ELEMENT_COLUMN)
        .map(col => serializeChildren(col.children as TElement[]))
      return `:::columns-${count}\n${cols.join('\n---\n')}\n:::`
    }

    case ELEMENT_HERO_SECTION: {
      const raw = (el as any).rawMarkdown || ''
      return `:::hero-section\n${raw}\n:::`
    }

    case ELEMENT_HERO_SLIDER: {
      const slider = el as unknown as HeroSliderElement
      const variant = slider.variant || 'viewport'
      const slidesStr = (slider.slides || []).map(s => {
        const lines: string[] = []
        if (s.image) lines.push(`image: ${s.image}`)
        if (s.heading) lines.push(`heading: ${s.heading}`)
        if (s.description) lines.push(`description: ${s.description}`)
        if (s.button) lines.push(`button: ${s.button}`)
        if (s.href) lines.push(`href: ${s.href}`)
        return lines.join('\n')
      }).join('\n---\n')
      return `:::hero-slider-${variant}\n${slidesStr}\n:::`
    }

    case ELEMENT_CV_TIMELINE: {
      const raw = (el as any).rawMarkdown || ''
      return `:::cv-timeline\n${raw}\n:::`
    }

    case ELEMENT_PROJECT_BENTO: {
      const raw = (el as any).rawMarkdown || ''
      return `:::project-bento\n${raw}\n:::`
    }

    case ELEMENT_SHOWCASE: {
      const showcase = el as unknown as ShowcaseElement
      const itemsStr = (showcase.items || []).map(item => {
        const lines: string[] = []
        if (item.name) lines.push(`name: ${item.name}`)
        if (item.description) lines.push(`description: ${item.description}`)
        if (item.href) lines.push(`href: ${item.href}`)
        if (item.image) lines.push(`image: ${item.image}`)
        if (item.count) lines.push(`count: ${item.count}`)
        return lines.join('\n')
      }).join('\n---\n')
      return `:::showcase\n${itemsStr}\n:::`
    }

    case ELEMENT_GRID: {
      const grid = el as unknown as GridElement
      const itemsStr = (grid.items || []).map(item => {
        const lines: string[] = []
        if (item.title) lines.push(`title: ${item.title}`)
        if (item.image) lines.push(`image: ${item.image}`)
        if (item.href) lines.push(`href: ${item.href}`)
        if (item.description) lines.push(`description: ${item.description}`)
        return lines.join('\n')
      }).join('\n---\n')
      return `:::grid\n${itemsStr}\n:::`
    }

    case ELEMENT_BANNER: {
      const banner = el as unknown as BannerElement
      if (banner.bannerId) return `:::banner-${banner.bannerId}\n:::`
      return `:::banner\n:::`
    }

    case ELEMENT_DONATE:
      return `:::donate\n:::`

    case ELEMENT_SLIDER: {
      const slider = el as unknown as SliderBlockElement
      return `:::slider-${slider.slug}\n:::`
    }

    case ELEMENT_PRODUCTS: {
      const products = el as unknown as ProductsElement
      return `:::products-${products.slug}\n:::`
    }

    case ELEMENT_ARTISTS_GRID:
      return `:::artists-grid\n:::`

    case ELEMENT_UPCOMING_EVENTS:
      return `:::upcoming-events\n:::`

    case ELEMENT_DIRECTIVE_RAW: {
      return (el as any).rawMarkdown || ''
    }

    default:
      // Unknown element — try to serialize children
      return serializeChildren(el.children as TElement[])
  }
}

/** Serialize an array of block elements, joining with double newlines */
function serializeChildren(nodes: TElement[]): string {
  return nodes.map(n => serializeNode(n)).join('\n\n')
}

/** Main entry point: Plate document value → markdown string */
export function plateToMarkdown(value: TElement[]): string {
  if (!value || value.length === 0) return ''
  return serializeChildren(value).trim()
}
