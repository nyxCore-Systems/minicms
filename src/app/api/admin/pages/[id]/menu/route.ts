import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getToken } from 'next-auth/jwt'
import { prisma } from '@/lib/prisma'

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

  const { id } = await params
  const page = await prisma.page.findUnique({ where: { id } })
  if (!page) {
    return NextResponse.json({ error: 'Page not found' }, { status: 404 })
  }

  const body = await request.json()
  const { location, parentId, label, sortOrder } = body

  if (!location) {
    return NextResponse.json({ error: 'Location is required' }, { status: 400 })
  }

  // Check if menu item already exists for this page+location
  const existing = await prisma.menuItem.findFirst({
    where: { pageId: id, location },
  })

  if (existing) {
    const updated = await prisma.menuItem.update({
      where: { id: existing.id },
      data: {
        label: label || page.title,
        parentId: parentId || null,
        sortOrder: sortOrder ?? existing.sortOrder,
        href: page.path || `/${page.slug}`,
      },
    })
    return NextResponse.json(updated)
  }

  const menuItem = await prisma.menuItem.create({
    data: {
      tenantId: page.tenantId,
      pageId: id,
      location,
      label: label || page.title,
      href: page.path || `/${page.slug}`,
      parentId: parentId || null,
      sortOrder: sortOrder ?? 0,
    },
  })

  return NextResponse.json(menuItem, { status: 201 })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getSessionToken()
  if (!token || !['ADMIN', 'SUPER_ADMIN'].includes(token.role as string)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const { searchParams } = new URL(request.url)
  const location = searchParams.get('location')

  if (!location) {
    return NextResponse.json({ error: 'Location query param required' }, { status: 400 })
  }

  await prisma.menuItem.deleteMany({
    where: { pageId: id, location },
  })

  return NextResponse.json({ success: true })
}
