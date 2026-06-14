'use client'

import { useState, useEffect } from 'react'
import BannerDisplay from './BannerDisplay'

interface BannerSlotProps {
  bannerType?: string
  bannerId?: string
}

interface BannerData {
  id: string
  title: string
  imageUrl: string | null
  videoUrl: string | null
  linkUrl: string | null
  width: number | null
  height: number | null
}

export default function BannerSlot({ bannerType = 'CONTENT_FIXED_WIDE', bannerId }: BannerSlotProps) {
  const [banner, setBanner] = useState<BannerData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const params = new URLSearchParams()
    if (bannerId) {
      params.set('id', bannerId)
    } else {
      params.set('type', bannerType)
    }

    fetch(`/api/banners?${params}`)
      .then((res) => res.json())
      .then((data) => setBanner(data))
      .catch(() => setBanner(null))
      .finally(() => setLoading(false))
  }, [bannerType, bannerId])

  if (loading) {
    return (
      <div className="w-full animate-pulse bg-brand-bg-dark rounded-sm" style={{ aspectRatio: '970/250' }} />
    )
  }

  if (!banner) return null

  return (
    <div className="my-6">
      <BannerDisplay banner={banner} />
    </div>
  )
}
