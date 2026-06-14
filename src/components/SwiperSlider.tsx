'use client'

import { Swiper, SwiperSlide } from 'swiper/react'
import {
  Navigation,
  Pagination,
  Autoplay,
  EffectFade,
  EffectCube,
  EffectFlip,
  EffectCoverflow,
  EffectCards,
  FreeMode,
} from 'swiper/modules'
import Image from 'next/image'
import Link from 'next/link'

import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'
import 'swiper/css/effect-fade'
import 'swiper/css/effect-cube'
import 'swiper/css/effect-flip'
import 'swiper/css/effect-coverflow'
import 'swiper/css/effect-cards'
import 'swiper/css/free-mode'

export interface SliderConfig {
  animation?: 'slide' | 'fade' | 'cube' | 'flip' | 'coverflow' | 'cards'
  layout?: 'carousel' | 'grid' | 'marquee' | 'featured'
  cardStyle?: 'glass' | 'minimal' | 'overlay' | 'bordered' | 'gradient'
  slidesPerView?: { mobile: number; tablet: number; desktop: number }
  autoplay?: boolean
  autoplayDelay?: number
  speed?: number
  loop?: boolean
  showNavigation?: boolean
  showPagination?: boolean
  spacing?: number
}

export interface SliderItem {
  id: string
  title: string
  subtitle?: string | null
  imageUrl?: string | null
  videoUrl?: string | null
  linkUrl?: string | null
  type: 'page' | 'product' | 'vendor' | 'media'
}

interface SwiperSliderProps {
  items: SliderItem[]
  config?: SliderConfig | null
  label?: string
  onItemClick?: (itemId: string) => void
}

const DEFAULT_CONFIG: Required<SliderConfig> = {
  animation: 'slide',
  layout: 'carousel',
  cardStyle: 'glass',
  slidesPerView: { mobile: 1, tablet: 2, desktop: 3 },
  autoplay: false,
  autoplayDelay: 5000,
  speed: 500,
  loop: false,
  showNavigation: true,
  showPagination: true,
  spacing: 16,
}

const EFFECT_MAP: Record<string, string> = {
  slide: 'slide',
  fade: 'fade',
  cube: 'cube',
  flip: 'flip',
  coverflow: 'coverflow',
  cards: 'cards',
}

const EFFECT_MODULES: Record<string, typeof EffectFade> = {
  fade: EffectFade,
  cube: EffectCube,
  flip: EffectFlip,
  coverflow: EffectCoverflow,
  cards: EffectCards,
}

function cardStyleClasses(style: SliderConfig['cardStyle']): string {
  switch (style) {
    case 'minimal':
      return 'bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100'
    case 'overlay':
      return 'relative overflow-hidden rounded-xl'
    case 'bordered':
      return 'bg-white rounded-xl border-2 border-brand-accent/30 overflow-hidden'
    case 'gradient':
      return 'bg-gradient-to-br from-brand-forest/10 via-brand-sage/10 to-brand-copper/10 rounded-xl overflow-hidden'
    case 'glass':
    default:
      return 'glass-card !p-0 overflow-hidden'
  }
}

function MediaContent({
  item,
  featured = false,
}: {
  item: SliderItem
  featured?: boolean
}) {
  const hasVideo = !!item.videoUrl
  const aspectClass = featured ? 'aspect-[16/9]' : 'aspect-[4/3]'

  if (hasVideo) {
    return (
      <div className={`relative w-full ${aspectClass} overflow-hidden bg-black`}>
        {/* Pillar-echo: blurred background fill */}
        <video
          src={item.videoUrl!}
          className="absolute inset-0 w-full h-full object-cover blur-2xl scale-125 opacity-40"
          muted
          playsInline
          aria-hidden="true"
        />
        {/* Actual video: contained, centered */}
        <video
          src={item.videoUrl!}
          className="absolute inset-0 w-full h-full object-contain z-10"
          autoPlay
          muted
          loop
          playsInline
        />
      </div>
    )
  }

  if (item.imageUrl) {
    return (
      <div className={`relative w-full ${aspectClass} overflow-hidden bg-black/5`}>
        {/* Pillar-echo: blurred background fill */}
        <Image
          src={item.imageUrl}
          alt=""
          fill
          className="object-cover blur-2xl scale-125 opacity-40"
          sizes="1px"
          aria-hidden="true"
        />
        {/* Actual image: contained, centered */}
        <Image
          src={item.imageUrl}
          alt={item.title}
          fill
          className="object-contain z-10"
          sizes={featured ? '100vw' : '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw'}
        />
      </div>
    )
  }

  return null
}

