import type { Metadata } from 'next'
import { getPublishedContentByPath } from '@/lib/markdown'
import { buildMetadata, buildFaqJsonLd, buildBreadcrumbJsonLd } from '@/lib/seo'
import MarkdownContent from '@/components/MarkdownContent'
import Breadcrumbs from '@/components/Breadcrumbs'
import JsonLd from '@/components/JsonLd'
import CTAForm from '@/components/sections/CTAForm'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string[] }> }
): Promise<Metadata> {
  const { slug } = await params
  const path = '/' + slug.join('/')
  const data = await getPublishedContentByPath(path)

  const base = buildMetadata(data, path, {
    title: data?.metadata.title || 'e-Ventschau',
    description: data?.metadata.description || '',
  })

  if (data?.noIndex) {
    return { ...base, robots: { index: false } }
  }

  return base
}

export default async function CatchAllPage(
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params
  const path = '/' + slug.join('/')
  const data = await getPublishedContentByPath(path)

  if (!data) notFound()

  const breadcrumbJsonLd = await buildBreadcrumbJsonLd(path)

  return (
    <div className="relative">
      {breadcrumbJsonLd && <JsonLd data={breadcrumbJsonLd} />}
      {data.faqSchema && data.faqSchema.length > 0 && (
        <JsonLd data={buildFaqJsonLd(data.faqSchema)} />
      )}

      {data.backgroundImage && (
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <img src={data.backgroundImage} alt="" className="w-full h-full object-cover opacity-15" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-brand-bg/80 dark:to-[#111417]/80" />
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">
        <Breadcrumbs pathname={path} />
        <MarkdownContent content={data.content} />
      </div>

      {data.ctaSource && (
        <CTAForm
          source={data.ctaSource}
          title={data.ctaTitle || undefined}
          subtitle={data.ctaSubtitle || undefined}
        />
      )}
    </div>
  )
}
