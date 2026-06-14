import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getToken } from 'next-auth/jwt'
import { prisma } from '@/lib/prisma'
import { getTenant } from '@/lib/tenant'
import { BANNER_DIMENSIONS } from '@/lib/banners'
import type { BannerType } from '@prisma/client'

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

  const ads = await prisma.vendorAd.findMany({
    where: { vendor: { tenantId: tenant.id } },
    include: {
      vendor: { select: { id: true, name: true, slug: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(ads)
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
  const { title, content, imageUrl, videoUrl, linkUrl, position, vendorId, startDate, endDate, isActive, bannerType, weight, impressionTarget, costPerMille } = body
  let { width, height } = body

  if (!title || !vendorId) {
    return NextResponse.json(
      { error: 'title and vendorId are required' },
      { status: 400 }
    )
  }

  const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } })
  if (!vendor || vendor.tenantId !== tenant.id) {
    return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
  }

  if (bannerType && !width && !height) {
    const dims = BANNER_DIMENSIONS[bannerType as BannerType]
    if (dims) {
      width = dims.width
      height = dims.height
    }
  }

  const ad = await prisma.vendorAd.create({
    data: {
      vendorId,
      title,
      content: content || null,
      imageUrl: imageUrl || null,
      videoUrl: videoUrl || null,
      linkUrl: linkUrl || null,
      position: position || 'sidebar',
      isActive: isActive ?? true,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      bannerType: bannerType || null,
      weight: weight ?? 1,
      impressionTarget: impressionTarget ?? null,
      costPerMille: costPerMille ?? null,
      width: width ?? null,
      height: height ?? null,
    },
    include: {
      vendor: { select: { id: true, name: true, slug: true } },
    },
  })

  return NextResponse.json(ad, { status: 201 })
}
