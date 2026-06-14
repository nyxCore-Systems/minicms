import { prisma, withRetry } from './prisma'
import { getTenant } from './tenant'

export interface TagTile {
  tag: string
  slug: string
  count: number
  image: string | null
}

export interface ProductWithVendor {
  id: string
  label: string
  url: string
  image: string | null
  content: string | null
  tags: string[]
  vendor: {
    id: string
    name: string
    slug: string
    imageUrl: string | null
    logoUrl: string | null
  }
}

export function tagToSlug(tag: string): string {
  return tag
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function slugToTag(slug: string, allTags: string[]): string | null {
  for (const tag of allTags) {
    if (tagToSlug(tag) === slug) return tag
  }
  return null
}

/**
 * Returns unique tags from vendors (not products) with product counts, for the tag tiles page.
 */
export async function getProductTags(): Promise<TagTile[]> {
  const tenant = await getTenant()
  if (!tenant) return []

  const vendors = await withRetry(() =>
    prisma.vendor.findMany({
      where: { tenantId: tenant.id, isActive: true },
      select: { id: true, tags: true, imageUrl: true, _count: { select: { products: { where: { isActive: true } } } } },
    })
  )

  const tagMap = new Map<string, { count: number; image: string | null }>()

  for (const vendor of vendors) {
    for (const tag of vendor.tags) {
      const existing = tagMap.get(tag)
      if (existing) {
        existing.count += vendor._count.products
        if (!existing.image && vendor.imageUrl) {
          existing.image = vendor.imageUrl
        }
      } else {
        tagMap.set(tag, { count: vendor._count.products, image: vendor.imageUrl })
      }
    }
  }

  return Array.from(tagMap.entries())
    .map(([tag, data]) => ({
      tag,
      slug: tagToSlug(tag),
      count: data.count,
      image: data.image,
    }))
    .sort((a, b) => b.count - a.count)
}

/**
 * Returns all products from vendors that have the matching tag.
 */
export async function getProductsByTagSlug(
  tagSlug: string
): Promise<{ tag: string; products: ProductWithVendor[] } | null> {
  const tenant = await getTenant()
  if (!tenant) return null

  // Resolve slug back to vendor tag name
  const vendors = await withRetry(() =>
    prisma.vendor.findMany({
      where: { tenantId: tenant.id, isActive: true },
      select: { id: true, tags: true },
    })
  )

  const allVendorTags = new Set<string>()
  for (const v of vendors) {
    for (const t of v.tags) allVendorTags.add(t)
  }

  const tag = slugToTag(tagSlug, Array.from(allVendorTags))
  if (!tag) return null

  // Find vendor IDs that have this tag
  const vendorIds = vendors
    .filter((v) => v.tags.includes(tag))
    .map((v) => v.id)

  const products = await withRetry(() =>
    prisma.product.findMany({
      where: {
        tenantId: tenant.id,
        isActive: true,
        vendorId: { in: vendorIds },
      },
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
            slug: true,
            imageUrl: true,
            logoUrl: true,
          },
        },
      },
      orderBy: [{ vendor: { name: 'asc' } }, { label: 'asc' }],
    })
  )

  return {
    tag,
    products: products.map((p) => ({
      id: p.id,
      label: p.label,
      url: p.url,
      image: p.image,
      content: p.content,
      tags: p.tags,
      vendor: p.vendor,
    })),
  }
}

/**
 * Returns all unique tag slugs for generateStaticParams.
 */
export async function getAllTagSlugs(): Promise<string[]> {
  const tags = await getProductTags()
  return tags.map((t) => t.slug)
}
