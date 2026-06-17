import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authTenant } from '@/lib/admin-auth'
import { sanitizeStage } from '@/lib/event-validation'

async function loadStage(eventId: string, stageId: string, tenantId: string) {
  const stage = await prisma.stage.findUnique({ where: { id: stageId }, include: { event: true } })
  if (!stage || stage.eventId !== eventId || stage.event.tenantId !== tenantId) return null
  return stage
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string; stageId: string }> }) {
  const { id, stageId } = await params
  const ctx = await authTenant()
  if ('error' in ctx) return ctx.error
  if (!(await loadStage(id, stageId, ctx.tenant.id))) return NextResponse.json({ error: 'Stage not found' }, { status: 404 })

  const body = await req.json()
  const clean = sanitizeStage(body, Number(body.sortOrder) || 0)
  if (!clean) return NextResponse.json({ error: 'Name ist erforderlich' }, { status: 400 })

  const stage = await prisma.stage.update({
    where: { id: stageId },
    data: { name: clean.name, color: clean.color, sortOrder: clean.sortOrder },
  })
  return NextResponse.json(stage)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; stageId: string }> }) {
  const { id, stageId } = await params
  const ctx = await authTenant()
  if ('error' in ctx) return ctx.error
  if (!(await loadStage(id, stageId, ctx.tenant.id))) return NextResponse.json({ error: 'Stage not found' }, { status: 404 })
  await prisma.stage.delete({ where: { id: stageId } })
  return new NextResponse(null, { status: 204 })
}
