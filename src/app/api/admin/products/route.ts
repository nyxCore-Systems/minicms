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

export async function GET(request: Request) {
  const token = await getSessionToken()
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const tenant = await getTenant()
  if (!tenant) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
  }

  const { searchParams } = new URL(request.url)
  const vendorId = searchParams.get('vendorId')
  const tag = searchParams.get('tag')
  const categoryId = searchParams.get('categoryId')

  const where: Record<string, unknown> = { tenantId: tenant.id }
  if (vendorId) where.vendorId = vendorId
  if (tag) where.tags = { has: tag }
  if (categoryId) where.categories = { some: { id: categoryId } }

  const products = await prisma.product.findMany({
    where,
    include: {
      vendor: { select: { id: true, name: true, slug: true, logoUrl: true } },
      categories: { select: { id: true, name: true, slug: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(products)
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
  const { label, url, image, content, position, tags, vendorId, isActive, categoryIds } = body

  if (!label || !url || !vendorId) {
    return NextResponse.json(
      { error: 'label, url, and vendorId are required' },
      { status: 400 }
    )
  }

  const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } })
  if (!vendor || vendor.tenantId !== tenant.id) {
    return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
  }

  const product = await prisma.product.create({
    data: {
      tenantId: tenant.id,
      vendorId,
      label,
      url,
      image: image || null,
      content: content || null,
      position: position || 'top',
      tags: tags || [],
      isActive: isActive ?? true,
      ...(Array.isArray(categoryIds) && categoryIds.length > 0
        ? { categories: { connect: categoryIds.map((id: string) => ({ id })) } }
        : {}),
    },
    include: {
      vendor: { select: { id: true, name: true, slug: true, logoUrl: true } },
      categories: { select: { id: true, name: true, slug: true } },
    },
  })

  return NextResponse.json(product, { status: 201 })
}
