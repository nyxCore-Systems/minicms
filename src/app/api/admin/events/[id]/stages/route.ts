import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authTenant } from '@/lib/admin-auth'
import { sanitizeStage } from '@/lib/event-validation'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await authTenant()
  if ('error' in ctx) return ctx.error
  const event = await prisma.event.findUnique({ where: { id } })
  if (!event || event.tenantId !== ctx.tenant.id) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

  const body = await req.json()
  const clean = sanitizeStage(body, Number(body.sortOrder) || 0)
  if (!clean) return NextResponse.json({ error: 'Name ist erforderlich' }, { status: 400 })

  const stage = await prisma.stage.create({
    data: { eventId: id, name: clean.name, color: clean.color, sortOrder: clean.sortOrder },
  })
  return NextResponse.json(stage, { status: 201 })
}
