import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getToken } from 'next-auth/jwt'
import { prisma } from '@/lib/prisma'
import { getTenant } from '@/lib/tenant'

async function getSessionToken() {
  const cookieStore = await cookies()
  return getToken({
    req: {
      cookies: Object.fromEntries(
        cookieStore.getAll().map((c) => [c.name, c.value])
      ),
    } as any,
    secret: process.env.NEXTAUTH_SECRET,
  })
}

export async function GET() {
  const token = await getSessionToken()
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const tenant = await getTenant()
  if (!tenant) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
  }

  const categories = await prisma.productCategory.findMany({
    where: { tenantId: tenant.id },
    include: {
      children: {
        orderBy: { sortOrder: 'asc' },
        include: {
          _count: { select: { products: true } },
        },
      },
      _count: { select: { products: true } },
    },
    orderBy: { sortOrder: 'asc' },
  })

  return NextResponse.json(categories)
}

export async function POST(request: Request) {
  const token = await getSessionToken()
  if (!token || !['ADMIN', 'SUPER_ADMIN'].includes(token.role as string)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const tenant = await getTenant()
  if (!tenant) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
  }

  const body = await request.json()
  const { name, slug, description, image, parentId, isActive } = body

  if (!name || !slug) {
    return NextResponse.json(
      { error: 'name and slug are required' },
      { status: 400 }
    )
  }

  // Check slug uniqueness within tenant
  const existing = await prisma.productCategory.findUnique({
    where: { tenantId_slug: { tenantId: tenant.id, slug } },
  })
  if (existing) {
    return NextResponse.json(
      { error: 'A category with this slug already exists' },
      { status: 409 }
    )
  }

  // Enforce max 2-level depth: a child's parent must be a top-level category
  if (parentId) {
    const parent = await prisma.productCategory.findUnique({
      where: { id: parentId },
    })
    if (!parent || parent.tenantId !== tenant.id) {
      return NextResponse.json({ error: 'Parent not found' }, { status: 404 })
    }
    if (parent.parentId !== null) {
      return NextResponse.json(
        { error: 'Max 2-level depth: parent must be a top-level category' },
        { status: 400 }
      )
    }
  }

  // Get next sort order
  const maxSort = await prisma.productCategory.aggregate({
    where: { tenantId: tenant.id, parentId: parentId || null },
    _max: { sortOrder: true },
  })

  const category = await prisma.productCategory.create({
    data: {
      tenantId: tenant.id,
      name,
      slug,
      description: description || null,
      image: image || null,
      parentId: parentId || null,
      sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
      isActive: isActive ?? true,
    },
    include: {
      _count: { select: { products: true } },
    },
  })

  return NextResponse.json(category, { status: 201 })
}
