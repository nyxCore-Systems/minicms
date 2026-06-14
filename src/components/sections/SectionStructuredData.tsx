import type { HomepageSection } from '@prisma/client'

interface SectionStructuredDataProps {
  sections: HomepageSection[]
  siteUrl?: string
  siteName?: string
}

export default function SectionStructuredData({ sections, siteUrl = 'https://DasMesser.de', siteName = 'Das Messer' }: SectionStructuredDataProps) {
  const visibleSections = sections.filter(s => s.isVisible)
  const jsonLd: Record<string, unknown>[] = []

  // WebSite schema
  jsonLd.push({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteName,
    url: siteUrl,
  })

  // FAQ schema from faq sections
  const faqSection = visibleSections.find(s => s.type === 'faq')
  if (faqSection) {
    const content = faqSection.content as { items?: { question: string; answer: string }[] } | null
    if (content?.items?.length) {
      jsonLd.push({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: content.items.map(item => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: item.answer,
          },
        })),
      })
    }
  }

  // Organization schema
  jsonLd.push({
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: siteName,
    url: siteUrl,
  })

  if (jsonLd.length === 0) return null

  return (
    <>
      {jsonLd.map((item, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(item)
              .replace(/</g, '\\u003c')
              .replace(/>/g, '\\u003e')
              .replace(/&/g, '\\u0026'),
          }}
        />
      ))}
    </>
  )
}
