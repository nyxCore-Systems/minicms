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
  if (!token || !['ADMIN', 'SUPER_ADMIN'].includes(token.role as string)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const tenant = await getTenant()
  if (!tenant) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
  }

  const vendors = await prisma.vendor.findMany({
    where: { tenantId: tenant.id },
    include: {
      ads: true,
      detail: true,
      _count: { select: { ads: true, clicks: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(vendors)
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
  const { name, slug, description, category, website, email, phone, contactPerson, content, location, since, tags, logoUrl, imageUrl } = body

  if (!name || !slug) {
    return NextResponse.json({ error: 'Name and slug are required' }, { status: 400 })
  }

  const existing = await prisma.vendor.findUnique({ where: { slug } })
  if (existing) {
    return NextResponse.json({ error: 'Slug already exists' }, { status: 409 })
  }

  const vendor = await prisma.vendor.create({
    data: {
      tenantId: tenant.id,
      name,
      slug,
      description: description || null,
      category: category || 'OTHER',
      website: website || null,
      email: email || null,
      phone: phone || null,
      contactPerson: contactPerson || null,
      content: content || null,
      location: location || null,
      since: since || null,
      tags: tags || [],
      logoUrl: logoUrl || null,
      imageUrl: imageUrl || null,
    },
    include: { detail: true, _count: { select: { ads: true, clicks: true } } },
  })

  return NextResponse.json(vendor, { status: 201 })
}
