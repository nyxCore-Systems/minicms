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
  const { sections } = body

  if (!Array.isArray(sections)) {
    return NextResponse.json({ error: 'sections array is required' }, { status: 400 })
  }

  // Verify all sections belong to this tenant
  const ids = sections.map((s: { id: string }) => s.id)
  const existing = await prisma.homepageSection.findMany({
    where: { id: { in: ids }, tenantId: tenant.id },
    select: { id: true },
  })

  if (existing.length !== ids.length) {
    return NextResponse.json({ error: 'One or more sections not found' }, { status: 404 })
  }

  // Update all sort orders in a transaction
  await prisma.$transaction(
    sections.map((s: { id: string; sortOrder: number }) =>
      prisma.homepageSection.update({
        where: { id: s.id },
        data: { sortOrder: s.sortOrder },
      })
    )
  )

  const updated = await prisma.homepageSection.findMany({
    where: { tenantId: tenant.id },
    orderBy: { sortOrder: 'asc' },
  })

  return NextResponse.json(updated)
}
