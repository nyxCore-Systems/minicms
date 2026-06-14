import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getToken } from 'next-auth/jwt'
import { prisma } from '@/lib/prisma'
import { getTenant } from '@/lib/tenant'
import { normalizeSlug, isValidSlug, safeHttpsUrl, safeCloudinaryUrl, sanitizeSocials, sanitizeGalleryItem } from '@/lib/artist-validation'

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

async function authTenant() {
  const token = await getSessionToken()
  if (!token || !['ADMIN', 'SUPER_ADMIN'].includes(token.role as string)) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  const tenant = await getTenant()
  if (!tenant) return { error: NextResponse.json({ error: 'Tenant not found' }, { status: 404 }) }
  return { token, tenant }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await authTenant()
  if ('error' in ctx) return ctx.error
  const artist = await prisma.artist.findUnique({ where: { id }, include: { media: { orderBy: { sortOrder: 'asc' } } } })
  if (!artist || artist.tenantId !== ctx.tenant.id) return NextResponse.json({ error: 'Artist not found' }, { status: 404 })
  return NextResponse.json(artist)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await authTenant()
  if ('error' in ctx) return ctx.error
  const existing = await prisma.artist.findUnique({ where: { id } })
  if (!existing || existing.tenantId !== ctx.tenant.id) return NextResponse.json({ error: 'Artist not found' }, { status: 404 })

  const body = await req.json()
  const data: Record<string, unknown> = { updatedById: (ctx.token.sub as string) || null }
  if (body.name !== undefined) data.name = String(body.name).trim()
  if (body.origin !== undefined) data.origin = body.origin ? String(body.origin) : null
  if (body.excerpt !== undefined) data.excerpt = body.excerpt ? String(body.excerpt) : null
  if (body.bio !== undefined) data.bio = body.bio ? String(body.bio) : null
  if (body.bioJson !== undefined) data.bioJson = body.bioJson ?? null
  if (body.editorMode !== undefined) data.editorMode = String(body.editorMode)
  if (body.heroImage !== undefined) data.heroImage = safeCloudinaryUrl(body.heroImage)
  if (body.website !== undefined) data.website = safeHttpsUrl(body.website)
  if (body.socials !== undefined) data.socials = sanitizeSocials(body.socials)
  if (body.metaTitle !== undefined) data.metaTitle = body.metaTitle ? String(body.metaTitle) : null
  if (body.metaDescription !== undefined) data.metaDescription = body.metaDescription ? String(body.metaDescription) : null
  if (body.isPublished !== undefined) data.isPublished = body.isPublished === true
  if (body.isActive !== undefined) data.isActive = body.isActive === true
  if (body.isFeatured !== undefined) data.isFeatured = body.isFeatured === true
  if (body.sortOrder !== undefined) data.sortOrder = Number(body.sortOrder) || 0
  if (body.genres !== undefined) {
    data.genres = Array.isArray(body.genres)
      ? body.genres.map((t: unknown) => String(t).trim()).filter(Boolean)
      : String(body.genres || '').split(',').map((t) => t.trim()).filter(Boolean)
  }
  if (body.slug !== undefined) {
    const slug = normalizeSlug(body.slug)
    if (!isValidSlug(slug)) return NextResponse.json({ error: 'Ungültiger Slug' }, { status: 400 })
    const clash = await prisma.artist.findUnique({ where: { tenantId_slug: { tenantId: ctx.tenant.id, slug } } })
    if (clash && clash.id !== id) return NextResponse.json({ error: 'Slug bereits vergeben' }, { status: 409 })
    data.slug = slug
  }

  if (Array.isArray(body.media)) {
    const clean = body.media.map((m: unknown, i: number) => sanitizeGalleryItem(m, i)).filter(Boolean) as NonNullable<ReturnType<typeof sanitizeGalleryItem>>[]
    await prisma.$transaction([
      prisma.artistMedia.deleteMany({ where: { artistId: id } }),
      prisma.artist.update({ where: { id }, data }),
      prisma.artistMedia.createMany({
        data: clean.map((m, i) => ({
          artistId: id, kind: m.kind, imageUrl: m.imageUrl ?? null, videoId: m.videoId ?? null,
          altText: m.altText ?? null, caption: m.caption ?? null, sortOrder: i,
        })),
      }),
    ])
  } else {
    await prisma.artist.update({ where: { id }, data })
  }

  const updated = await prisma.artist.findUnique({ where: { id }, include: { media: { orderBy: { sortOrder: 'asc' } } } })
  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await authTenant()
  if ('error' in ctx) return ctx.error
  const existing = await prisma.artist.findUnique({ where: { id } })
  if (!existing || existing.tenantId !== ctx.tenant.id) return NextResponse.json({ error: 'Artist not found' }, { status: 404 })
  await prisma.artist.delete({ where: { id } })
  return new NextResponse(null, { status: 204 })
}
