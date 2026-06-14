import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenant } from '@/lib/tenant'

export async function GET() {
  const tenant = await getTenant()
  if (!tenant) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
  }

  const items = await prisma.menuItem.findMany({
    where: {
      tenantId: tenant.id,
      isVisible: true,
      parentId: null,
    },
    include: {
      children: {
        where: { isVisible: true },
        orderBy: { sortOrder: 'asc' },
      },
    },
    orderBy: { sortOrder: 'asc' },
  })

  return NextResponse.json(items, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    },
  })
}
