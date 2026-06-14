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

  const slider = await prisma.slider.findUnique({
    where: { id },
    include: {
      items: {
        orderBy: { sortOrder: 'asc' },
        include: {
          page: { select: { id: true, title: true, slug: true, ogImage: true, featureImage: true, featureVideo: true } },
          product: { select: { id: true, label: true, url: true, image: true } },
          vendor: { select: { id: true, name: true, slug: true, imageUrl: true, description: true } },
          artist: { select: { id: true, name: true, slug: true, heroImage: true, origin: true } },
          media: { select: { id: true, url: true, type: true, filename: true } },
        },
      },
      sponsorVendor: { select: { id: true, name: true } },
    },
  })

  if (!slider) {
    return NextResponse.json({ error: 'Slider not found' }, { status: 404 })
  }

  return NextResponse.json(slider)
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
  const slider = await prisma.slider.findUnique({ where: { id } })

  if (!slider || slider.tenantId !== tenant.id) {
    return NextResponse.json({ error: 'Slider not found' }, { status: 404 })
  }

  const body = await request.json()

  const updated = await prisma.slider.update({
    where: { id },
    data: {
      name: body.name ?? slider.name,
      slug: body.name
        ? body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
        : slider.slug,
      itemType: body.itemType ?? slider.itemType,
      config: body.config !== undefined ? body.config : slider.config,
      isActive: body.isActive !== undefined ? body.isActive : slider.isActive,
      filterMode: body.filterMode !== undefined ? body.filterMode : slider.filterMode,
      filterTags: body.filterTags !== undefined ? body.filterTags : slider.filterTags,
      filterCategoryIds: body.filterCategoryIds !== undefined ? body.filterCategoryIds : slider.filterCategoryIds,
      filterVendorIds: body.filterVendorIds !== undefined ? body.filterVendorIds : slider.filterVendorIds,
      maxItems: body.maxItems !== undefined ? body.maxItems : slider.maxItems,
      sortBy: body.sortBy !== undefined ? body.sortBy : slider.sortBy,
      sponsorVendorId: body.sponsorVendorId !== undefined ? body.sponsorVendorId : slider.sponsorVendorId,
      costPerMille: body.costPerMille !== undefined ? body.costPerMille : slider.costPerMille,
      impressionTarget: body.impressionTarget !== undefined ? body.impressionTarget : slider.impressionTarget,
    },
    include: {
      items: {
        orderBy: { sortOrder: 'asc' },
      },
      sponsorVendor: { select: { id: true, name: true } },
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
  const slider = await prisma.slider.findUnique({ where: { id } })

  if (!slider || slider.tenantId !== tenant.id) {
    return NextResponse.json({ error: 'Slider not found' }, { status: 404 })
  }

  await prisma.slider.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
