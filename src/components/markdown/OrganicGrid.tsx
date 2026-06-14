'use client'

import Link from 'next/link'
import Image from 'next/image'

interface GridItem {
  title: string
  image: string
  href: string
  description?: string
}

/**
 * Parses :::grid block content into GridItem[].
 *
 * Format (items separated by ---):
 *   title: Bushmesser
 *   image: https://...
 *   href: /produkte/bushmesser
 *   description: Robuste Outdoormesser
 */
function parseGridItems(content: string): GridItem[] {
  const raw = content.trim()
  if (!raw) return []

  return raw.split(/\n---\n/).map((chunk) => {
    const item: Record<string, string> = {}
    for (const line of chunk.trim().split('\n')) {
      const colonIdx = line.indexOf(':')
      if (colonIdx === -1) continue
      const key = line.slice(0, colonIdx).trim().toLowerCase()
      const value = line.slice(colonIdx + 1).trim()
      if (key && value) item[key] = value
    }
    return {
      title: item.title || '',
      image: item.image || '',
      href: item.href || '#',
      description: item.description,
    }
  }).filter((item) => item.title)
}

/**
 * Determines which grid items should span 2 columns for an organic layout.
 * Returns a Set of indices that should be "featured" (larger).
 */
function getFeaturedIndices(count: number): Set<number> {
  if (count <= 2) return new Set()
  if (count === 3) return new Set([0])
  if (count === 4) return new Set([0, 3])
  if (count === 5) return new Set([0, 3])
  // For 6+ items, feature every 3rd starting from 0
  const featured = new Set<number>()
  for (let i = 0; i < count; i += 3) {
    featured.add(i)
  }
  return featured
}

export default function OrganicGrid({ content }: { content: string }) {
  const items = parseGridItems(content)

  if (items.length === 0) return null

  const featured = getFeaturedIndices(items.length)

  return (
    <div className="not-prose my-12">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 auto-rows-[280px]">
        {items.map((item, i) => {
          const isFeatured = featured.has(i)

          return (
            <Link
              key={`${item.title}-${i}`}
              href={item.href}
              className={`group relative overflow-hidden rounded-sm border border-brand-border shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1 ${
                isFeatured ? 'sm:col-span-2 lg:col-span-2' : ''
              }`}
            >
              {item.image && (
                <Image
                  src={item.image}
                  alt={item.title}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                  sizes={isFeatured
                    ? '(max-width: 640px) 100vw, (max-width: 1024px) 100vw, 66vw'
                    : '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw'
                  }
                />
              )}

              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

              {/* Content */}
              <div className="absolute bottom-0 left-0 right-0 p-5">
                <h3 className="text-lg font-display font-bold text-white mb-1 group-hover:translate-x-1 transition-transform duration-300">
                  {item.title}
                </h3>
                {item.description && (
                  <p className="text-white/80 text-sm leading-relaxed line-clamp-2">
                    {item.description}
                  </p>
                )}
              </div>

              {/* Hover accent bar */}
              <div className="absolute top-0 left-0 w-full h-1 bg-brand-accent scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
            </Link>
          )
        })}
      </div>
    </div>
  )
}
