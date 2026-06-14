import { prisma } from './prisma'

export async function getSliderBySlug(slug: string, tenantId: string) {
  return prisma.slider.findUnique({
    where: { tenantId_slug: { tenantId, slug } },
    include: {
      items: {
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
        include: {
          page: { select: { id: true, title: true, slug: true, ogImage: true, featureImage: true, featureVideo: true } },
          product: { select: { id: true, label: true, url: true, image: true } },
          vendor: { select: { id: true, name: true, slug: true, imageUrl: true, description: true } },
          artist: { select: { id: true, name: true, slug: true, heroImage: true, origin: true } },
          media: { select: { id: true, url: true, type: true, filename: true } },
        },
      },
    },
  })
}

export async function getFeaturedPages(tenantId: string) {
  return prisma.page.findMany({
    where: { tenantId, isPublished: true, isFeatured: true },
    select: { id: true, title: true, slug: true, ogImage: true, featureImage: true, featureVideo: true, metaDescription: true },
    orderBy: { sortOrder: 'asc' },
    take: 12,
  })
}

export async function getFeaturedProducts(tenantId: string) {
  return prisma.product.findMany({
    where: { tenantId, isActive: true, isFeatured: true },
    select: { id: true, label: true, url: true, image: true, content: true },
    take: 12,
  })
}

export async function getFeaturedVendors(tenantId: string) {
  return prisma.vendor.findMany({
    where: { tenantId, isActive: true, isFeatured: true },
    select: { id: true, name: true, slug: true, imageUrl: true, description: true, category: true },
    orderBy: { name: 'asc' },
    take: 12,
  })
}
