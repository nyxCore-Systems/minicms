import { prisma, withRetry } from './prisma'
import { getTenant } from './tenant'

export interface CategoryNode {
  id: string
  slug: string
  name: string
  description: string | null
  image: string | null
  parentId: string | null
  sortOrder: number
  productCount: number
  children: CategoryNode[]
}

export interface CategoryWithProducts {
  id: string
  slug: string
  name: string
  description: string | null
  image: string | null
  parent: { id: string; slug: string; name: string } | null
  children: { id: string; slug: string; name: string; image: string | null }[]
  products: {
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
  }[]
}

/**
 * Returns active categories as a nested tree with product counts.
 * Top-level categories include counts from their children.
 */
export async function getCategoryTree(): Promise<CategoryNode[]> {
  const tenant = await getTenant()
  if (!tenant) return []

  const categories = await withRetry(() =>
    prisma.productCategory.findMany({
      where: { tenantId: tenant.id, isActive: true },
      include: {
        _count: { select: { products: { where: { isActive: true } } } },
      },
      orderBy: { sortOrder: 'asc' },
    })
  )

  // Build tree: first map children under parents
  const childrenMap = new Map<string | null, typeof categories>()
  for (const cat of categories) {
    const key = cat.parentId
    if (!childrenMap.has(key)) childrenMap.set(key, [])
    childrenMap.get(key)!.push(cat)
  }

  function buildNodes(parentId: string | null): CategoryNode[] {
    const items = childrenMap.get(parentId) || []
    return items.map((cat) => {
      const children = buildNodes(cat.id)
      const childProductCount = children.reduce((sum, c) => sum + c.productCount, 0)
      return {
        id: cat.id,
        slug: cat.slug,
        name: cat.name,
        description: cat.description,
        image: cat.image,
        parentId: cat.parentId,
        sortOrder: cat.sortOrder,
        productCount: cat._count.products + childProductCount,
        children,
      }
    })
  }

  return buildNodes(null)
}

/**
 * Returns a category by slug with its products.
 * Parent categories also include products from their children.
 */
export async function getCategoryBySlug(slug: string): Promise<CategoryWithProducts | null> {
  const tenant = await getTenant()
  if (!tenant) return null

  const category = await withRetry(() =>
    prisma.productCategory.findUnique({
      where: { tenantId_slug: { tenantId: tenant.id, slug } },
      include: {
        parent: { select: { id: true, slug: true, name: true } },
        children: {
          where: { isActive: true },
          select: { id: true, slug: true, name: true, image: true },
          orderBy: { sortOrder: 'asc' },
        },
        products: {
          where: { isActive: true },
          include: {
            vendor: {
              select: { id: true, name: true, slug: true, imageUrl: true, logoUrl: true },
            },
          },
          orderBy: [{ vendor: { name: 'asc' } }, { label: 'asc' }],
        },
      },
    })
  )

  if (!category || !category.isActive) return null

  // If this is a parent category, also include products from children
  let allProducts = category.products
  if (category.children.length > 0) {
    const childIds = category.children.map((c) => c.id)
    const childProducts = await withRetry(() =>
      prisma.product.findMany({
        where: {
          isActive: true,
          categories: { some: { id: { in: childIds } } },
        },
        include: {
          vendor: {
            select: { id: true, name: true, slug: true, imageUrl: true, logoUrl: true },
          },
        },
        orderBy: [{ vendor: { name: 'asc' } }, { label: 'asc' }],
      })
    )
    // Merge, deduplicate by product id
    const seen = new Set(allProducts.map((p) => p.id))
    for (const p of childProducts) {
      if (!seen.has(p.id)) {
        allProducts.push(p)
        seen.add(p.id)
      }
    }
  }

  return {
    id: category.id,
    slug: category.slug,
    name: category.name,
    description: category.description,
    image: category.image,
    parent: category.parent,
    children: category.children,
    products: allProducts.map((p) => ({
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
 * Returns all active category slugs (for sitemap generation).
 */
export async function getAllCategorySlugs(): Promise<string[]> {
  const tenant = await getTenant()
  if (!tenant) return []

  const categories = await withRetry(() =>
    prisma.productCategory.findMany({
      where: { tenantId: tenant.id, isActive: true },
      select: { slug: true },
    })
  )

  return categories.map((c) => c.slug)
}
