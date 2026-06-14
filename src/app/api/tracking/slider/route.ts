import { NextResponse } from 'next/server'
import { getTenant } from '@/lib/tenant'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  const tenant = await getTenant()
  if (!tenant) return new NextResponse(null, { status: 204 })

  try {
    const { sliderId, eventType, itemId, sessionId, path } = await request.json()
    if (!sliderId || !eventType || !path) return new NextResponse(null, { status: 204 })

    await prisma.$transaction([
      prisma.sliderImpression.create({
        data: {
          sliderId,
          tenantId: tenant.id,
          sessionId: sessionId || null,
          path,
          eventType,
          itemId: itemId || null,
        },
      }),
      prisma.slider.update({
        where: { id: sliderId },
        data: eventType === 'view'
          ? { impressions: { increment: 1 } }
          : { clicks: { increment: 1 } },
      }),
    ])
  } catch {
    // Fire-and-forget: don't fail the client
  }

  return new NextResponse(null, { status: 204 })
}
