import { prisma, withRetry } from './prisma'
import { getTenant } from './tenant'

const CATEGORY_LABELS: Record<string, string> = {
  KITCHEN: 'Küchenmesser',
  OUTDOOR: 'Outdoormesser',
  COLLECTION: 'Kollektionen',
  OTHER: 'Sonstige',
}

export async function getPromotedVendors() {
  const tenant = await getTenant()
  if (!tenant) return []

  const vendors = await withRetry(() =>
    prisma.vendor.findMany({
      where: {
        tenantId: tenant.id,
        isActive: true,
        OR: [{ isPromoted: true }, { isFeatured: true }],
      },
      select: {
        id: true,
        name: true,
        slug: true,
        category: true,
        description: true,
        imageUrl: true,
      },
      orderBy: [{ isPromoted: 'desc' }, { isFeatured: 'desc' }, { name: 'asc' }],
      take: 3,
    })
  )

  return vendors.map((v) => ({
    id: v.id,
    name: v.name,
    slug: v.slug,
    category: CATEGORY_LABELS[v.category] || v.category,
    description: v.description || '',
    image: v.imageUrl || '',
  }))
}