function SlideCard({
  item,
  cardStyle = 'glass',
  featured = false,
  onItemClick,
}: {
  item: SliderItem
  cardStyle?: SliderConfig['cardStyle']
  featured?: boolean
  onItemClick?: (itemId: string) => void
}) {
  const isOverlay = cardStyle === 'overlay'
  const hasVideo = !!item.videoUrl

  const content = isOverlay ? (
    <div className={`${cardStyleClasses(cardStyle)} h-full`}>
      {hasVideo ? (
        <video
          src={item.videoUrl!}
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay
          muted
          loop
          playsInline
        />
      ) : item.imageUrl ? (
        <Image
          src={item.imageUrl}
          alt={item.title}
          fill
          className="object-cover"
          sizes={featured ? '100vw' : '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw'}
        />
      ) : null}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <h3 className={`font-semibold text-white line-clamp-2 ${featured ? 'text-lg' : 'text-sm'}`}>
          {item.title}
        </h3>
        {item.subtitle && (
          <p className={`text-white/80 mt-1 line-clamp-2 ${featured ? 'text-sm' : 'text-xs'}`}>
            {item.subtitle}
          </p>
        )}
      </div>
    </div>
  ) : (
    <div className={`${cardStyleClasses(cardStyle)} h-full`}>
      <MediaContent item={item} featured={featured} />
      <div className={featured ? 'p-6' : 'p-4'}>
        <h3 className={`font-semibold text-brand-text line-clamp-2 ${featured ? 'text-lg' : 'text-sm'}`}>
          {item.title}
        </h3>
        {item.subtitle && (
          <p className={`text-brand-text-muted mt-1 line-clamp-2 ${featured ? 'text-sm' : 'text-xs'}`}>
            {item.subtitle}
          </p>
        )}
      </div>
    </div>
  )

  const handleClick = () => {
    if (onItemClick) onItemClick(item.id)
  }

  if (item.linkUrl) {
    const isExternal = item.linkUrl.startsWith('http')
    if (isExternal) {
      return (
        <a
          href={item.linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block h-full"
          onClick={handleClick}
        >
          {content}
        </a>
      )
    }
    return (
      <Link href={item.linkUrl} className="block h-full" onClick={handleClick}>
        {content}
      </Link>
    )
  }

  return <div onClick={handleClick}>{content}</div>
}

function GridLayout({
  items,
  config,
  onItemClick,
}: {
  items: SliderItem[]
  config: Required<SliderConfig>
  onItemClick?: (itemId: string) => void
}) {
  const cols = config.slidesPerView.desktop
  const colsClass =
    cols <= 2 ? 'lg:grid-cols-2' :
    cols <= 3 ? 'lg:grid-cols-3' :
    cols <= 4 ? 'lg:grid-cols-4' :
    'lg:grid-cols-5'

  return (
    <div
      className={`grid grid-cols-1 sm:grid-cols-2 ${colsClass}`}
      style={{ gap: `${config.spacing}px` }}
    >
      {items.map((item) => (
        <SlideCard
          key={item.id}
          item={item}
          cardStyle={config.cardStyle}
          onItemClick={onItemClick}
        />
      ))}
    </div>
  )
}

function FeaturedLayout({
  items,
  config,
  onItemClick,
}: {
  items: SliderItem[]
  config: Required<SliderConfig>
  onItemClick?: (itemId: string) => void
}) {
  const item = items[0]
  if (!item) return null

  return (
    <div className="w-full">
      <SlideCard
        item={item}
        cardStyle={config.cardStyle}
        featured
        onItemClick={onItemClick}
      />
    </div>
  )
}

export default function SwiperSlider({
  items,
  config: configProp,
  label = 'Karussell',
  onItemClick,
}: SwiperSliderProps) {
  if (items.length === 0) return null

  const config: Required<SliderConfig> = { ...DEFAULT_CONFIG, ...configProp }

  // Grid layout -- no Swiper
  if (config.layout === 'grid') {
    return (
      <div role="region" aria-label={label} className="my-6">
        <GridLayout items={items} config={config} onItemClick={onItemClick} />
      </div>
    )
  }

  // Featured layout -- single large item, no Swiper
  if (config.layout === 'featured') {
    return (
      <div role="region" aria-label={label} className="my-6">
        <FeaturedLayout items={items} config={config} onItemClick={onItemClick} />
      </div>
    )
  }

  // Build modules array
  const modules: typeof Navigation[] = []
  const effectName = EFFECT_MAP[config.animation] || 'slide'
  const effectModule = EFFECT_MODULES[config.animation]
  if (effectModule) modules.push(effectModule)

  const isMarquee = config.layout === 'marquee'

  if (config.showNavigation && !isMarquee) modules.push(Navigation)
  if (config.showPagination && !isMarquee) modules.push(Pagination)
  if (config.autoplay || isMarquee) modules.push(Autoplay)
  if (isMarquee) modules.push(FreeMode)

  // Swiper props
  const swiperProps: Record<string, unknown> = {
    modules,
    spaceBetween: config.spacing,
    speed: isMarquee ? 5000 : config.speed,
    loop: isMarquee ? true : config.loop,
    className: `!pb-10 ${isMarquee ? 'marquee-slider' : ''}`,
  }

  // Effect (only for non-marquee carousel)
  if (!isMarquee && effectName !== 'slide') {
    swiperProps.effect = effectName
  }

  // Navigation & pagination
  if (config.showNavigation && !isMarquee) swiperProps.navigation = true
  if (config.showPagination && !isMarquee) swiperProps.pagination = { clickable: true }

  // Autoplay
  if (isMarquee) {
    swiperProps.freeMode = true
    swiperProps.autoplay = { delay: 0, disableOnInteraction: false }
  } else if (config.autoplay) {
    swiperProps.autoplay = { delay: config.autoplayDelay, disableOnInteraction: false }
  }

  // Slides per view -- effects that only support 1 slide
  const singleSlideEffects = ['fade', 'cube', 'flip', 'cards']
  if (singleSlideEffects.includes(config.animation) && !isMarquee) {
    swiperProps.slidesPerView = 1
  } else {
    swiperProps.slidesPerView = config.slidesPerView.mobile
    swiperProps.breakpoints = {
      640: { slidesPerView: config.slidesPerView.tablet },
      1024: { slidesPerView: config.slidesPerView.desktop },
    }
  }

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
      className="my-6"
    >
      {isMarquee && (
        <style>{`.marquee-slider .swiper-wrapper { transition-timing-function: linear !important; }`}</style>
      )}
      <Swiper {...swiperProps}>
        {items.map((item) => (
          <SwiperSlide key={item.id} className="!h-auto">
            <SlideCard
              item={item}
              cardStyle={config.cardStyle}
              onItemClick={onItemClick}
            />
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  )
}
