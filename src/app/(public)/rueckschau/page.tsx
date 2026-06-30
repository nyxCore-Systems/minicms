import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPublishedContentByPath } from '@/lib/markdown'
import { buildMetadata, buildFaqJsonLd, buildBreadcrumbJsonLd } from '@/lib/seo'
import MarkdownContent from '@/components/MarkdownContent'
import Breadcrumbs from '@/components/Breadcrumbs'
import JsonLd from '@/components/JsonLd'
import RueckschauGallery, { type GalleryGroup } from '@/components/RueckschauGallery'

// Dedicated route (shadows the catch-all [...slug]) so the editable DB page text
// is preserved AND a historical photo gallery is appended below it. Photos live
// as static assets in /public/rueckschau (no Cloudinary needed).
export const dynamic = 'force-dynamic'

const PATH = '/rueckschau'

const GROUPS: GalleryGroup[] = [
  { year: 2013, images: Array.from({ length: 12 }, (_, i) => `/rueckschau/e_Ventschau_2013_${String(i + 1).padStart(2, '0')}.jpg`) },
  { year: 2014, images: Array.from({ length: 20 }, (_, i) => `/rueckschau/e_Ventschau_2014_${String(i + 1).padStart(2, '0')}.jpg`) },
]

export async function generateMetadata(): Promise<Metadata> {
  const data = await getPublishedContentByPath(PATH)
  const base = buildMetadata(data, PATH, {
    title: data?.metadata.title || 'Rückschau',
    description: data?.metadata.description || '',
  })
  return data?.noIndex ? { ...base, robots: { index: false } } : base
}

export default async function RueckschauPage() {
  const data = await getPublishedContentByPath(PATH)
  if (!data) notFound()

  const breadcrumbJsonLd = await buildBreadcrumbJsonLd(PATH)

  return (
    <div className="relative">
      {breadcrumbJsonLd && <JsonLd data={breadcrumbJsonLd} />}
      {data.faqSchema && data.faqSchema.length > 0 && <JsonLd data={buildFaqJsonLd(data.faqSchema)} />}

      {data.backgroundImage && (
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <img src={data.backgroundImage} alt="" className="w-full h-full object-cover opacity-15" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-brand-bg/80 dark:to-[#111417]/80" />
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">
        <Breadcrumbs pathname={PATH} />
        <MarkdownContent content={data.content} />

        <section className="mt-14">
          <h2 className="mb-2 font-display text-3xl font-bold text-brand-text">Impressionen</h2>
          <p className="mb-8 text-brand-text-muted">Fotos aus den ersten Festivaljahren in Ventschau.</p>
          <RueckschauGallery groups={GROUPS} />
        </section>
      </div>
    </div>
  )
}
