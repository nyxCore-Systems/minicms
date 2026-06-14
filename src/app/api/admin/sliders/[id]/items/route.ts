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

export async function POST(
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
  const slider = await prisma.slider.findUnique({ where: { id } })

  if (!slider || slider.tenantId !== tenant.id) {
    return NextResponse.json({ error: 'Slider not found' }, { status: 404 })
  }

  const body = await request.json()
  const { pageId, productId, vendorId, mediaId, title, subtitle, imageUrl, videoUrl, linkUrl, buttonText, sortOrder, config } = body

  const item = await prisma.sliderItem.create({
    data: {
      sliderId: id,
      pageId: pageId || null,
      productId: productId || null,
      vendorId: vendorId || null,
      mediaId: mediaId || null,
      title: title || null,
      subtitle: subtitle || null,
      imageUrl: imageUrl || null,
      videoUrl: videoUrl || null,
      linkUrl: linkUrl || null,
      buttonText: buttonText || null,
      sortOrder: sortOrder ?? 0,
      config: config ?? null,
    },
    include: {
      page: { select: { id: true, title: true, slug: true, ogImage: true, featureImage: true, featureVideo: true } },
      product: { select: { id: true, label: true, url: true, image: true } },
      vendor: { select: { id: true, name: true, slug: true, imageUrl: true, description: true } },
      media: { select: { id: true, url: true, type: true, filename: true } },
    },
  })

  return NextResponse.json(item, { status: 201 })
}
