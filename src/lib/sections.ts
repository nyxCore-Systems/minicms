import { prisma, withRetry } from './prisma'
import { getTenant } from './tenant'

export async function getHomepageSections() {
  const tenant = await getTenant()
  if (!tenant) return []

  return withRetry(() =>
    prisma.homepageSection.findMany({
      where: { tenantId: tenant.id, isVisible: true },
      orderBy: { sortOrder: 'asc' },
    })
  )
}
