import Link from 'next/link'
import Image from 'next/image'
import VendorClickTracker from '@/components/VendorClickTracker'

export interface VendorItem {
  id?: string
  name: string
  category: string
  description: string
  slug: string
  image: string
}

export interface VendorShowcaseData {
  title: string
  subtitle: string
  vendors: VendorItem[]
  ctaLabel?: string
  ctaHref?: string
}

interface VendorShowcaseProps {
  data?: VendorShowcaseData
}

const defaultData: VendorShowcaseData = {
  title: 'Unsere Partnerhersteller',
  subtitle:
    'Ausgewählte Messerschmieden und Manufakturen, die für Qualität, Tradition und höchste Handwerkskunst stehen.',
  vendors: [
    {
      name: 'Schmiede Müller',
      category: 'Küchenmesser',
      description:
        'Traditionelle Messerschmiede aus Solingen. Seit 1924 fertigen wir Küchenmesser höchster Qualität — handgeschmiedet und mit Liebe zum Detail.',
      slug: 'schmiede-mueller',
      image: 'https://images.unsplash.com/photo-1556909114-44e3e70034e2?w=600&q=80',
    },
    {
      name: 'Klingenwerkstatt Weber',
      category: 'Küchenmesser',
      description:
        'Handgeschmiedete Damastmesser für anspruchsvolle Köche. Jedes Stück ein Unikat aus bis zu 300 gefalteten Stahllagen.',
      slug: 'klingenwerkstatt-weber',
      image: 'https://images.unsplash.com/photo-1590794056226-79ef3a8147e1?w=600&q=80',
    },
    {
      name: 'Nordstahl Outdoor',
      category: 'Outdoormesser',
      description:
        'Robuste Outdoormesser aus skandinavischem Dreilagenstahl. Entwickelt für Abenteurer, Jäger und Naturliebhaber.',
      slug: 'nordstahl-outdoor',
      image: 'https://images.unsplash.com/photo-1587556930799-8e4d5e5e5f0a?w=600&q=80',
    },
  ],
  ctaLabel: 'Alle Händler ansehen',
  ctaHref: '/haendler',
}

export default function VendorShowcase({ data }: VendorShowcaseProps) {
  const d = data || defaultData

  return (
    <section className="py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-brand-text mb-4">
            {d.title}
          </h2>
          <p className="text-brand-text-muted text-lg max-w-2xl mx-auto">
            {d.subtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {d.vendors.map((vendor) => {
            const card = (
              <div className="glass-card h-full flex flex-col">
                <div className="relative aspect-square rounded-sm overflow-hidden mb-4">
                  <Image
                    src={vendor.image}
                    alt={vendor.name}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                </div>
                <span className="inline-block w-fit px-3 py-1 text-xs font-medium text-brand-accent bg-brand-accent/10 rounded-full mb-3">
                  {vendor.category}
                </span>
                <h3 className="text-lg font-semibold text-brand-text mb-2 group-hover:text-brand-accent transition-colors">
                  {vendor.name}
                </h3>
                <p className="text-sm text-brand-text-muted leading-relaxed flex-1">
                  {vendor.description}
                </p>
                <span className="inline-flex items-center mt-4 text-sm font-medium text-brand-accent gap-1 group-hover:gap-2 transition-all">
                  Zum Hersteller
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </div>
            )

            if (vendor.id) {
              return (
                <VendorClickTracker
                  key={vendor.slug}
                  vendorId={vendor.id}
                  clickType="vendor_showcase"
                  href={`/haendler#${vendor.slug}`}
                  className="group"
                >
                  {card}
                </VendorClickTracker>
              )
            }

            return (
              <Link
                key={vendor.slug}
                href={`/haendler#${vendor.slug}`}
                className="group"
              >
                {card}
              </Link>
            )
          })}
        </div>

        {d.ctaLabel && d.ctaHref && (
          <div className="text-center mt-10">
            <Link href={d.ctaHref} className="btn-copper">
              {d.ctaLabel}
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}
