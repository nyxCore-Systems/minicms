'use client'

import React from 'react'
import ReactMarkdown from 'react-markdown'
import type { Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import dynamic from 'next/dynamic'
import { parseBlocks, splitColumns } from '@/lib/directiveParser'
import CalloutBox, { type CalloutType } from '@/components/markdown/CalloutBox'
import ColumnLayout from '@/components/markdown/ColumnLayout'
import FeatureBox from '@/components/markdown/FeatureBox'
import HeroBlock from '@/components/markdown/HeroBlock'
import ShowcaseBlock from '@/components/markdown/ShowcaseBlock'
import OrganicGrid from '@/components/markdown/OrganicGrid'

const HeroSection = dynamic(() => import('@/components/markdown/HeroSection'), { ssr: false })
const CvTimeline = dynamic(() => import('@/components/markdown/CvTimeline'), { ssr: false })
const ProjectBento = dynamic(() => import('@/components/markdown/ProjectBento'), { ssr: false })
const BannerSlot = dynamic(() => import('@/components/BannerSlot'), { ssr: false })
const SliderBlock = dynamic(() => import('@/components/markdown/SliderBlock'), { ssr: false })
const HeroSliderImages = dynamic(() => import('@/components/markdown/HeroSliderImages'), { ssr: false })
const ProductsBlock = dynamic(() => import('@/components/markdown/ProductsBlock'), { ssr: false })

/**
 * Supported custom block syntax (supports nesting):
 *
 *   :::info / :::warning / :::tip / :::danger
 *   Content here...
 *   :::
 *
 *   :::columns-2 / :::columns-3
 *   :::box
 *   Column 1 in a box
 *   :::
 *   ---
 *   :::box
 *   Column 2 in a box
 *   :::
 *   :::
 *
 *   :::box
 *   Content in a glass card
 *   :::
 *
 * Image sizing:
 *   ![Alt text|600x400](url)   → width=600, height=400
 *   ![Alt text|600](url)       → width=600
 */

// Parser functions imported from @/lib/directiveParser

/** Parse image alt for sizing: "Alt text|600x400" or "Alt text|600" */
function parseImageAlt(alt: string): { alt: string; width?: number; height?: number } {
  const match = alt.match(/^(.*?)\|(\d+)(?:x(\d+))?\s*$/)
  if (!match) return { alt }
  return {
    alt: match[1].trim(),
    width: parseInt(match[2], 10),
    height: match[3] ? parseInt(match[3], 10) : undefined,
  }
}

function isVideoSrc(src: unknown): src is string {
  return typeof src === 'string' && /\.(mp4|webm)(\?|$)/i.test(src)
}

const markdownComponents: Components = {
  img: ({ src, alt: rawAlt, ...rest }) => {
    if (isVideoSrc(src)) {
      const { width, height } = parseImageAlt(rawAlt || '')
      return (
        <video
          autoPlay
          muted
          loop
          playsInline
          className={`rounded-lg my-4 ${width ? '' : 'w-full'}`}
          style={width ? { width: `${width}px`, height: height ? `${height}px` : 'auto', maxWidth: '100%' } : undefined}
          src={src}
        />
      )
    }
    const { alt, width, height } = parseImageAlt(rawAlt || '')
    if (width) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          width={width}
          height={height}
          style={{ maxWidth: '100%', height: 'auto', width: `${width}px` }}
          {...rest}
        />
      )
    }
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} {...rest} />
  },
}

function MarkdownSegment({ content }: { content: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
      {content}
    </ReactMarkdown>
  )
}

/** Recursively render parsed blocks (enables nesting) */
function RenderBlocks({ content }: { content: string }) {
  const blocks = parseBlocks(content)

  return (
    <>
      {blocks.map((block, i) => {
        switch (block.type) {
          case 'hero':
            return (
              <HeroBlock key={i}>
                <RenderBlocks content={block.content} />
              </HeroBlock>
            )

          case 'hero-section':
            return <HeroSection key={i} content={block.content} />

          case 'hero-slider':
            return (
              <HeroSliderImages
                key={i}
                content={block.content}
                variant={block.variant as 'viewport' | 'full' | 'fitted'}
              />
            )

          case 'cv-timeline':
            return <CvTimeline key={i} content={block.content} />

          case 'project-bento':
            return <ProjectBento key={i} content={block.content} />

          case 'showcase':
            return <ShowcaseBlock key={i} content={block.content} />

          case 'grid':
            return <OrganicGrid key={i} content={block.content} />

          case 'callout':
            return (
              <CalloutBox key={i} type={block.variant as CalloutType}>
                <RenderBlocks content={block.content} />
              </CalloutBox>
            )

          case 'columns': {
            // Split on top-level --- only (not inside nested blocks)
            const cols = splitColumns(block.content)
            return (
              <ColumnLayout key={i} columns={block.columnCount!}>
                {cols.map((col, j) => (
                  <RenderBlocks key={j} content={col.trim()} />
                ))}
              </ColumnLayout>
            )
          }

          case 'box':
            return (
              <FeatureBox key={i}>
                <RenderBlocks content={block.content} />
              </FeatureBox>
            )

          case 'banner':
            return (
              <BannerSlot
                key={i}
                bannerType="CONTENT_FIXED_WIDE"
                bannerId={block.directiveId}
              />
            )

          case 'slider':
            return <SliderBlock key={i} sliderRef={block.directiveId || ''} />

          case 'products':
            return <ProductsBlock key={i} slug={block.directiveId || ''} />

          default:
            return <MarkdownSegment key={i} content={block.content} />
        }
      })}
    </>
  )
}

export default function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="prose-glass">
      <RenderBlocks content={content} />
    </div>
  )
}
