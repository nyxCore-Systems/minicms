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

export async function PUT(request: Request) {
  const token = await getSessionToken()
  if (!token || !['ADMIN', 'SUPER_ADMIN'].includes(token.role as string)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const tenant = await getTenant()
  if (!tenant) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
  }

  const body = await request.json()
  const { categories } = body

  if (!Array.isArray(categories)) {
    return NextResponse.json(
      { error: 'categories array is required' },
      { status: 400 }
    )
  }

  const ids = categories.map((c: { id: string }) => c.id)
  const existing = await prisma.productCategory.findMany({
    where: { id: { in: ids }, tenantId: tenant.id },
    select: { id: true },
  })

  if (existing.length !== ids.length) {
    return NextResponse.json(
      { error: 'One or more categories not found' },
      { status: 404 }
    )
  }

  await prisma.$transaction(
    categories.map((c: { id: string; sortOrder: number }) =>
      prisma.productCategory.update({
        where: { id: c.id },
        data: { sortOrder: c.sortOrder },
      })
    )
  )

  const updated = await prisma.productCategory.findMany({
    where: { tenantId: tenant.id },
    include: {
      children: {
        orderBy: { sortOrder: 'asc' },
        include: { _count: { select: { products: true } } },
      },
      _count: { select: { products: true } },
    },
    orderBy: { sortOrder: 'asc' },
  })

  return NextResponse.json(updated)
}
