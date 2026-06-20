import type { HomepageSection } from '@prisma/client'
import Hero from './Hero'
import type { HeroData } from './Hero'
import TrustIndicators from './TrustIndicators'
import ProductShowcase from './ProductShowcase'
import type { ProductShowcaseData, ProductCategory } from './ProductShowcase'
import InfoTeaser from './InfoTeaser'
import VendorShowcase from './VendorShowcase'
import type { VendorShowcaseData, VendorItem } from './VendorShowcase'
import FAQ from './FAQ'
import type { FAQData } from './FAQ'
import CTAForm from './CTAForm'
import BannerSlot from '@/components/BannerSlot'
import SliderBlock from '@/components/markdown/SliderBlock'
import HeroSliderSection from '@/components/sections/HeroSliderSection'
import HeroSliderFromManager from '@/components/sections/HeroSliderFromManager'
import type { HeroSlide, SliderVariant, SliderGradient } from '@/components/markdown/HeroSliderImages'
import SectionStructuredData from './SectionStructuredData'
import NoirElement from '@/components/noir/sections/NoirElement'
import MarkdownContent from '@/components/MarkdownContent'
import ScrollAnimation from '@/components/ui/ScrollAnimation'
import type { AnimationType } from '@/components/ui/ScrollAnimation'

interface HomepageSectionRendererProps {
  sections: HomepageSection[]
  dbVendors?: VendorItem[]
  dbProducts?: ProductCategory[]
}

