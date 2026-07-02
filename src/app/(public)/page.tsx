import type { Metadata } from 'next'
import { getHomepageSections } from '@/lib/sections'
import { getPromotedVendors } from '@/lib/vendors'
import { getProductShowcaseItems } from '@/lib/products'
import { getSiteSettings } from '@/lib/menu'
import { buildMetadata, getWebsiteJsonLd, getMusicFestivalJsonLd } from '@/lib/seo'
import { getFeaturedEvent } from '@/lib/events'
import JsonLd from '@/components/JsonLd'
import HomepageSectionRenderer from '@/components/sections/HomepageSectionRenderer'
import Hero from '@/components/sections/Hero'
import TrustIndicators from '@/components/sections/TrustIndicators'
import ProductShowcase from '@/components/sections/ProductShowcase'
import InfoTeaser from '@/components/sections/InfoTeaser'
import VendorShowcase from '@/components/sections/VendorShowcase'
import FAQ from '@/components/sections/FAQ'
import CTAForm from '@/components/sections/CTAForm'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings()
  const description =
    settings.footerText ||
    'e-Ventschau — Benefiz-Musikfestival. Rock, Punk und Indie für den guten Zweck.'

  return buildMetadata(null, '/', {
    title: settings.siteName,
    description,
    keywords: [
      'e-Ventschau',
      'Benefiz Festival',
      'Musikfestival',
      'Live-Musik',
      'Rock Festival',
      'Punk Festival',
    ],
    ogImage: settings.backgroundImage || settings.logoUrl || undefined,
  })
}

export default async function HomePage() {
  const [sections, settings, dbVendors, dbProducts, websiteLd, festivalLd, featuredEvent] =
    await Promise.all([
      getHomepageSections(),
      getSiteSettings(),
      getPromotedVendors(),
      getProductShowcaseItems(),
      getWebsiteJsonLd(),
      getMusicFestivalJsonLd(),
      getFeaturedEvent(),
    ])

  const content =
    sections.length > 0 ? (
      <HomepageSectionRenderer sections={sections} dbVendors={dbVendors} dbProducts={dbProducts} />
    ) : (
      <>
        <Hero />
        <TrustIndicators
          items={[
            { label: 'Benefiz', sublabel: 'Für den guten Zweck' },
            { label: 'Live', sublabel: 'Bands aus der Region' },
            { label: 'Familiär', sublabel: 'Für alle Generationen' },
            { label: 'Seit Jahren', sublabel: 'Tradition & Musik' },
          ]}
        />
        {featuredEvent && <InfoTeaser
          title={featuredEvent.title}
          description={featuredEvent.excerpt || 'Das nächste Festival — jetzt informieren.'}
          links={[
            { label: 'Zum Programm', href: `/events/${featuredEvent.slug}` },
            { label: 'Line-up', href: '/kuenstler' },
            { label: 'Unterstützen', href: '/spende' },
          ]}
          cards={[
            { emoji: '\u{1F3B8}', label: 'Live-Musik', sublabel: 'Mehrere Bühnen' },
            { emoji: '\u{1F91D}', label: 'Benefiz', sublabel: 'Für den guten Zweck' },
            { emoji: '\u{1F389}', label: 'Community', sublabel: 'Regional & offen' },
            { emoji: '\u2764\uFE0F', label: 'Herzblut', sublabel: 'Ehrenamtlich' },
          ]}
        />}
        <VendorShowcase />
        <FAQ />
        <CTAForm />
      </>
    )

  return (
    <div className="relative">
      <JsonLd data={websiteLd} />
      {festivalLd && <JsonLd data={festivalLd} />}
      {settings.backgroundImage && (
        <div className="absolute inset-0 -z-10 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={settings.backgroundImage}
            alt=""
            className="w-full h-full object-cover opacity-15"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[var(--brand-bg)]/80" />
        </div>
      )}
      {content}
    </div>
  )
}
