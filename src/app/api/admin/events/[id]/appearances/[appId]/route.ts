import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authTenant } from '@/lib/admin-auth'
import { sanitizeAppearance } from '@/lib/event-validation'

async function loadAppearance(eventId: string, appId: string, tenantId: string) {
  const appearance = await prisma.appearance.findUnique({ where: { id: appId }, include: { event: true } })
  if (!appearance || appearance.eventId !== eventId || appearance.event.tenantId !== tenantId) return null
  return appearance
}

async function validateRefs(eventId: string, tenantId: string, stageId: string, artistId: string | null) {
  const stage = await prisma.stage.findUnique({ where: { id: stageId } })
  if (!stage || stage.eventId !== eventId) return 'Bühne gehört nicht zu diesem Event'
  if (artistId) {
    const artist = await prisma.artist.findUnique({ where: { id: artistId } })
    if (!artist || artist.tenantId !== tenantId) return 'Künstler nicht gefunden'
  }
  return null
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string; appId: string }> }) {
  const { id, appId } = await params
  const ctx = await authTenant()
  if ('error' in ctx) return ctx.error
  if (!(await loadAppearance(id, appId, ctx.tenant.id))) return NextResponse.json({ error: 'Appearance not found' }, { status: 404 })

  const body = await req.json()
  const clean = sanitizeAppearance(body, Number(body.sortOrder) || 0)
  if (!clean) return NextResponse.json({ error: 'Bühne, Startzeit und Künstler oder Titel sind erforderlich' }, { status: 400 })

  const refErr = await validateRefs(id, ctx.tenant.id, clean.stageId, clean.artistId)
  if (refErr) return NextResponse.json({ error: refErr }, { status: 400 })

  const appearance = await prisma.appearance.update({
    where: { id: appId },
    data: {
      stageId: clean.stageId, artistId: clean.artistId, title: clean.title,
      category: clean.category, startTime: clean.startTime, endTime: clean.endTime, note: clean.note, sortOrder: clean.sortOrder,
    },
  })
  return NextResponse.json(appearance)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; appId: string }> }) {
  const { id, appId } = await params
  const ctx = await authTenant()
  if ('error' in ctx) return ctx.error
  if (!(await loadAppearance(id, appId, ctx.tenant.id))) return NextResponse.json({ error: 'Appearance not found' }, { status: 404 })
  await prisma.appearance.delete({ where: { id: appId } })
  return new NextResponse(null, { status: 204 })
}
