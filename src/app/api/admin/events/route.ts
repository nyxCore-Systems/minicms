import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authTenant } from '@/lib/admin-auth'
import { getEventsForAdmin } from '@/lib/events'
import { normalizeSlug, isValidSlug, sanitizeEventType } from '@/lib/event-validation'

export async function GET() {
  const ctx = await authTenant()
  if ('error' in ctx) return ctx.error
  return NextResponse.json(await getEventsForAdmin())
}

export async function POST(req: NextRequest) {
  const ctx = await authTenant()
  if ('error' in ctx) return ctx.error

  const body = await req.json()
  const title = String(body.title || '').trim()
  let slug = normalizeSlug(body.slug || body.title || '')
  if (!title || !slug) return NextResponse.json({ error: 'Titel und Slug sind erforderlich' }, { status: 400 })
  if (!isValidSlug(slug)) return NextResponse.json({ error: 'Ungültiger Slug' }, { status: 400 })

  const startDate = body.startDate ? new Date(String(body.startDate)) : null
  if (!startDate || isNaN(startDate.getTime())) {
    return NextResponse.json({ error: 'Startdatum ist erforderlich' }, { status: 400 })
  }

  let suffix = 0
  while (await prisma.event.findUnique({ where: { tenantId_slug: { tenantId: ctx.tenant.id, slug } } })) {
    suffix += 1
    slug = `${normalizeSlug(body.slug || body.title)}-${suffix}`
  }

  const event = await prisma.event.create({
    data: {
      tenantId: ctx.tenant.id,
      title, slug,
      eventType: sanitizeEventType(body.eventType),
      startDate,
      isPublished: false,
      isActive: true,
      createdById: (ctx.token.sub as string) || null,
      updatedById: (ctx.token.sub as string) || null,
    },
  })
  return NextResponse.json(event, { status: 201 })
}
