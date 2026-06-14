'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'

interface ProjectBentoProps {
  content: string
}

const VIDEO_EXTENSIONS = /\.(mp4|webm)$/i

function BentoCard({ markdown, isFirst }: { markdown: string; isFirst: boolean }) {
  const [hovering, setHovering] = useState(false)

  // Extract image/video from the markdown
  const imgMatch = markdown.match(/!\[.*?\]\((.+?)\)/)
  const mediaSrc = imgMatch ? imgMatch[1] : null
  const isVideo = mediaSrc ? VIDEO_EXTENSIONS.test(mediaSrc) : false
  // Remove the image line from content for separate rendering
  const textContent = markdown.replace(/!\[.*?\]\(.+?\)\n?/, '').trim()

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className={`glass-card overflow-hidden ${isFirst ? 'md:col-span-2' : ''}`}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      {mediaSrc && (
        <div className="relative w-full aspect-video overflow-hidden -mt-5 -mx-5 mb-4" style={{ width: 'calc(100% + 2.5rem)' }}>
          {isVideo ? (
            <video
              src={mediaSrc}
              className="w-full h-full object-cover"
              muted
              loop
              playsInline
              autoPlay={hovering}
              ref={(el) => {
                if (!el) return
                if (hovering) el.play().catch(() => {})
                else el.pause()
              }}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={mediaSrc}
              alt=""
              className="w-full h-full object-cover"
            />
          )}
        </div>
      )}
      {textContent && (
        <div className="prose-glass [&>:first-child]:mt-0 [&>:last-child]:mb-0">
          <ReactMarkdown>{textContent}</ReactMarkdown>
        </div>
      )}
    </motion.div>
  )
}

/**
 * Parse :::box blocks from the bento content.
 * The content arrives with nested :::box ... ::: blocks separated by ---.
 */
function parseBentoBoxes(raw: string): string[] {
  const BOX_RE = /^:::box\s*$/
  const CLOSE_RE = /^:::\s*$/
  const lines = raw.split('\n')
  const boxes: string[] = []
  let i = 0

  while (i < lines.length) {
    if (lines[i].match(BOX_RE)) {
      i++
      const inner: string[] = []
      let depth = 1
      while (i < lines.length && depth > 0) {
        if (lines[i].match(BOX_RE)) {
          depth++
          inner.push(lines[i])
        } else if (lines[i].match(CLOSE_RE)) {
          depth--
          if (depth > 0) inner.push(lines[i])
        } else {
          inner.push(lines[i])
        }
        i++
      }
      const content = inner.join('\n').trim()
      if (content) boxes.push(content)
    } else {
      i++
    }
  }

  return boxes
}

export default function ProjectBento({ content }: ProjectBentoProps) {
  const boxes = parseBentoBoxes(content)

  return (
    <div className="my-8 grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-auto">
      {boxes.map((box, i) => (
        <BentoCard key={i} markdown={box} isFirst={i === 0} />
      ))}
    </div>
  )
}
