import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authTenant } from '@/lib/admin-auth'
import { submitUrls } from '@/lib/indexnow'
import {
  normalizeSlug, isValidSlug, safeHttpsUrl, safeCloudinaryUrl,
  sanitizeEventType, sanitizePriceTier,
} from '@/lib/event-validation'

const EVENT_INCLUDE = {
  stages: { orderBy: { sortOrder: 'asc' as const } },
  priceTiers: { orderBy: { sortOrder: 'asc' as const } },
  appearances: {
    include: { artist: { select: { slug: true, name: true } }, stage: true },
    orderBy: [{ startTime: 'asc' as const }, { sortOrder: 'asc' as const }],
  },
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await authTenant()
  if ('error' in ctx) return ctx.error
  const event = await prisma.event.findUnique({ where: { id }, include: EVENT_INCLUDE })
  if (!event || event.tenantId !== ctx.tenant.id) return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  return NextResponse.json(event)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await authTenant()
  if ('error' in ctx) return ctx.error
  const existing = await prisma.event.findUnique({ where: { id } })
  if (!existing || existing.tenantId !== ctx.tenant.id) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

  const body = await req.json()
  const data: Record<string, unknown> = { updatedById: (ctx.token.sub as string) || null }

  if (body.title !== undefined) data.title = String(body.title).trim()
  if (body.subtitle !== undefined) data.subtitle = body.subtitle ? String(body.subtitle) : null
  if (body.eventType !== undefined) data.eventType = sanitizeEventType(body.eventType)
  if (body.startDate !== undefined) {
    const d = new Date(String(body.startDate))
    if (isNaN(d.getTime())) return NextResponse.json({ error: 'Ungültiges Startdatum' }, { status: 400 })
    data.startDate = d
  }
  if (body.endDate !== undefined) {
    if (!body.endDate) data.endDate = null
    else {
      const d = new Date(String(body.endDate))
      if (isNaN(d.getTime())) return NextResponse.json({ error: 'Ungültiges Enddatum' }, { status: 400 })
      data.endDate = d
    }
  }
  if (body.locationName !== undefined) data.locationName = body.locationName ? String(body.locationName) : null
  if (body.locationAddress !== undefined) data.locationAddress = body.locationAddress ? String(body.locationAddress) : null
  if (body.locationUrl !== undefined) data.locationUrl = safeHttpsUrl(body.locationUrl)
  if (body.heroImage !== undefined) data.heroImage = safeCloudinaryUrl(body.heroImage)
  if (body.excerpt !== undefined) data.excerpt = body.excerpt ? String(body.excerpt) : null
  if (body.description !== undefined) data.description = body.description ? String(body.description) : null
  if (body.descriptionJson !== undefined) data.descriptionJson = Array.isArray(body.descriptionJson) ? body.descriptionJson : null
  if (body.editorMode !== undefined) {
    const mode = String(body.editorMode)
    data.editorMode = ['markdown', 'wysiwyg'].includes(mode) ? mode : 'markdown'
  }
  if (body.ticketUrl !== undefined) data.ticketUrl = safeHttpsUrl(body.ticketUrl)
  if (body.metaTitle !== undefined) data.metaTitle = body.metaTitle ? String(body.metaTitle) : null
  if (body.metaDescription !== undefined) data.metaDescription = body.metaDescription ? String(body.metaDescription) : null
  if (body.isPublished !== undefined) data.isPublished = body.isPublished === true
  if (body.isActive !== undefined) data.isActive = body.isActive === true
  if (body.isFeatured !== undefined) data.isFeatured = body.isFeatured === true
  if (body.sortOrder !== undefined) data.sortOrder = Number(body.sortOrder) || 0

  if (body.slug !== undefined) {
    const slug = normalizeSlug(body.slug)
    if (!isValidSlug(slug)) return NextResponse.json({ error: 'Ungültiger Slug' }, { status: 400 })
    const clash = await prisma.event.findUnique({ where: { tenantId_slug: { tenantId: ctx.tenant.id, slug } } })
    if (clash && clash.id !== id) return NextResponse.json({ error: 'Slug bereits vergeben' }, { status: 409 })
    data.slug = slug
  }

  if (Array.isArray(body.priceTiers)) {
    const clean = body.priceTiers
      .map((t: unknown, i: number) => sanitizePriceTier(t, i))
      .filter(Boolean) as NonNullable<ReturnType<typeof sanitizePriceTier>>[]
    await prisma.$transaction([
      prisma.priceTier.deleteMany({ where: { eventId: id } }),
      prisma.event.update({ where: { id }, data }),
      prisma.priceTier.createMany({
        data: clean.map((t, i) => ({
          eventId: id, name: t.name, description: t.description, price: t.price, currency: t.currency,
          validFrom: t.validFrom, validUntil: t.validUntil, isSoldOut: t.isSoldOut, isActive: t.isActive,
          buyUrl: t.buyUrl, sortOrder: i,
        })),
      }),
    ])
  } else {
    await prisma.event.update({ where: { id }, data })
  }

  const updated = await prisma.event.findUnique({ where: { id }, include: EVENT_INCLUDE })

  if (updated?.isPublished && updated.isActive) {
    void submitUrls([`/events/${updated.slug}`, '/events'])
  }

  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await authTenant()
  if ('error' in ctx) return ctx.error
  const existing = await prisma.event.findUnique({ where: { id } })
  if (!existing || existing.tenantId !== ctx.tenant.id) return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  await prisma.event.delete({ where: { id } })
  return new NextResponse(null, { status: 204 })
}
