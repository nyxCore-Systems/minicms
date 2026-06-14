'use client'

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

export default function HeroSliderSection({
  slides,
  variant = 'viewport',
  gradient,
  animate,
}: {
  slides: HeroSlide[]
  variant: SliderVariant
  gradient?: SliderGradient
  animate?: boolean
}) {
  return (
    <div className={`${variantHeightClass[variant]} w-full bg-brand-bg-dark`}>
      <HeroSliderImages slides={slides} variant={variant} gradient={gradient} animate={animate} />
    </div>
  )
}
