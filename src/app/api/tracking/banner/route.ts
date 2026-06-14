import { NextResponse } from 'next/server'
import { getTenant } from '@/lib/tenant'
import { recordImpression } from '@/lib/banners'

export async function POST(request: Request) {
  const tenant = await getTenant()
  if (!tenant) return new NextResponse(null, { status: 204 })

  try {
    const { adId, eventType, path, sessionId } = await request.json()
    if (!adId || !eventType || !path) return new NextResponse(null, { status: 204 })

    await recordImpression(adId, tenant.id, sessionId || null, path, eventType)
  } catch {
    // Fire-and-forget: don't fail the client
  }

  return new NextResponse(null, { status: 204 })
}
