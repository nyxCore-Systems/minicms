import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { path, eventType, sessionId, eventData, referrer, userAgent } = body

    if (!path || typeof path !== 'string') {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
    }

    const tenantSlug = process.env.TENANT_SLUG || 'e-ventschau'
    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
    })

    if (!tenant) {
      return new NextResponse(null, { status: 204 })
    }

    const forwarded = request.headers.get('x-forwarded-for')
    const country = request.headers.get('x-vercel-ip-country') || undefined
    const sid =
      sessionId || forwarded?.split(',')[0]?.trim().substring(0, 100) || null

    // Event-based tracking (new format)
    if (eventType) {
      // For pageview events, also write to PageView for backwards compat
      if (eventType === 'pageview') {
        const ua =
          (eventData as Record<string, string>)?.userAgent ||
          request.headers.get('user-agent') ||
          ''
        let device = 'desktop'
        if (/mobile/i.test(ua)) device = 'mobile'
        else if (/tablet|ipad/i.test(ua)) device = 'tablet'

        await prisma.pageView.create({
          data: {
            tenantId: tenant.id,
            path: path.substring(0, 500),
            referrer:
              (eventData as Record<string, string>)?.referrer?.substring(
                0,
                500,
              ) || null,
            userAgent: ua.substring(0, 500) || null,
            country: country || null,
            device,
            sessionId: sid,
          },
        })
      }

      await prisma.trackingEvent.create({
        data: {
          tenantId: tenant.id,
          sessionId: sid,
          path: path.substring(0, 500),
          eventType: eventType.substring(0, 50),
          eventData: eventData || undefined,
        },
      })

      return new NextResponse(null, { status: 204 })
    }

    // Legacy format (no eventType) — backwards compat
    const ua = userAgent || request.headers.get('user-agent') || ''
    let device = 'desktop'
    if (/mobile/i.test(ua)) device = 'mobile'
    else if (/tablet|ipad/i.test(ua)) device = 'tablet'

    await prisma.pageView.create({
      data: {
        tenantId: tenant.id,
        path: path.substring(0, 500),
        referrer: referrer?.substring(0, 500) || null,
        userAgent: ua.substring(0, 500) || null,
        country: country || null,
        device,
        sessionId: sid,
      },
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Tracking error:', error)
    return new NextResponse(null, { status: 204 })
  }
}
