import type { Metadata } from 'next'
import { getSiteSettings } from '@/lib/menu'
import { buildMetadata, websiteJsonLd, getMusicFestivalJsonLd, buildFaqJsonLd } from '@/lib/seo'
import JsonLd from '@/components/JsonLd'
import HomepageSectionRenderer from '@/components/sections/HomepageSectionRenderer'
import NoirElement from '@/components/noir/sections/NoirElement'
import { getHomepageSections } from '@/lib/sections'
import { NOIR_DEFAULT_LAYOUT } from '@/lib/noir-home-defaults'
import FAQ from '@/components/sections/FAQ'
import { getFeaturedEvent } from '@/lib/events'
import { resolveFestivalFaq } from '@/lib/faq'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings()
  const metadata = buildMetadata(null, '/', {
    title: 'Das 11. Benefiz-Festival am 7. & 8. August 2026',
    description:
      'Internationale Live-Musik für den guten Zweck: Das e-Ventschau-Benefiz-Festival in Ventschau (Landkreis Lüneburg, Norddeutschland) vereint Blues-Rock, Funk und Latin mit Ausstellungen und Vorträgen – zugunsten von Opfern nuklearer Katastrophen in Tschernobyl und Fukushima.',
    keywords: [
      'e-Ventschau',
      'Benefiz-Festival',
      'Musikfestival Lüneburg',
      'Ventschau',
      'Norddeutschland',
      'Niedersachsen',
      'Open Air',
      'Blues Rock',
      'Funk',
      'Tschernobyl',
      'Fukushima',
      'Anti-Atom',
    ],
  })

  if (settings.backgroundImage) {
    return {
      ...metadata,
      openGraph: { ...metadata.openGraph, images: [{ url: settings.backgroundImage }] },
    }
  }
  return metadata
}

export default async function HomePage() {
  const [sections, festivalJsonLd, featured] = await Promise.all([
    getHomepageSections(),
    getMusicFestivalJsonLd(),
    getFeaturedEvent(),
  ])

  // The default festival FAQ appears whenever the homepage does NOT already
  // carry an admin-authored `faq` section (which HomepageSectionRenderer +
  // SectionStructuredData render + emit on their own). This guarantees exactly
  // one visible FAQ and one FAQPage in every layout.
  const hasDbFaq = sections.some((s) => s.type === 'faq' && s.isVisible)
  const faq = resolveFestivalFaq(featured)

  return (
    <div className="nh">
      <JsonLd data={websiteJsonLd} />
      {festivalJsonLd && <JsonLd data={festivalJsonLd} />}
      {!hasDbFaq && <JsonLd data={buildFaqJsonLd(faq.items)} />}
      {sections.length > 0 ? (
        // Editor-composed homepage: ordered/visible elements from /admin/sections
        <HomepageSectionRenderer sections={sections} />
      ) : (
        // No sections yet → the default Noir layout (identical to the original page),
        // also the starting point the "import current homepage" action recreates.
        NOIR_DEFAULT_LAYOUT.map((type) => <NoirElement key={type} type={type} />)
      )}
      {!hasDbFaq && (
        <FAQ data={faq} />
      )}
    </div>
  )
}
