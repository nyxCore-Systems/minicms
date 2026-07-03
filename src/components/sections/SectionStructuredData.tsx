import type { HomepageSection } from '@prisma/client'

interface SectionStructuredDataProps {
  sections: HomepageSection[]
}

export default function SectionStructuredData({ sections }: SectionStructuredDataProps) {
  const visibleSections = sections.filter(s => s.isVisible)
  const jsonLd: Record<string, unknown>[] = []

  // WebSite + Organization JSON-LD are emitted globally (root layout renders the
  // Organization, the homepage renders WebSite + MusicFestival via lib/seo.ts).
  // This component only contributes the FAQPage derived from an faq section, so
  // the homepage carries one clean entity of each type — no duplicates.
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