export default function HomepageSectionRenderer({ sections, dbVendors, dbProducts }: HomepageSectionRendererProps) {
  return (
    <>
      <SectionStructuredData sections={sections} />
      {sections
        .filter((s) => s.isVisible)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((section) => {
          // Noir homepage elements render their own full-bleed `.nh-*` markup and
          // pull live event data themselves; dispatch them before the generic types.
          if (section.type.startsWith('noir_')) {
            return (
              <div key={section.id}>
                <NoirElement
                  type={section.type}
                  title={section.title}
                  subtitle={section.subtitle}
                  content={section.content}
                />
              </div>
            )
          }

          const content = section.content as Record<string, unknown> | null
          const sectionConfig = section.config as Record<string, unknown> | null
          const animation = (sectionConfig?.animation as AnimationType) || 'none'
          const bgColor = sectionConfig?.bgColor as string | undefined

          let element: React.ReactNode = null

          switch (section.type) {
            case 'hero':
              element = <Hero data={content as unknown as HeroData} />
              break

            case 'trust':
              element = (
                <ScrollAnimation animation={animation}>
                  <TrustIndicators
                    items={(content as { items: { label: string; sublabel: string }[] })?.items || []}
                  />
                </ScrollAnimation>
              )
              break

            case 'showcase': {
              const showcaseData: ProductShowcaseData = {
                title: section.title || '',
                subtitle: section.subtitle || '',
                ...(content as Omit<ProductShowcaseData, 'title' | 'subtitle'>),
              }
              if (dbProducts && dbProducts.length > 0) {
                showcaseData.categories = dbProducts
              }
              element = (
                <ScrollAnimation animation={animation}>
                  <ProductShowcase data={showcaseData} />
                </ScrollAnimation>
              )
              break
            }

            case 'info':
              element = (
                <ScrollAnimation animation={animation}>
                  <InfoTeaser
                    title={section.title || ''}
                    description={section.subtitle || ''}
                    links={(content as { links: { label: string; href: string }[] })?.links || []}
                    cards={(content as { cards: { emoji: string; label: string; sublabel: string }[] })?.cards || []}
                  />
                </ScrollAnimation>
              )
              break

            case 'vendors': {
              const vendorSectionContent = content as Omit<VendorShowcaseData, 'title' | 'subtitle'>
              const vendorData: VendorShowcaseData = {
                title: section.title || '',
                subtitle: section.subtitle || '',
                ...vendorSectionContent,
              }
              if (dbVendors && dbVendors.length > 0) {
                vendorData.vendors = dbVendors
              }
              element = (
                <ScrollAnimation animation={animation}>
                  <div itemScope itemType="https://schema.org/Organization">
                    <VendorShowcase data={vendorData} />
                  </div>
                </ScrollAnimation>
              )
              break
            }

            case 'faq':
              element = (
                <ScrollAnimation animation={animation}>
                  <section aria-labelledby={`faq-heading-${section.id}`}>
                    <FAQ
                      data={{
                        title: section.title || '',
                        subtitle: section.subtitle || '',
                        items: (content as { items: FAQData['items'] })?.items || [],
                      }}
                    />
                  </section>
                </ScrollAnimation>
              )
              break

            case 'cta':
              element = (
                <ScrollAnimation animation={animation}>
                  <CTAForm
                    title={section.title || undefined}
                    subtitle={section.subtitle || undefined}
                    source={(content as { source?: string })?.source || 'homepage_cta'}
                  />
                </ScrollAnimation>
              )
              break

            case 'slider': {
              const sliderContent = content as { sliderSlug?: string; sliderType?: string } | null
              const sliderRef = sliderContent?.sliderSlug || sliderContent?.sliderType || ''
              element = (
                <ScrollAnimation animation={animation}>
                  <section className="py-12">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                      {section.title && (
                        <h2 className="font-display text-2xl md:text-3xl font-bold text-brand-text mb-2">
                          {section.title}
                        </h2>
                      )}
                      {section.subtitle && (
                        <p className="text-brand-text-muted mb-6">{section.subtitle}</p>
                      )}
                      <SliderBlock sliderRef={sliderRef} />
                    </div>
                  </section>
                </ScrollAnimation>
              )
              break
            }

            case 'hero_slider': {
              const sliderContent = content as {
                slides?: HeroSlide[]
                useSliderManager?: boolean
                sliderSlug?: string
              } | null
              const heroSliderConfig = sectionConfig as { variant?: SliderVariant; gradient?: SliderGradient; animate?: boolean } | null
              const shouldAnimate = heroSliderConfig?.animate !== false

              if (sliderContent?.useSliderManager && sliderContent?.sliderSlug) {
                element = (
                  <HeroSliderFromManager
                    sliderSlug={sliderContent.sliderSlug}
                    variant={heroSliderConfig?.variant || 'viewport'}
                    gradient={heroSliderConfig?.gradient || 'none'}
                    animate={shouldAnimate}
                  />
                )
              } else {
                element = (
                  <HeroSliderSection
                    slides={sliderContent?.slides || []}
                    variant={heroSliderConfig?.variant || 'viewport'}
                    gradient={heroSliderConfig?.gradient || 'none'}
                    animate={shouldAnimate}
                  />
                )
              }
              break
            }

            case 'content': {
              const md = (content as { markdown?: string })?.markdown || ''
              element = (
                <ScrollAnimation animation={animation}>
                  <section className="py-12">
                    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                      {section.title && (
                        <h2 className="font-display text-2xl md:text-3xl font-bold text-brand-text mb-2">
                          {section.title}
                        </h2>
                      )}
                      {section.subtitle && (
                        <p className="text-brand-text-muted mb-6">{section.subtitle}</p>
                      )}
                      <MarkdownContent content={md} />
                    </div>
                  </section>
                </ScrollAnimation>
              )
              break
            }

            case 'ads_banner': {
              const bannerContent = content as { bannerType?: string; bannerId?: string } | null
              element = (
                <ScrollAnimation animation={animation}>
                  <section className="py-8">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                      {section.title && (
                        <h2 className="font-display text-xl font-bold text-brand-text mb-4">
                          {section.title}
                        </h2>
                      )}
                      <BannerSlot
                        bannerType={bannerContent?.bannerType || 'HOMEPAGE_FIXED'}
                        bannerId={bannerContent?.bannerId}
                      />
                    </div>
                  </section>
                </ScrollAnimation>
              )
              break
            }

            default:
              return null
          }

          if (bgColor) {
            return (
              <div key={section.id} style={{ backgroundColor: bgColor }}>
                {element}
              </div>
            )
          }

          return <div key={section.id}>{element}</div>
        })}
    </>
  )
}
