import { MetadataRoute } from 'next'
import { prisma } from '@/lib/prisma'
import { getTenant } from '@/lib/tenant'

export const dynamic = 'force-dynamic'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://e-ventschau.de'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const tenant = await getTenant()

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1.0,
    },
  ]

  if (!tenant) return staticPages

  const pages = await prisma.page.findMany({
    where: { tenantId: tenant.id, isPublished: true, noIndex: false },
    select: { slug: true, path: true, updatedAt: true },
  })

  const artists = await prisma.artist.findMany({
    where: { tenantId: tenant.id, isPublished: true, isActive: true },
    select: { slug: true, updatedAt: true },
  })

  const dynamicPages: MetadataRoute.Sitemap = pages
    .map((page) => {
      const route = page.path || `/${page.slug}`
      return {
        url: `${SITE_URL}${route}`,
        lastModified: page.updatedAt,
        changeFrequency: 'monthly' as const,
        priority: 0.7,
      }
    })

  return [
    ...staticPages,
    ...dynamicPages,
    ...artists.map((a) => ({
      url: `${SITE_URL}/kuenstler/${a.slug}`,
      lastModified: a.updatedAt,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
  ]
}
