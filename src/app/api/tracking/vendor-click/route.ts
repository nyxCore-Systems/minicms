import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const ALLOWED_CLICK_TYPES = ['vendor_showcase', 'vendor_page', 'search_result', 'ai_result']

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { vendorId, clickType, path, targetUrl, sessionId } = body

    if (!vendorId || typeof vendorId !== 'string') {
      return new NextResponse(null, { status: 204 })
    }

    if (!clickType || !ALLOWED_CLICK_TYPES.includes(clickType)) {
      return new NextResponse(null, { status: 204 })
    }

    const tenantSlug = process.env.TENANT_SLUG || 'rd-dasmesser'
    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
    })

    if (!tenant) {
      return new NextResponse(null, { status: 204 })
    }

    // Verify vendor exists
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      select: { id: true },
    })

    if (!vendor) {
      return new NextResponse(null, { status: 204 })
    }

    const forwarded = request.headers.get('x-forwarded-for')
    const country = request.headers.get('x-vercel-ip-country') || undefined
    const ua = request.headers.get('user-agent') || ''
    let device = 'desktop'
    if (/mobile/i.test(ua)) device = 'mobile'
    else if (/tablet|ipad/i.test(ua)) device = 'tablet'

    const sid = sessionId || forwarded?.split(',')[0]?.trim().substring(0, 100) || null

    await prisma.vendorClick.create({
      data: {
        vendorId,
        tenantId: tenant.id,
        clickType,
        sessionId: sid,
        referrer: request.headers.get('referer')?.substring(0, 500) || null,
        userAgent: ua.substring(0, 500) || null,
        country: country || null,
        device,
        path: path?.substring(0, 500) || null,
        targetUrl: targetUrl?.substring(0, 500) || null,
      },
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Vendor click tracking error:', error)
    return new NextResponse(null, { status: 204 })
  }
}
