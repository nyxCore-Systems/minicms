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

  const items = await prisma.menuItem.findMany({
    where: { tenantId: tenant.id },
    include: { children: { orderBy: { sortOrder: 'asc' } } },
    orderBy: { sortOrder: 'asc' },
  })

  return NextResponse.json(items)
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
  const { label, href, parentId, sortOrder, isVisible, location } = body

  if (!label || !href) {
    return NextResponse.json({ error: 'Label and href are required' }, { status: 400 })
  }

  if (parentId) {
    const parent = await prisma.menuItem.findUnique({ where: { id: parentId } })
    if (!parent || parent.tenantId !== tenant.id) {
      return NextResponse.json({ error: 'Parent menu item not found' }, { status: 404 })
    }
  }

  const item = await prisma.menuItem.create({
    data: {
      tenantId: tenant.id,
      label,
      href,
      location: location ?? 'header',
      parentId: parentId || null,
      sortOrder: sortOrder ?? 0,
      isVisible: isVisible ?? true,
    },
    include: { children: true },
  })

  return NextResponse.json(item, { status: 201 })
}
