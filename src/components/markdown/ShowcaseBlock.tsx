'use client'

import Link from 'next/link'
import Image from 'next/image'

interface ShowcaseItem {
  name: string
  description: string
  href: string
  image: string
  count?: string
}

/**
 * Parses :::showcase block content into ShowcaseItem[].
 *
 * Format (items separated by ---):
 *   name: Küchenmesser
 *   description: Von Santoku bis Kochmesser
 *   href: /messerwissen/kuechenmesser
 *   image: https://example.com/img.jpg
 *   count: 40+ Modelle
 */
function parseShowcaseItems(content: string): ShowcaseItem[] {
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
      name: item.name || '',
      description: item.description || '',
      href: item.href || '#',
      image: item.image || '',
      count: item.count,
    }
  }).filter((item) => item.name)
}

export default function ShowcaseBlock({ content }: { content: string }) {
  const items = parseShowcaseItems(content)

  if (items.length === 0) return null

  return (
    <div className="not-prose my-12">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
        {items.map((item) => (
          <Link key={item.name} href={item.href} className="group">
            <div className="glass-card overflow-hidden !p-0 h-full flex flex-col">
              {item.image && (
                <div className="relative h-56 sm:h-64 overflow-hidden">
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4">
                    <h3 className="text-xl font-display font-bold !text-white mb-1">
                      {item.name}
                    </h3>
                    {item.count && (
                      <span className="text-white/80 text-sm">{item.count}</span>
                    )}
                  </div>
                </div>
              )}
              <div className="p-6 flex-1 flex flex-col">
                <p className="text-brand-text-muted text-sm leading-relaxed flex-1">
                  {item.description}
                </p>
                <span className="inline-flex items-center mt-4 text-sm font-medium text-brand-accent gap-1 group-hover:gap-2 transition-all">
                  Entdecken
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
