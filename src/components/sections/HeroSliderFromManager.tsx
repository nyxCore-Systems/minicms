'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import dynamic from 'next/dynamic'
import type { HeroSlide, SliderVariant, SliderGradient } from '@/components/markdown/HeroSliderImages'

const variantHeightClass: Record<SliderVariant, string> = {
  viewport: 'h-screen',
  full: 'h-[60vh]',
  fitted: 'h-[50vh]',
}

const HeroSliderImages = dynamic(() => import('@/components/markdown/HeroSliderImages'), {
  ssr: false,
  loading: () => null, // Handled by wrapper below
})

interface SliderApiItem {
  id: string
  title: string
  subtitle?: string | null
  imageUrl?: string | null
  videoUrl?: string | null
  linkUrl?: string | null
  buttonText?: string | null
  type: string
  config?: { gradient?: 'none' | 'dark' | 'light'; kenBurns?: boolean } | null
}

interface SliderApiResponse {
  sliderId: string | null
  config: Record<string, unknown> | null
  sponsorVendorId: string | null
  items: SliderApiItem[]
}

export default function HeroSliderFromManager({
  sliderSlug,
  variant = 'viewport',
  gradient,
  animate,
}: {
  sliderSlug: string
  variant?: SliderVariant
  gradient?: SliderGradient
  animate?: boolean
}) {
  const [slides, setSlides] = useState<HeroSlide[]>([])
  const [sliderId, setSliderId] = useState<string | null>(null)
  const [sliderAutoplay, setSliderAutoplay] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)

  const viewTracked = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch(`/api/sliders?slug=${sliderSlug}`)
      .then((res) => res.json())
      .then((data: SliderApiResponse) => {
        if (data && Array.isArray(data.items)) {
          setSliderId(data.sliderId)
          // Read autoplay from slider manager config
          if (data.config && typeof data.config.autoplay === 'boolean') {
            setSliderAutoplay(data.config.autoplay)
          }
          const heroSlides = data.items
            .filter((item) => item.videoUrl || item.imageUrl)
            .map((item) => ({
              image: item.videoUrl || item.imageUrl || '',
              heading: item.title || undefined,
              description: item.subtitle || undefined,
              button: item.linkUrl ? (item.buttonText || 'Mehr erfahren') : undefined,
              href: item.linkUrl || undefined,
              gradient: (item.config?.gradient as SliderGradient) || undefined,
              kenBurns: item.config?.kenBurns,
            }))
          setSlides(heroSlides)
        }
      })
      .catch(() => setSlides([]))
      .finally(() => setLoading(false))
  }, [sliderSlug])

  // Impression tracking
  useEffect(() => {
    if (!sliderId || viewTracked.current) return
    const el = containerRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !viewTracked.current) {
          viewTracked.current = true
          navigator.sendBeacon(
            '/api/tracking/slider',
            JSON.stringify({
              sliderId,
              eventType: 'view',
              path: window.location.pathname,
              sessionId: sessionStorage.getItem('_dm_sid') || undefined,
            })
          )
          observer.disconnect()
        }
      },
      { threshold: 0.3 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [sliderId])

  // Click tracking (fired when user clicks a slide's button)
  const handleSlideClick = useCallback(
    (itemId?: string) => {
      if (!sliderId) return
      navigator.sendBeacon(
        '/api/tracking/slider',
        JSON.stringify({
          sliderId,
          eventType: 'click',
          itemId,
          path: window.location.pathname,
          sessionId: sessionStorage.getItem('_dm_sid') || undefined,
        })
      )
    },
    [sliderId]
  )

  const heightClass = variantHeightClass[variant]

  if (loading) {
    return (
      <div className={`${heightClass} w-full animate-pulse bg-brand-bg-dark`} />
    )
  }

  if (slides.length === 0) {
    return <div className={`${heightClass} w-full bg-brand-bg-dark`} />
  }

  // Combine section config animate with slider manager autoplay —
  // if either source says "no animation", disable it
  const shouldAnimate = animate !== false && sliderAutoplay !== false

  return (
    <div ref={containerRef} className={`${heightClass} w-full bg-brand-bg-dark`} onClick={() => handleSlideClick()}>
      <HeroSliderImages slides={slides} variant={variant} gradient={gradient} animate={shouldAnimate} />
    </div>
  )
}
