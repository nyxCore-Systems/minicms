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

// Whitelist of allowed VendorDetail fields to prevent mass assignment
const DETAIL_FIELDS = [
  'street', 'city', 'zip', 'country', 'phone2', 'fax',
  'taxId', 'commercialReg', 'bankName', 'iban', 'bic',
  'affiliateModel', 'affiliateRate', 'contractStart', 'contractEnd', 'notes',
] as const

function sanitizeDetail(raw: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const key of DETAIL_FIELDS) {
    if (key in raw) {
      result[key] = raw[key]
    }
  }
  return result
}

export async function GET(
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

  const vendor = await prisma.vendor.findUnique({
    where: { id },
    include: {
      ads: {
        include: {
          _count: { select: { impressions: true } },
        },
      },
      products: {
        select: {
          id: true,
          label: true,
          image: true,
          url: true,
          tags: true,
          isActive: true,
        },
      },
      detail: true,
      _count: { select: { ads: true, clicks: true, products: true } },
    },
  })

  if (!vendor || vendor.tenantId !== tenant.id) {
    return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
  }

  // Aggregate click stats
  const clickStats = await prisma.vendorClick.groupBy({
    by: ['clickType'],
    where: { vendorId: id },
    _count: true,
  })

  // Banner impression stats grouped by adId and eventType
  const adIds = vendor.ads.map((a) => a.id)
  const bannerStats = adIds.length > 0
    ? await prisma.bannerImpression.groupBy({
        by: ['adId', 'eventType'],
        where: { adId: { in: adIds } },
        _count: true,
        _min: { createdAt: true },
        _max: { createdAt: true },
      })
    : []

  return NextResponse.json({ ...vendor, clickStats, bannerStats })
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
  const body = await request.json()

  const vendor = await prisma.vendor.findUnique({ where: { id } })
  if (!vendor || vendor.tenantId !== tenant.id) {
    return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
  }

  const { detail, ...vendorData } = body

  const updated = await prisma.vendor.update({
    where: { id },
    data: {
      name: vendorData.name ?? vendor.name,
      slug: vendorData.slug ?? vendor.slug,
      description: vendorData.description !== undefined ? vendorData.description : vendor.description,
      category: vendorData.category ?? vendor.category,
      website: vendorData.website !== undefined ? vendorData.website : vendor.website,
      email: vendorData.email !== undefined ? vendorData.email : vendor.email,
      phone: vendorData.phone !== undefined ? vendorData.phone : vendor.phone,
      contactPerson: vendorData.contactPerson !== undefined ? vendorData.contactPerson : vendor.contactPerson,
      content: vendorData.content !== undefined ? vendorData.content : vendor.content,
      location: vendorData.location !== undefined ? vendorData.location : vendor.location,
      since: vendorData.since !== undefined ? vendorData.since : vendor.since,
      logoUrl: vendorData.logoUrl !== undefined ? vendorData.logoUrl : vendor.logoUrl,
      imageUrl: vendorData.imageUrl !== undefined ? vendorData.imageUrl : vendor.imageUrl,
      validUntil: vendorData.validUntil !== undefined ? vendorData.validUntil : vendor.validUntil,
      isActive: vendorData.isActive ?? vendor.isActive,
      isFeatured: vendorData.isFeatured ?? vendor.isFeatured,
      isPromoted: vendorData.isPromoted ?? vendor.isPromoted,
      tags: vendorData.tags !== undefined ? vendorData.tags : vendor.tags,
      images: vendorData.images !== undefined ? vendorData.images : vendor.images,
      promotedLinks: vendorData.promotedLinks !== undefined ? vendorData.promotedLinks : vendor.promotedLinks,
    },
    include: { detail: true, _count: { select: { ads: true, clicks: true } } },
  })

  // Upsert VendorDetail if provided (sanitized)
  if (detail && typeof detail === 'object') {
    const safeDetail = sanitizeDetail(detail as Record<string, unknown>)
    await prisma.vendorDetail.upsert({
      where: { vendorId: id },
      create: {
        vendorId: id,
        ...safeDetail,
      },
      update: safeDetail,
    })
  }

  // Re-fetch with detail
  const result = await prisma.vendor.findUnique({
    where: { id },
    include: {
      ads: true,
      detail: true,
      _count: { select: { ads: true, clicks: true } },
    },
  })

  return NextResponse.json(result)
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

  const vendor = await prisma.vendor.findUnique({ where: { id } })
  if (!vendor || vendor.tenantId !== tenant.id) {
    return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
  }

  await prisma.vendor.delete({ where: { id } })

  return new NextResponse(null, { status: 204 })
}
