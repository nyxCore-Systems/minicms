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

  const pages = await prisma.page.findMany({
    where: { tenantId: tenant.id },
    orderBy: { sortOrder: 'asc' },
    include: {
      menuItems: { select: { id: true, location: true } },
      parentLinks: { select: { parentId: true } },
      childLinks: { select: { childId: true } },
    },
  })

  return NextResponse.json(pages)
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
  const { slug, title, content, metaDescription, metaKeywords, path, noIndex, ctaSource, ctaTitle, ctaSubtitle, parentIds } = body

  if (!slug || !title) {
    return NextResponse.json({ error: 'Slug and title are required' }, { status: 400 })
  }

  // Default path to /{slug} if not provided
  const pagePath = path || `/${slug}`

  // Validate path uniqueness
  const existing = await prisma.page.findFirst({
    where: { tenantId: tenant.id, path: pagePath },
  })
  if (existing) {
    return NextResponse.json({ error: 'Path already exists' }, { status: 409 })
  }

  const page = await prisma.page.create({
    data: {
      tenantId: tenant.id,
      slug,
      title,
      path: pagePath,
      content: content || '',
      metaTitle: title,
      metaDescription: metaDescription || null,
      metaKeywords: metaKeywords || null,
      noIndex: noIndex || false,
      ctaSource: ctaSource || null,
      ctaTitle: ctaTitle || null,
      ctaSubtitle: ctaSubtitle || null,
      isPublished: false,
    },
  })

  // Create parent relations
  if (Array.isArray(parentIds) && parentIds.length > 0) {
    await prisma.pageParent.createMany({
      data: parentIds.map((parentId: string, i: number) => ({
        parentId,
        childId: page.id,
        sortOrder: i,
      })),
    })
  }

  return NextResponse.json(page, { status: 201 })
}
