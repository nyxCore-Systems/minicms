'use client'

import React from 'react'
import { PlateLeaf, PlateElement, type PlateLeafProps, type PlateElementProps } from '@udecode/plate/react'

// ── Leaf components (marks) ─────────────────────────────────────────

export function BoldLeaf(props: PlateLeafProps) {
  return <PlateLeaf as="strong" {...props} />
}

export function ItalicLeaf(props: PlateLeafProps) {
  return <PlateLeaf as="em" {...props} />
}

export function StrikethroughLeaf(props: PlateLeafProps) {
  return <PlateLeaf as="s" {...props} />
}

export function CodeLeaf(props: PlateLeafProps) {
  return (
    <PlateLeaf
      as="code"
      {...props}
      className="bg-brand-bg-dark text-red-600 px-1 py-0.5 rounded text-sm font-mono"
    />
  )
}

// ── Element components (blocks) ─────────────────────────────────────

export function HeadingElement(props: PlateElementProps) {
  const { element } = props
  const tag = (element.type as string) || 'h1'
  return <PlateElement as={tag as any} {...props} className={headingClass(tag)} />
}

function headingClass(tag: string): string {
  switch (tag) {
    case 'h1': return 'text-3xl font-bold mt-6 mb-3'
    case 'h2': return 'text-2xl font-bold mt-5 mb-2'
    case 'h3': return 'text-xl font-semibold mt-4 mb-2'
    case 'h4': return 'text-lg font-semibold mt-3 mb-1'
    case 'h5': return 'text-base font-semibold mt-2 mb-1'
    case 'h6': return 'text-sm font-semibold mt-2 mb-1'
    default: return ''
  }
}

export function BlockquoteElement(props: PlateElementProps) {
  return (
    <PlateElement
      as="blockquote"
      {...props}
      className="border-l-4 border-gray-300 pl-4 italic text-brand-text-muted my-2"
    />
  )
}

export function HorizontalRuleElement(props: PlateElementProps) {
  return (
    <PlateElement {...props}>
      <hr className="border-t border-gray-300 my-4" />
      {props.children}
    </PlateElement>
  )
}

export function ImageElement(props: PlateElementProps) {
  const { element, children } = props
  const url = (element as any).url || ''
  const alt = (element as any).alt || ''

  return (
    <PlateElement {...props}>
      <div contentEditable={false} className="my-2">
        {url ? (
          <img
            src={url}
            alt={alt}
            className="max-w-full h-auto rounded-lg"
          />
        ) : (
          <div className="bg-brand-bg-dark border border-dashed border-gray-300 rounded-lg p-4 text-center text-brand-text-light text-sm">
            Kein Bild
          </div>
        )}
      </div>
      {children}
    </PlateElement>
  )
}

export function LinkElement(props: PlateElementProps) {
  const { element } = props
  const url = (element as any).url || ''

  return (
    <PlateElement
      as="a"
      {...props}
      className="text-blue-600 underline hover:text-blue-800 cursor-pointer"
      // @ts-expect-error — href is valid on <a>
      href={url}
      onClick={(e: React.MouseEvent) => e.preventDefault()}
    />
  )
}

export function UnorderedListElement(props: PlateElementProps) {
  return <PlateElement as="ul" {...props} className="list-disc pl-6 my-2" />
}

export function OrderedListElement(props: PlateElementProps) {
  return <PlateElement as="ol" {...props} className="list-decimal pl-6 my-2" />
}

export function ListItemElement(props: PlateElementProps) {
  return <PlateElement as="li" {...props} />
}

export function ListItemContentElement(props: PlateElementProps) {
  return <PlateElement as="span" {...props} />
}

export function CodeBlockElement(props: PlateElementProps) {
  return (
    <PlateElement
      as="pre"
      {...props}
      className="bg-gray-900 text-gray-100 rounded-lg p-4 my-2 overflow-x-auto text-sm font-mono"
    />
  )
}

export function CodeLineElement(props: PlateElementProps) {
  return <PlateElement as="div" {...props} />
}

export function ParagraphElement(props: PlateElementProps) {
  return <PlateElement as="p" {...props} className="my-1" />
}
