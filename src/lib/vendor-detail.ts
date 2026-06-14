import { prisma } from './prisma'

export async function getVendorBySlug(slug: string, tenantId: string) {
  return prisma.vendor.findFirst({
    where: { slug, tenantId, isActive: true },
    include: {
      detail: true,
      products: {
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
      },
      ads: {
        where: {
          isActive: true,
          OR: [
            { startDate: null, endDate: null },
            { startDate: { lte: new Date() }, endDate: null },
            { startDate: null, endDate: { gte: new Date() } },
            { startDate: { lte: new Date() }, endDate: { gte: new Date() } },
          ],
        },
      },
    },
  })
}
