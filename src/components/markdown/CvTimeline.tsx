'use client'

import { useRef } from 'react'
import { motion, useScroll, useTransform, useInView } from 'framer-motion'
import ReactMarkdown from 'react-markdown'

interface CvTimelineProps {
  content: string
}

function TimelineEntry({ markdown }: { markdown: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-50px' })

  return (
    <div ref={ref} className="relative pl-10 pb-10 last:pb-0">
      {/* Dot marker */}
      <div className="absolute left-0 top-1.5 w-4 h-4 rounded-full border-2 border-brand-accent bg-brand-bg z-[1]" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="prose-glass [&>:first-child]:mt-0 [&>:last-child]:mb-0"
      >
        <ReactMarkdown>{markdown.trim()}</ReactMarkdown>
      </motion.div>
    </div>
  )
}

export default function CvTimeline({ content }: CvTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start 80%', 'end 20%'],
  })
  const scaleY = useTransform(scrollYProgress, [0, 1], [0, 1])

  // Split entries on top-level ---
  const entries = content
    .split(/\n---\n/)
    .map(s => s.trim())
    .filter(Boolean)

  return (
    <div ref={containerRef} className="relative my-8">
      {/* Background line (gray) */}
      <div className="absolute left-[7px] top-0 bottom-0 w-0.5 bg-brand-text-muted/30" />

      {/* Animated accent line */}
      <motion.div
        className="absolute left-[7px] top-0 bottom-0 w-0.5 bg-brand-accent origin-top"
        style={{ scaleY }}
      />

      {entries.map((entry, i) => (
        <TimelineEntry key={i} markdown={entry} />
      ))}
    </div>
  )
}
