import ReactMarkdown from 'react-markdown'
import type { Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'

/**
 * Lightweight markdown renderer for the Noir homepage sections (manifest text,
 * donate subtitle, …). Unlike the full `MarkdownContent` renderer it carries NO
 * directive/hero/slider machinery and no prose typography — it emits plain
 * paragraphs, emphasis, links, lists and rules that inherit the surrounding
 * `.nh-*` styling (see the `.nh-rich` block in globals.css). Raw HTML is not
 * enabled, so admin-authored content is XSS-safe.
 *
 * `className` is applied to the wrapper so callers can layer the section's own
 * text class (e.g. `nh-sub`) on top of `nh-rich`.
 */
const components: Components = {
  // External links open in a new tab; internal links stay in place.
  a: ({ href, children }) => {
    const external = !!href && /^https?:\/\//.test(href)
    return (
      <a
        href={href}
        {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      >
        {children}
      </a>
    )
  },
}

export default function NoirRichText({
  content,
  className = '',
}: {
  content: string
  className?: string
}) {
  return (
    <div className={`nh-rich ${className}`.trim()}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  )
}
