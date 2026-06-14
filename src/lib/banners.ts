import { prisma } from './prisma'
import type { BannerType } from '@prisma/client'

export const BANNER_DIMENSIONS: Record<BannerType, { width: number; height: number }> = {
  HOMEPAGE_SLIDER: { width: 1200, height: 400 },
  HOMEPAGE_FIXED: { width: 728, height: 90 },
  CONTENT_FIXED_WIDE: { width: 970, height: 250 },
  CONTENT_FIXED_TALL: { width: 300, height: 600 },
}

export async function getActiveBanners(bannerType: BannerType, tenantId: string) {
  const now = new Date()
  return prisma.vendorAd.findMany({
    where: {
      bannerType,
      isActive: true,
      vendor: { tenantId, isActive: true },
      OR: [
        { startDate: null, endDate: null },
        { startDate: { lte: now }, endDate: null },
        { startDate: null, endDate: { gte: now } },
        { startDate: { lte: now }, endDate: { gte: now } },
      ],
    },
    include: {
      vendor: { select: { id: true, name: true, slug: true } },
    },
  })
}

export function selectBanner(banners: { weight: number }[]) {
  if (banners.length === 0) return null
  const totalWeight = banners.reduce((sum, b) => sum + b.weight, 0)
  let random = Math.random() * totalWeight
  for (const banner of banners) {
    random -= banner.weight
    if (random <= 0) return banner
  }
  return banners[banners.length - 1]
}

export async function selectBannerById(bannerId: string, tenantId: string) {
  const now = new Date()
  return prisma.vendorAd.findFirst({
    where: {
      id: bannerId,
      isActive: true,
      vendor: { tenantId, isActive: true },
      OR: [
        { startDate: null, endDate: null },
        { startDate: { lte: now }, endDate: null },
        { startDate: null, endDate: { gte: now } },
        { startDate: { lte: now }, endDate: { gte: now } },
      ],
    },
    include: {
      vendor: { select: { id: true, name: true, slug: true } },
    },
  })
}

export async function recordImpression(
  adId: string,
  tenantId: string,
  sessionId: string | null,
  path: string,
  eventType: 'view' | 'click'
) {
  await prisma.$transaction([
    prisma.bannerImpression.create({
      data: { adId, tenantId, sessionId, path, eventType },
    }),
    prisma.vendorAd.update({
      where: { id: adId },
      data: eventType === 'view'
        ? { views: { increment: 1 } }
        : { clicks: { increment: 1 } },
    }),
  ])
}
