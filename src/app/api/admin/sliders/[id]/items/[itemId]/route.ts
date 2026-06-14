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

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const token = await getSessionToken()
  if (!token || !['ADMIN', 'SUPER_ADMIN'].includes(token.role as string)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const tenant = await getTenant()
  if (!tenant) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
  }

  const { id, itemId } = await params
  const slider = await prisma.slider.findUnique({ where: { id } })

  if (!slider || slider.tenantId !== tenant.id) {
    return NextResponse.json({ error: 'Slider not found' }, { status: 404 })
  }

  const item = await prisma.sliderItem.findUnique({ where: { id: itemId } })

  if (!item || item.sliderId !== id) {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 })
  }

  const body = await request.json()

  const updated = await prisma.sliderItem.update({
    where: { id: itemId },
    data: {
      pageId: body.pageId !== undefined ? (body.pageId || null) : item.pageId,
      productId: body.productId !== undefined ? (body.productId || null) : item.productId,
      vendorId: body.vendorId !== undefined ? (body.vendorId || null) : item.vendorId,
      mediaId: body.mediaId !== undefined ? (body.mediaId || null) : item.mediaId,
      title: body.title !== undefined ? (body.title || null) : item.title,
      subtitle: body.subtitle !== undefined ? (body.subtitle || null) : item.subtitle,
      imageUrl: body.imageUrl !== undefined ? (body.imageUrl || null) : item.imageUrl,
      videoUrl: body.videoUrl !== undefined ? (body.videoUrl || null) : item.videoUrl,
      linkUrl: body.linkUrl !== undefined ? (body.linkUrl || null) : item.linkUrl,
      buttonText: body.buttonText !== undefined ? (body.buttonText || null) : item.buttonText,
      sortOrder: body.sortOrder ?? item.sortOrder,
      isActive: body.isActive !== undefined ? body.isActive : item.isActive,
      config: body.config !== undefined ? body.config : (item as any).config,
    },
    include: {
      page: { select: { id: true, title: true, slug: true, ogImage: true, featureImage: true, featureVideo: true } },
      product: { select: { id: true, label: true, url: true, image: true } },
      vendor: { select: { id: true, name: true, slug: true, imageUrl: true, description: true } },
      media: { select: { id: true, url: true, type: true, filename: true } },
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const token = await getSessionToken()
  if (!token || !['ADMIN', 'SUPER_ADMIN'].includes(token.role as string)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const tenant = await getTenant()
  if (!tenant) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
  }

  const { id, itemId } = await params
  const slider = await prisma.slider.findUnique({ where: { id } })

  if (!slider || slider.tenantId !== tenant.id) {
    return NextResponse.json({ error: 'Slider not found' }, { status: 404 })
  }

  const item = await prisma.sliderItem.findUnique({ where: { id: itemId } })

  if (!item || item.sliderId !== id) {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 })
  }

  await prisma.sliderItem.delete({ where: { id: itemId } })

  return NextResponse.json({ success: true })
}
