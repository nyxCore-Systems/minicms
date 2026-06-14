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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getSessionToken()
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const category = await prisma.productCategory.findUnique({
    where: { id },
    include: {
      children: { orderBy: { sortOrder: 'asc' } },
      _count: { select: { products: true } },
    },
  })

  if (!category) {
    return NextResponse.json({ error: 'Category not found' }, { status: 404 })
  }

  return NextResponse.json(category)
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getSessionToken()
  if (!token || !['ADMIN', 'SUPER_ADMIN'].includes(token.role as string)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const tenant = await getTenant()
  if (!tenant) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
  }

  const { id } = await params
  const category = await prisma.productCategory.findUnique({ where: { id } })

  if (!category || category.tenantId !== tenant.id) {
    return NextResponse.json({ error: 'Category not found' }, { status: 404 })
  }

  const body = await request.json()

  // If changing parentId, enforce depth constraint
  if (body.parentId !== undefined && body.parentId !== category.parentId) {
    if (body.parentId !== null) {
      const parent = await prisma.productCategory.findUnique({
        where: { id: body.parentId },
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
  }

  // If changing slug, check uniqueness
  if (body.slug && body.slug !== category.slug) {
    const existing = await prisma.productCategory.findUnique({
      where: { tenantId_slug: { tenantId: tenant.id, slug: body.slug } },
    })
    if (existing) {
      return NextResponse.json(
        { error: 'A category with this slug already exists' },
        { status: 409 }
      )
    }
  }

  const updated = await prisma.productCategory.update({
    where: { id },
    data: {
      name: body.name ?? category.name,
      slug: body.slug ?? category.slug,
      description: body.description !== undefined ? body.description : category.description,
      image: body.image !== undefined ? body.image : category.image,
      parentId: body.parentId !== undefined ? body.parentId : category.parentId,
      isActive: body.isActive !== undefined ? body.isActive : category.isActive,
      sortOrder: body.sortOrder !== undefined ? body.sortOrder : category.sortOrder,
    },
    include: {
      _count: { select: { products: true } },
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getSessionToken()
  if (!token || !['ADMIN', 'SUPER_ADMIN'].includes(token.role as string)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const tenant = await getTenant()
  if (!tenant) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
  }

  const { id } = await params
  const category = await prisma.productCategory.findUnique({ where: { id } })

  if (!category || category.tenantId !== tenant.id) {
    return NextResponse.json({ error: 'Category not found' }, { status: 404 })
  }

  await prisma.productCategory.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
