import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenant } from '@/lib/tenant'
import {
  getSliderBySlug,
  getFeaturedPages,
  getFeaturedProducts,
  getFeaturedVendors,
} from '@/lib/sliders'

type SliderItem = {
  id: string
  title: string
  subtitle?: string | null
  imageUrl?: string | null
  videoUrl?: string | null
  linkUrl?: string | null
  buttonText?: string | null
  type: string
  config?: Record<string, unknown> | null
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

async function getAutoItems(
  slider: {
    itemType: string
    filterTags: string[]
    filterCategoryIds: string[]
    filterVendorIds: string[]
    maxItems: number | null
    sortBy: string
  },
  tenantId: string
): Promise<SliderItem[]> {
  const limit = slider.maxItems ?? 12

  if (slider.itemType === 'PRODUCT') {
    const orConditions: any[] = []
    if (slider.filterTags.length > 0) {
      orConditions.push({ tags: { hasSome: slider.filterTags } })
    }
    if (slider.filterCategoryIds.length > 0) {
      orConditions.push({ categories: { some: { id: { in: slider.filterCategoryIds } } } })
    }
    if (slider.filterVendorIds.length > 0) {
      orConditions.push({ vendorId: { in: slider.filterVendorIds } })
    }

    const products = await prisma.product.findMany({
      where: {
        tenantId,
        isActive: true,
        ...(orConditions.length > 0 ? { OR: orConditions } : {}),
      },
      select: { id: true, label: true, url: true, image: true, createdAt: true },
      orderBy: slider.sortBy === 'newest' ? { createdAt: 'desc' } : undefined,
      take: slider.sortBy === 'random' ? undefined : limit,
    })

    let items = products.map((p) => ({
      id: p.id,
      title: p.label,
      subtitle: null,
      imageUrl: p.image || null,
      linkUrl: p.url,
      type: 'product',
    }))

    if (slider.sortBy === 'random') {
      items = shuffleArray(items).slice(0, limit)
    }

    return items
  }

  if (slider.itemType === 'VENDOR') {
    const orConditions: any[] = []
    if (slider.filterTags.length > 0) {
      orConditions.push({ tags: { hasSome: slider.filterTags } })
    }
    if (slider.filterVendorIds.length > 0) {
      orConditions.push({ id: { in: slider.filterVendorIds } })
    }

    const vendors = await prisma.vendor.findMany({
      where: {
        tenantId,
        isActive: true,
        ...(orConditions.length > 0 ? { OR: orConditions } : {}),
      },
      select: { id: true, name: true, slug: true, imageUrl: true, description: true, createdAt: true },
      orderBy: slider.sortBy === 'newest' ? { createdAt: 'desc' } : undefined,
      take: slider.sortBy === 'random' ? undefined : limit,
    })

    let items = vendors.map((v) => ({
      id: v.id,
      title: v.name,
      subtitle: v.description || null,
      imageUrl: v.imageUrl || null,
      linkUrl: `/haendler/${v.slug}`,
      type: 'vendor',
    }))

    if (slider.sortBy === 'random') {
      items = shuffleArray(items).slice(0, limit)
    }

    return items
  }

  if (slider.itemType === 'ARTIST') {
    const artists = await prisma.artist.findMany({
      where: { tenantId, isPublished: true, isActive: true, ...(slider.filterTags?.length ? { genres: { hasSome: slider.filterTags } } : {}) },
      select: { id: true, name: true, slug: true, heroImage: true, origin: true, genres: true },
      orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }],
      take: slider.maxItems || 12,
    })
    return artists.map((a) => ({
      id: a.id,
      title: a.name,
      subtitle: a.origin || (a.genres[0] ?? ''),
      imageUrl: a.heroImage || '',
      linkUrl: `/kuenstler/${a.slug}`,
      type: 'ARTIST' as const,
    }))
  }

  if (slider.itemType === 'PAGE') {
    const pages = await prisma.page.findMany({
      where: { tenantId, isPublished: true, isFeatured: true },
      select: { id: true, title: true, slug: true, ogImage: true, featureImage: true, featureVideo: true, metaDescription: true, createdAt: true },
      orderBy: slider.sortBy === 'newest' ? { createdAt: 'desc' } : { sortOrder: 'asc' },
      take: slider.sortBy === 'random' ? undefined : limit,
    })

    let items = pages.map((p) => ({
      id: p.id,
      title: p.title,
      subtitle: p.metaDescription || null,
      imageUrl: p.featureImage || p.ogImage || null,
      videoUrl: p.featureVideo || null,
      linkUrl: `/${p.slug}`,
      type: 'page',
    }))

    if (slider.sortBy === 'random') {
      items = shuffleArray(items).slice(0, limit)
    }

    return items
  }

  if (slider.itemType === 'MEDIA') {
    // MEDIA type doesn't support auto-populate (media items are always manual)
    return []
  }

  return []
}

