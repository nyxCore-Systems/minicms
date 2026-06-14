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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getSessionToken()
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const ad = await prisma.vendorAd.findUnique({
    where: { id },
    include: {
      vendor: { select: { id: true, name: true, slug: true } },
    },
  })

  if (!ad) {
    return NextResponse.json({ error: 'Ad not found' }, { status: 404 })
  }

  return NextResponse.json(ad)
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
  const ad = await prisma.vendorAd.findUnique({
    where: { id },
    include: { vendor: true },
  })

  if (!ad || ad.vendor.tenantId !== tenant.id) {
    return NextResponse.json({ error: 'Ad not found' }, { status: 404 })
  }

  const body = await request.json()

  let width = body.width !== undefined ? body.width : ad.width
  let height = body.height !== undefined ? body.height : ad.height
  const bannerType = body.bannerType !== undefined ? body.bannerType : ad.bannerType

  if (body.bannerType && body.width === undefined && body.height === undefined) {
    const dims = BANNER_DIMENSIONS[body.bannerType as BannerType]
    if (dims) {
      width = dims.width
      height = dims.height
    }
  }

  const updated = await prisma.vendorAd.update({
    where: { id },
    data: {
      title: body.title ?? ad.title,
      content: body.content !== undefined ? body.content : ad.content,
      imageUrl: body.imageUrl !== undefined ? body.imageUrl : ad.imageUrl,
      videoUrl: body.videoUrl !== undefined ? body.videoUrl : ad.videoUrl,
      linkUrl: body.linkUrl !== undefined ? body.linkUrl : ad.linkUrl,
      position: body.position ?? ad.position,
      vendorId: body.vendorId ?? ad.vendorId,
      isActive: body.isActive !== undefined ? body.isActive : ad.isActive,
      startDate: body.startDate !== undefined
        ? (body.startDate ? new Date(body.startDate) : null)
        : ad.startDate,
      endDate: body.endDate !== undefined
        ? (body.endDate ? new Date(body.endDate) : null)
        : ad.endDate,
      bannerType: bannerType,
      weight: body.weight ?? ad.weight,
      impressionTarget: body.impressionTarget !== undefined ? body.impressionTarget : ad.impressionTarget,
      costPerMille: body.costPerMille !== undefined ? body.costPerMille : ad.costPerMille,
      width,
      height,
    },
    include: {
      vendor: { select: { id: true, name: true, slug: true } },
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
  const ad = await prisma.vendorAd.findUnique({
    where: { id },
    include: { vendor: true },
  })

  if (!ad || ad.vendor.tenantId !== tenant.id) {
    return NextResponse.json({ error: 'Ad not found' }, { status: 404 })
  }

  await prisma.vendorAd.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
