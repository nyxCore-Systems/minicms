'use client'

import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'

interface HeroSectionProps {
  content: string
}

/**
 * Parse hero-section markdown content:
 *   ![bg](/path/to/image.jpg)   → background image
 *   # Big Title                 → title
 *   Subtitle text               → subtitle
 *   [CTA Button](/link)         → CTA buttons
 */
function parseHeroContent(raw: string) {
  const lines = raw.trim().split('\n')
  let backgroundImage = ''
  let title = ''
  let subtitle = ''
  const ctas: { label: string; href: string }[] = []

  for (const line of lines) {
    const trimmed = line.trim()

    // Background image: ![...](url)
    const imgMatch = trimmed.match(/^!\[.*?\]\((.+?)\)$/)
    if (imgMatch) {
      backgroundImage = imgMatch[1]
      continue
    }

    // Title: # Heading
    const h1Match = trimmed.match(/^#\s+(.+)$/)
    if (h1Match) {
      title = h1Match[1]
      continue
    }

    // CTA link: [Label](url)
    const linkMatch = trimmed.match(/^\[(.+?)\]\((.+?)\)$/)
    if (linkMatch) {
      ctas.push({ label: linkMatch[1], href: linkMatch[2] })
      continue
    }

    // Subtitle: any remaining non-empty text
    if (trimmed && !subtitle) {
      subtitle = trimmed
    }
  }

  return { backgroundImage, title, subtitle, ctas }
}

export default function HeroSection({ content }: HeroSectionProps) {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  })
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '-20%'])

  const { backgroundImage, title, subtitle, ctas } = parseHeroContent(content)

  return (
    <section
      ref={ref}
      className="relative w-full min-h-[80vh] flex items-center justify-center overflow-hidden"
    >
      {backgroundImage && (
        <motion.div
          className="absolute inset-0 z-0"
          style={{ y }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={backgroundImage}
            alt=""
            className="w-full h-[120%] object-cover"
          />
        </motion.div>
      )}

      {/* Gradient overlay */}
      <div className="absolute inset-0 z-[1] bg-gradient-to-t from-black/70 via-black/40 to-transparent" />

      {/* Content */}
      <div className="relative z-[2] text-center px-6 max-w-4xl mx-auto">
        {title && (
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-4 drop-shadow-lg">
            {title}
          </h1>
        )}
        {subtitle && (
          <p className="text-lg sm:text-xl md:text-2xl text-white/90 mb-8 drop-shadow">
            {subtitle}
          </p>
        )}
        {ctas.length > 0 && (
          <div className="flex flex-wrap gap-4 justify-center">
            {ctas.map((cta, i) => (
              <a
                key={i}
                href={cta.href}
                className="btn-primary"
              >
                {cta.label}
              </a>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
