import { getPublishedContent } from './markdown'
import type { ProductCategory } from '@/components/sections/ProductShowcase'

const SHOWCASE_RE = /^:::showcase\s*$/
const CLOSE_RE = /^:::\s*$/

/**
 * Parses the :::showcase block from the messerwissen page content
 * and returns ProductCategory[] for use on the homepage.
 */
export async function getProductShowcaseItems(): Promise<ProductCategory[]> {
  const data = await getPublishedContent('messerwissen')
  if (!data) return []

  const lines = data.content.split('\n')
  let i = 0

  // Find the :::showcase block
  while (i < lines.length) {
    if (lines[i].match(SHOWCASE_RE)) {
      i++
      break
    }
    i++
  }
  if (i >= lines.length) return []

  // Collect inner lines respecting nested ::: depth
  const innerLines: string[] = []
  let depth = 1
  while (i < lines.length && depth > 0) {
    if (lines[i].match(/^:::\w/)) {
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

  const raw = innerLines.join('\n').trim()
  if (!raw) return []

  return raw.split('\n---\n').map((chunk) => {
    const item: Record<string, string> = {}
    for (const line of chunk.trim().split('\n')) {
      const colonIdx = line.indexOf(':')
      if (colonIdx === -1) continue
      const key = line.slice(0, colonIdx).trim().toLowerCase()
      const value = line.slice(colonIdx + 1).trim()
      if (key && value) item[key] = value
    }
    return {
      name: item.name || '',
      description: item.description || '',
      href: item.href || '#',
      image: item.image || '',
      count: item.count || '',
    }
  }).filter((item) => item.name)
}
