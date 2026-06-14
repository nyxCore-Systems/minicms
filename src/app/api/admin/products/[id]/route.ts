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
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      vendor: { select: { id: true, name: true, slug: true, logoUrl: true } },
      categories: { select: { id: true, name: true, slug: true } },
    },
  })

  if (!product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  }

  return NextResponse.json(product)
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
  const product = await prisma.product.findUnique({ where: { id } })

  if (!product || product.tenantId !== tenant.id) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  }

  const body = await request.json()

  const updated = await prisma.product.update({
    where: { id },
    data: {
      label: body.label ?? product.label,
      url: body.url ?? product.url,
      image: body.image !== undefined ? body.image : product.image,
      content: body.content !== undefined ? body.content : product.content,
      position: body.position ?? product.position,
      tags: body.tags !== undefined ? body.tags : product.tags,
      vendorId: body.vendorId ?? product.vendorId,
      isActive: body.isActive !== undefined ? body.isActive : product.isActive,
      isFeatured: body.isFeatured !== undefined ? body.isFeatured : product.isFeatured,
      ...(body.categoryIds !== undefined
        ? { categories: { set: body.categoryIds.map((cid: string) => ({ id: cid })) } }
        : {}),
    },
    include: {
      vendor: { select: { id: true, name: true, slug: true, logoUrl: true } },
      categories: { select: { id: true, name: true, slug: true } },
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
  const product = await prisma.product.findUnique({ where: { id } })

  if (!product || product.tenantId !== tenant.id) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  }

  await prisma.product.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
