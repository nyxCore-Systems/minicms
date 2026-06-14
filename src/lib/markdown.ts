import { prisma, withRetry } from './prisma'
import { getTenant } from './tenant'

export interface FaqItem {
  question: string
  answer: string
}

export interface ContentData {
  metadata: {
    title?: string
    description?: string
    keywords?: string[]
    [key: string]: unknown
  }
  content: string
  backgroundImage: string | null
  ogImage: string | null
  faqSchema: FaqItem[] | null
  isPublished: boolean
  id: string
  path: string | null
  noIndex: boolean
  ctaSource: string | null
  ctaTitle: string | null
  ctaSubtitle: string | null
}

function parseFaqSchema(raw: unknown): FaqItem[] | null {
  if (!raw) return null
  // Handle double-stringified JSON (stored as string in Json field)
  let data = raw
  if (typeof data === 'string') {
    try { data = JSON.parse(data) } catch { return null }
  }
  return Array.isArray(data) ? data : null
}

export async function getContent(slug: string): Promise<ContentData | null> {
  try {
    const tenant = await getTenant()
    if (!tenant) return null

    const page = await withRetry(() =>
      prisma.page.findUnique({
        where: { tenantId_slug: { tenantId: tenant.id, slug } },
      })
    )

    if (!page) return null

    return {
      id: page.id,
      metadata: {
        title: page.metaTitle || page.title,
        description: page.metaDescription || undefined,
        keywords: page.metaKeywords ? page.metaKeywords.split(', ') : undefined,
      },
      content: page.content,
      backgroundImage: page.backgroundImage,
      ogImage: page.ogImage,
      faqSchema: parseFaqSchema(page.faqSchema),
      isPublished: page.isPublished,
      path: page.path,
      noIndex: page.noIndex,
      ctaSource: page.ctaSource,
      ctaTitle: page.ctaTitle,
      ctaSubtitle: page.ctaSubtitle,
    }
  } catch (error) {
    console.error(`[getContent] Failed to fetch page "${slug}":`, error)
    return null
  }
}

export async function getPublishedContent(slug: string): Promise<ContentData | null> {
  const data = await getContent(slug)
  if (!data || !data.isPublished) return null
  return data
}

export async function getPublishedContentByPath(path: string): Promise<ContentData | null> {
  try {
    const tenant = await getTenant()
    if (!tenant) return null

    const page = await withRetry(() =>
      prisma.page.findUnique({
        where: { tenantId_path: { tenantId: tenant.id, path } },
      })
    )

    if (!page || !page.isPublished) return null

    return {
      id: page.id,
      metadata: {
        title: page.metaTitle || page.title,
        description: page.metaDescription || undefined,
        keywords: page.metaKeywords ? page.metaKeywords.split(', ') : undefined,
      },
      content: page.content,
      backgroundImage: page.backgroundImage,
      ogImage: page.ogImage,
      faqSchema: parseFaqSchema(page.faqSchema),
      isPublished: page.isPublished,
      path: page.path,
      noIndex: page.noIndex,
      ctaSource: page.ctaSource,
      ctaTitle: page.ctaTitle,
      ctaSubtitle: page.ctaSubtitle,
    }
  } catch (error) {
    console.error(`[getPublishedContentByPath] Failed to fetch page at "${path}":`, error)
    return null
  }
}

export async function getAllPages() {
  const tenant = await getTenant()
  if (!tenant) return []

  return withRetry(() =>
    prisma.page.findMany({
      where: { tenantId: tenant.id },
      orderBy: { sortOrder: 'asc' },
      include: {
        menuItems: { select: { id: true, location: true } },
        parentLinks: { select: { parentId: true } },
        childLinks: { select: { childId: true } },
      },
    })
  )
}
