'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import dynamic from 'next/dynamic'
import type { SliderItem, SliderConfig } from '@/components/SwiperSlider'
import { isTrackingAllowed } from '@/lib/consent'

const SwiperSlider = dynamic(() => import('@/components/SwiperSlider'), { ssr: false })

interface SliderBlockProps {
  sliderRef: string
}

interface SlugResponse {
  sliderId: string
  config: SliderConfig | null
  sponsorVendorId: string | null
  items: SliderItem[]
}

export default function SliderBlock({ sliderRef }: SliderBlockProps) {
  const [items, setItems] = useState<SliderItem[]>([])
  const [config, setConfig] = useState<SliderConfig | null>(null)
  const [sliderId, setSliderId] = useState<string | null>(null)
  const [sponsorVendorId, setSponsorVendorId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const containerRef = useRef<HTMLDivElement>(null)
  const viewTracked = useRef(false)

  useEffect(() => {
    const keywords = ['page', 'product', 'vendor']
    const isKeyword = keywords.includes(sliderRef)

    const url = isKeyword
      ? `/api/sliders?type=${sliderRef}`
      : `/api/sliders?slug=${sliderRef}`

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          // Legacy plain array response
          setItems(data)
        } else if (data && Array.isArray(data.items)) {
          // Object response: { sliderId, config, sponsorVendorId, items }
          const resp = data as SlugResponse
          setItems(resp.items)
          setConfig(resp.config ?? null)
          setSliderId(resp.sliderId ?? null)
          setSponsorVendorId(resp.sponsorVendorId ?? null)
        }
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [sliderRef])

  // Impression tracking: fire view event when slider enters viewport
  useEffect(() => {
    if (!sliderId || viewTracked.current) return

    const el = containerRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !viewTracked.current) {
          viewTracked.current = true
          if (!isTrackingAllowed()) {
            observer.disconnect()
            return
          }
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

  // Click tracking callback
  const handleItemClick = useCallback(
    (itemId: string) => {
      if (!sliderId || !isTrackingAllowed()) return
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

  if (loading) {
    return (
      <div className="my-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse bg-brand-bg-dark rounded-sm aspect-[4/3]" />
        ))}
      </div>
    )
  }

  if (items.length === 0) return null

  return (
    <div ref={containerRef}>
      {sponsorVendorId && (
        <div className="mb-1">
          <span className="text-xs text-brand-text-muted">Anzeige</span>
        </div>
      )}
      <SwiperSlider
        items={items}
        config={config}
        label={`${sliderRef} Slider`}
        onItemClick={sliderId ? handleItemClick : undefined}
      />
    </div>
  )
}
