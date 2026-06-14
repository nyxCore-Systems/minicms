import Link from 'next/link'
import Image from 'next/image'

export interface ProductCategory {
  name: string
  description: string
  href: string
  image: string
  count: string
}

export interface ProductShowcaseData {
  title: string
  subtitle: string
  categories: ProductCategory[]
}

interface ProductShowcaseProps {
  data?: ProductShowcaseData
}

const defaultData: ProductShowcaseData = {
  title: 'Unsere Messerwelten',
  subtitle:
    'Entdecken Sie erstklassige Messer in drei Kategorien — kuratiert von Experten, gefertigt von Meistern ihres Fachs.',
  categories: [
    {
      name: 'Küchenmesser',
      description:
        'Von Santoku bis Kochmesser — professionelle Klingen für die anspruchsvolle Küche. Entdecken Sie Messer, die jeden Schnitt zum Erlebnis machen.',
      href: '/messerwissen/kuechenmesser',
      image: 'https://images.unsplash.com/photo-1566454419290-57a0589c9b17?w=600&q=80',
      count: '40+ Modelle',
    },
    {
      name: 'Outdoormesser',
      description:
        'Robuste Begleiter für Jagd, Camping und Bushcraft. Gefertigt aus widerstandsfähigem Stahl für härteste Einsätze in der Natur.',
      href: '/messerwissen/outdoormesser',
      image: 'https://images.unsplash.com/photo-1622396636133-8e92501a9562?w=600&q=80',
      count: '30+ Modelle',
    },
    {
      name: 'Messerkollektionen',
      description:
        'Exklusive Sets und limitierte Editionen von renommierten Messerschmieden. Perfekt als Geschenk oder für die eigene Sammlung.',
      href: '/messerwissen/messerkollektionen',
      image: 'https://images.unsplash.com/photo-1615245364498-844e5bdfd15e?w=600&q=80',
      count: '15+ Kollektionen',
    },
  ],
}

export default function ProductShowcase({ data }: ProductShowcaseProps) {
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
          {d.categories.map((cat) => (
            <Link key={cat.name} href={cat.href} className="group">
              <div className="h-full flex flex-col">
                <div className="relative h-56 sm:h-64 overflow-hidden rounded-sm">
                  <Image
                    src={cat.image}
                    alt={cat.name}
                    fill
                    className="object-contain transition-transform duration-700 group-hover:scale-110"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                </div>
                <div className="pt-4 flex-1 flex flex-col">
                  <h3 className="text-lg font-display font-bold text-brand-text mb-1">
                    {cat.name}
                  </h3>
                  <p className="text-brand-text-muted text-sm leading-relaxed flex-1">
                    {cat.description}
                  </p>
                  <span className="inline-flex items-center mt-4 text-sm font-medium text-brand-accent gap-1 group-hover:gap-2 transition-all">
                    {cat.count} · Entdecken
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
