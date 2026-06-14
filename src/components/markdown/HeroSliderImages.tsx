'use client'

import { useRef, useCallback } from 'react'
import { Swiper, SwiperSlide } from 'swiper/react'
import { EffectFade, Autoplay, Navigation, Pagination } from 'swiper/modules'
import type { Swiper as SwiperType } from 'swiper'
import Link from 'next/link'

import 'swiper/css'
import 'swiper/css/effect-fade'
import 'swiper/css/navigation'
import 'swiper/css/pagination'

export interface HeroSlide {
  image: string
  heading?: string
  description?: string
  button?: string
  href?: string
  gradient?: SliderGradient
  kenBurns?: boolean
}

export type SliderVariant = 'viewport' | 'full' | 'fitted'
export type SliderGradient = 'none' | 'dark' | 'light'

function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm)(\?|$)/i.test(url)
}

function parseSlides(content: string): HeroSlide[] {
  const raw = content.trim()
  if (!raw) return []

  return raw.split(/\n---\n/).map((chunk) => {
    const item: Record<string, string> = {}
    for (const line of chunk.trim().split('\n')) {
      const colonIdx = line.indexOf(':')
      if (colonIdx === -1) continue
      const key = line.slice(0, colonIdx).trim().toLowerCase()
      const value = line.slice(colonIdx + 1).trim()
      if (key && value) item[key] = value
    }
    return {
      image: item.image || '',
      heading: item.heading,
      description: item.description,
      button: item.button,
      href: item.href,
    }
  }).filter((s) => s.image)
}

const variantClasses: Record<SliderVariant, string> = {
  viewport: 'h-screen w-full',
  full: 'h-[60vh] w-full',
  fitted: 'h-[50vh] max-w-7xl mx-auto',
}

const gradientClasses: Record<SliderGradient, string> = {
  none: '',
  dark: 'bg-gradient-to-t from-black/60 via-black/25 to-transparent',
  light: 'bg-gradient-to-t from-black/30 via-black/10 to-transparent',
}

export default function HeroSliderImages({
  content,
  slides: slidesProp,
  variant = 'viewport',
  gradient = 'dark',
  animate = true,
}: {
  content?: string
  slides?: HeroSlide[]
  variant?: SliderVariant
  gradient?: SliderGradient
  animate?: boolean
}) {
  const slides = slidesProp ?? parseSlides(content || '')
  const swiperRef = useRef<SwiperType | null>(null)

  const resetKenBurns = useCallback(() => {
    if (!swiperRef.current) return
    const el = swiperRef.current.el
    // Remove animation from all slides, then add to active
    const allBgs = el.querySelectorAll<HTMLElement>('[data-ken-burns]')
    allBgs.forEach((bg) => {
      bg.style.animation = 'none'
      // force reflow
      void bg.offsetHeight
    })
    const activeSlide = el.querySelector('.swiper-slide-active [data-ken-burns]') as HTMLElement | null
    if (activeSlide && activeSlide.dataset.kenBurnsEnabled !== 'false') {
      activeSlide.style.animation = 'heroKenBurns 8s ease-out forwards'
    }
  }, [])

  if (slides.length === 0) return null

  return (
    <div className={`not-prose relative overflow-hidden ${variantClasses[variant]}`}>
      {/* Ken Burns keyframes */}
      <style>{`
        @keyframes heroKenBurns {
          from { transform: scale(1); }
          to { transform: scale(1.15); }
        }
        @keyframes heroFadeInUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .hero-slider .swiper-button-prev,
        .hero-slider .swiper-button-next {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: rgba(255,255,255,0.15);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border: 1px solid rgba(255,255,255,0.2);
          color: white;
          transition: background 0.2s;
        }
        .hero-slider .swiper-button-prev:hover,
        .hero-slider .swiper-button-next:hover {
          background: rgba(255,255,255,0.25);
        }
        .hero-slider .swiper-button-prev::after,
        .hero-slider .swiper-button-next::after {
          font-size: 18px;
          font-weight: 700;
        }
        .hero-slider .swiper-pagination-bullet {
          width: 10px;
          height: 10px;
          background: rgba(255,255,255,0.5);
          opacity: 1;
          transition: background 0.2s, transform 0.2s;
        }
        .hero-slider .swiper-pagination-bullet-active {
          background: white;
          transform: scale(1.2);
        }
        @media (max-width: 768px) {
          .hero-slider .swiper-button-prev,
          .hero-slider .swiper-button-next {
            display: none;
          }
        }
        .hero-slide-content {
          animation: heroFadeInUp 0.8s ease-out both;
          animation-delay: 0.3s;
        }
      `}</style>

      <Swiper
        modules={[EffectFade, Autoplay, Navigation, Pagination]}
        effect="fade"
        autoplay={animate ? { delay: 6000, disableOnInteraction: false, pauseOnMouseEnter: true } : false}
        navigation
        pagination={{ clickable: true }}
        loop={slides.length > 1}
        speed={800}
        className="hero-slider h-full"
        onSwiper={(swiper) => {
          swiperRef.current = swiper
          if (animate) setTimeout(resetKenBurns, 50)
        }}
        onSlideChangeTransitionStart={animate ? resetKenBurns : undefined}
      >
        {slides.map((slide, i) => {
          // Per-slide overrides: fall back to component-level props
          const slideGradient = slide.gradient ?? gradient
          const slideKenBurns = slide.kenBurns !== undefined ? slide.kenBurns : animate

          return (
          <SwiperSlide key={i} className="relative">
            {/* Background: video or image with Ken Burns */}
            <div className="absolute inset-0 overflow-hidden">
              {isVideoUrl(slide.image) ? (
                <video
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="absolute inset-0 w-full h-full object-cover"
                  src={slide.image}
                />
              ) : (
                <div
                  {...(animate ? { 'data-ken-burns': true, 'data-ken-burns-enabled': String(slideKenBurns) } : {})}
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: `url(${slide.image})` }}
                />
              )}
            </div>

            {/* Gradient overlay — per-slide */}
            {slideGradient !== 'none' && (
              <div className={`absolute inset-0 ${gradientClasses[slideGradient]}`} />
            )}

            {/* Content */}
            {(slide.heading || slide.description || slide.button) && (
              <div className="absolute inset-0 flex items-end pb-20 sm:pb-24 md:items-center md:pb-0">
                <div className="w-full max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
                  <div className="hero-slide-content max-w-2xl">
                    {slide.heading && (
                      <h2 className="text-2xl sm:text-4xl md:text-5xl lg:text-7xl font-display font-bold text-white drop-shadow-lg mb-3 sm:mb-4">
                        {slide.heading}
                      </h2>
                    )}
                    {slide.description && (
                      <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-white/90 drop-shadow mb-4 sm:mb-6 leading-relaxed">
                        {slide.description}
                      </p>
                    )}
                    {slide.button && slide.href && (
                      <Link
                        href={slide.href}
                        className="inline-flex items-center gap-2 px-6 py-3 sm:px-8 sm:py-3.5 text-sm sm:text-base font-semibold rounded-full bg-white/15 backdrop-blur-md border border-white/30 text-white hover:bg-white/25 transition-all duration-300"
                      >
                        {slide.button}
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            )}
          </SwiperSlide>
          )
        })}
      </Swiper>
    </div>
  )
}
