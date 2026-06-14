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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getSessionToken()
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const item = await prisma.menuItem.findUnique({
    where: { id },
    include: { children: { orderBy: { sortOrder: 'asc' } } },
  })

  if (!item) {
    return NextResponse.json({ error: 'Menu item not found' }, { status: 404 })
  }

  return NextResponse.json(item)
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getSessionToken()
  if (!token || !['ADMIN', 'SUPER_ADMIN'].includes(token.role as string)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const item = await prisma.menuItem.findUnique({ where: { id } })

  if (!item) {
    return NextResponse.json({ error: 'Menu item not found' }, { status: 404 })
  }

  const body = await request.json()

  const updated = await prisma.menuItem.update({
    where: { id },
    data: {
      label: body.label ?? item.label,
      href: body.href ?? item.href,
      parentId: body.parentId !== undefined ? body.parentId : item.parentId,
      sortOrder: body.sortOrder !== undefined ? body.sortOrder : item.sortOrder,
      isVisible: body.isVisible !== undefined ? body.isVisible : item.isVisible,
    },
    include: { children: { orderBy: { sortOrder: 'asc' } } },
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

  const { id } = await params
  const item = await prisma.menuItem.findUnique({ where: { id } })

  if (!item) {
    return NextResponse.json({ error: 'Menu item not found' }, { status: 404 })
  }

  // Cascade delete is handled by the schema relation (onDelete: Cascade)
  await prisma.menuItem.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
