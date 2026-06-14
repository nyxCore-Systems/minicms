'use client'

import { useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'

interface BannerData {
  id: string
  title: string
  imageUrl: string | null
  videoUrl: string | null
  linkUrl: string | null
  width: number | null
  height: number | null
}

interface BannerDisplayProps {
  banner: BannerData
}

export default function BannerDisplay({ banner }: BannerDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const impressionSent = useRef(false)

  const sendTracking = useCallback(
    (eventType: 'view' | 'click') => {
      const payload = JSON.stringify({
        adId: banner.id,
        eventType,
        path: window.location.pathname,
        sessionId: null,
      })
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/tracking/banner', payload)
      } else {
        fetch('/api/tracking/banner', {
          method: 'POST',
          body: payload,
          keepalive: true,
        })
      }
    },
    [banner.id]
  )

  useEffect(() => {
    const el = containerRef.current
    if (!el || impressionSent.current) return

    let timer: ReturnType<typeof setTimeout> | null = null

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !impressionSent.current) {
          timer = setTimeout(() => {
            impressionSent.current = true
            sendTracking('view')
          }, 1000)
        } else if (timer) {
          clearTimeout(timer)
          timer = null
        }
      },
      { threshold: 0.5 }
    )

    observer.observe(el)
    return () => {
      observer.disconnect()
      if (timer) clearTimeout(timer)
    }
  }, [sendTracking])

  const handleClick = () => {
    sendTracking('click')
  }

  if (!banner.imageUrl && !banner.videoUrl) return null

  const width = banner.width || 970
  const height = banner.height || 250

  const isVideo = !!banner.videoUrl

  const content = (
    <div
      ref={containerRef}
      className={`relative overflow-hidden rounded-sm ${isVideo ? 'inline-block' : 'w-full'}`}
      style={isVideo ? { width, height } : undefined}
      aria-label={`Werbeanzeige: ${banner.title}`}
      role="complementary"
    >
      {isVideo ? (
        <video
          autoPlay
          muted
          loop
          playsInline
          width={width}
          height={height}
          className="block"
          src={banner.videoUrl!}
        />
      ) : (
        <Image
          src={banner.imageUrl!}
          alt={banner.title}
          width={width}
          height={height}
          className="w-full h-auto"
          sizes="(max-width: 768px) 100vw, 970px"
        />
      )}
      <span className="absolute top-2 right-2 px-1.5 py-0.5 text-[10px] font-medium bg-black/50 text-white/80 rounded" aria-hidden="true">
        Anzeige
      </span>
    </div>
  )

  if (banner.linkUrl) {
    return (
      <a
        href={banner.linkUrl}
        target="_blank"
        rel="noopener noreferrer sponsored"
        onClick={handleClick}
        className="block"
      >
        {content}
      </a>
    )
  }

  return content
}
