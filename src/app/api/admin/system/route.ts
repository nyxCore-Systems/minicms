import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getToken } from 'next-auth/jwt'
import { prisma } from '@/lib/prisma'
import { getTenant } from '@/lib/tenant'
import { revalidatePath } from 'next/cache'

async function getSessionToken() {
  const cookieStore = await cookies()
  return getToken({
    req: {
      cookies: Object.fromEntries(
        cookieStore.getAll().map((c) => [c.name, c.value])
      ),
    } as any,
    secret: process.env.NEXTAUTH_SECRET,
  })
}

export async function GET() {
  const token = await getSessionToken()
  if (!token || !['ADMIN', 'SUPER_ADMIN'].includes(token.role as string)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const tenant = await getTenant()
  if (!tenant) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
  }

  const t0 = Date.now()

  // Run all DB counts in parallel
  const [
    pages,
    media,
    vendors,
    products,
    sliders,
    sliderItems,
    leads,
    sections,
    categories,
    menuItems,
    dbVersion,
  ] = await Promise.all([
    prisma.page.count({ where: { tenantId: tenant.id } }),
    prisma.media.count({ where: { tenantId: tenant.id } }),
    prisma.vendor.count({ where: { tenantId: tenant.id } }),
    prisma.product.count({ where: { tenantId: tenant.id } }),
    prisma.slider.count({ where: { tenantId: tenant.id } }),
    prisma.sliderItem.count(),
    prisma.lead.count({ where: { tenantId: tenant.id } }),
    prisma.homepageSection.count({ where: { tenantId: tenant.id } }),
    prisma.productCategory.count({ where: { tenantId: tenant.id } }),
    prisma.menuItem.count({ where: { tenantId: tenant.id } }),
    prisma.$queryRaw<[{ version: string }]>`SELECT version()`.then(
      (r) => r[0]?.version || 'unknown'
    ),
  ])

  const dbLatency = Date.now() - t0

  return NextResponse.json({
    tenant: { id: tenant.id, slug: tenant.slug, name: tenant.name },
    db: {
      latencyMs: dbLatency,
      version: dbVersion,
      counts: {
        pages,
        media,
        vendors,
        products,
        sliders,
        sliderItems,
        leads,
        sections,
        categories,
        menuItems,
      },
    },
    env: {
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV || null,
      region: process.env.VERCEL_REGION || null,
      gitSha: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || null,
      gitBranch: process.env.VERCEL_GIT_COMMIT_REF || null,
    },
    cache: {
      sliderApiMaxAge: 60,
      staleWhileRevalidate: 120,
      note: 'Slider API uses s-maxage=60, stale-while-revalidate=120',
    },
    timestamp: new Date().toISOString(),
  })
}

export async function POST(request: Request) {
  const token = await getSessionToken()
  if (!token || !['ADMIN', 'SUPER_ADMIN'].includes(token.role as string)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { action, path } = body

  if (action === 'revalidate') {
    // Purge Next.js data cache for a specific path or all paths
    const targetPath = path || '/'
    revalidatePath(targetPath, 'layout')
    return NextResponse.json({
      success: true,
      message: `Revalidated: ${targetPath}`,
      timestamp: new Date().toISOString(),
    })
  }

  if (action === 'revalidate_all') {
    // Purge everything
    revalidatePath('/', 'layout')
    revalidatePath('/api/sliders', 'page')
    revalidatePath('/api/banners', 'page')
    revalidatePath('/api/menu', 'page')
    revalidatePath('/api/products', 'page')
    return NextResponse.json({
      success: true,
      message: 'All caches revalidated',
      timestamp: new Date().toISOString(),
    })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
