import { NextResponse } from 'next/server'
import { getTenant } from '@/lib/tenant'
import { getActiveBanners, selectBanner, selectBannerById } from '@/lib/banners'
import type { BannerType } from '@prisma/client'

export async function GET(request: Request) {
  const tenant = await getTenant()
  if (!tenant) return NextResponse.json(null)

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') as BannerType | null
  const id = searchParams.get('id')

  let banner = null

  if (id) {
    banner = await selectBannerById(id, tenant.id)
  } else if (type) {
    const banners = await getActiveBanners(type, tenant.id)
    banner = selectBanner(banners)
  }

  return NextResponse.json(banner, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
