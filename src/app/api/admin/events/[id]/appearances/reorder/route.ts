import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authTenant } from '@/lib/admin-auth'

// Batch-reorders an event's appearances. Body: { ids: string[] } in the desired
// order; sortOrder is rewritten 0..n in a single transaction. Rejects unless
// every id belongs to this event (which in turn belongs to the tenant).
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await authTenant()
  if ('error' in ctx) return ctx.error

  const event = await prisma.event.findUnique({ where: { id } })
  if (!event || event.tenantId !== ctx.tenant.id) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

  const body = await req.json().catch(() => null)
  const ids = Array.isArray(body?.ids) ? body.ids.map((x: unknown) => String(x)) : null
  if (!ids || ids.length === 0) return NextResponse.json({ error: 'ids fehlen' }, { status: 400 })
  if (new Set(ids).size !== ids.length) return NextResponse.json({ error: 'Doppelte IDs' }, { status: 400 })

  const owned = await prisma.appearance.count({ where: { eventId: id, id: { in: ids } } })
  if (owned !== ids.length) return NextResponse.json({ error: 'Unbekannte Slots' }, { status: 400 })

  await prisma.$transaction(
    ids.map((appId: string, i: number) =>
      prisma.appearance.update({ where: { id: appId }, data: { sortOrder: i } }),
    ),
  )
  return new NextResponse(null, { status: 204 })
}