export async function GET(request: Request) {
  const tenant = await getTenant()
  if (!tenant) return NextResponse.json({ sliderId: null, config: null, sponsorVendorId: null, items: [] })

  const { searchParams } = new URL(request.url)
  const slug = searchParams.get('slug')
  const type = searchParams.get('type')

  if (slug) {
    const slider = await getSliderBySlug(slug, tenant.id)
    if (!slider || !slider.isActive) {
      return NextResponse.json({ sliderId: null, config: null, sponsorVendorId: null, items: [] })
    }

    // Map manual items from SliderItem relations
    const manualItems: SliderItem[] = slider.items.map((item) => {
      const isMedia = !!item.mediaId
      const artistItem = (item as any).artist as { id: string; name: string; slug: string; heroImage: string | null; origin: string | null } | null
      return {
        id: item.id,
        title: item.title || item.page?.title || item.product?.label || item.vendor?.name || artistItem?.name || (item.media?.filename || ''),
        subtitle: item.subtitle || item.vendor?.description || artistItem?.origin || null,
        imageUrl: item.imageUrl ||
          (item.page ? ((item.page as any).featureImage || item.page.ogImage) : null) ||
          item.product?.image ||
          item.vendor?.imageUrl ||
          artistItem?.heroImage ||
          (item.media?.type === 'IMAGE' ? item.media.url : null) ||
          null,
        videoUrl: item.videoUrl ||
          (item.page ? (item.page as any).featureVideo : null) ||
          (item.media?.type === 'VIDEO' ? item.media.url : null) ||
          null,
        linkUrl:
          item.linkUrl ||
          (item.page ? `/${item.page.slug}` : null) ||
          (item.product ? item.product.url : null) ||
          (item.vendor ? `/haendler/${item.vendor.slug}` : null) ||
          (artistItem ? `/kuenstler/${artistItem.slug}` : null),
        buttonText: item.buttonText || null,
        type: isMedia ? 'media' : item.vendorId ? 'vendor' : (item as any).artistId ? 'ARTIST' : item.productId ? 'product' : 'page',
        config: (item as any).config ?? null,
      }
    })

    let items: SliderItem[]

    if (slider.filterMode === 'auto') {
      items = await getAutoItems(slider, tenant.id)
    } else if (slider.filterMode === 'mixed') {
      const autoItems = await getAutoItems(slider, tenant.id)
      // Combine manual + auto, dedup by entity linkUrl (or id as fallback)
      const seen = new Set(manualItems.map((i) => i.id))
      const combined = [...manualItems]
      for (const item of autoItems) {
        if (!seen.has(item.id)) {
          combined.push(item)
          seen.add(item.id)
        }
      }
      items = combined.slice(0, slider.maxItems ?? combined.length)
    } else {
      // manual mode
      items = manualItems
    }

    return NextResponse.json(
      {
        sliderId: slider.id,
        config: (slider as any).config ?? null,
        sponsorVendorId: (slider as any).sponsorVendorId ?? null,
        items,
      },
      {
        headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
      }
    )
  }

  if (type) {
    let items: SliderItem[] = []

    if (type === 'page') {
      const pages = await getFeaturedPages(tenant.id)
      items = pages.map((p) => ({
        id: p.id,
        title: p.title,
        subtitle: p.metaDescription || null,
        imageUrl: (p as any).featureImage || p.ogImage || null,
        videoUrl: (p as any).featureVideo || null,
        linkUrl: `/${p.slug}`,
        type: 'page',
      }))
    } else if (type === 'product') {
      const products = await getFeaturedProducts(tenant.id)
      items = products.map((p) => ({
        id: p.id,
        title: p.label,
        subtitle: null,
        imageUrl: p.image || null,
        linkUrl: p.url,
        type: 'product',
      }))
    } else if (type === 'vendor') {
      const vendors = await getFeaturedVendors(tenant.id)
      items = vendors.map((v) => ({
        id: v.id,
        title: v.name,
        subtitle: v.description || null,
        imageUrl: v.imageUrl || null,
        linkUrl: `/haendler/${v.slug}`,
        type: 'vendor',
      }))
    }

    return NextResponse.json(
      { sliderId: null, config: null, sponsorVendorId: null, items },
      {
        headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
      }
    )
  }

  return NextResponse.json({ sliderId: null, config: null, sponsorVendorId: null, items: [] })
}
