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

  const sliders = await prisma.slider.findMany({
    where: { tenantId: tenant.id },
    include: {
      items: {
        orderBy: { sortOrder: 'asc' },
      },
      sponsorVendor: {
        select: { id: true, name: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(sliders)
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
  const { name, itemType, config, isActive,
    filterMode, filterTags, filterCategoryIds, filterVendorIds, maxItems, sortBy,
    sponsorVendorId, costPerMille, impressionTarget,
  } = body

  if (!name || !itemType) {
    return NextResponse.json(
      { error: 'name and itemType are required' },
      { status: 400 }
    )
  }

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  const slider = await prisma.slider.create({
    data: {
      tenantId: tenant.id,
      name,
      slug,
      itemType,
      config: config ?? null,
      isActive: isActive ?? true,
      filterMode: filterMode ?? 'manual',
      filterTags: filterTags ?? [],
      filterCategoryIds: filterCategoryIds ?? [],
      filterVendorIds: filterVendorIds ?? [],
      maxItems: maxItems ?? null,
      sortBy: sortBy ?? 'manual',
      sponsorVendorId: sponsorVendorId ?? null,
      costPerMille: costPerMille ?? null,
      impressionTarget: impressionTarget ?? null,
    },
    include: {
      items: true,
      sponsorVendor: {
        select: { id: true, name: true },
      },
    },
  })

  return NextResponse.json(slider, { status: 201 })
}
