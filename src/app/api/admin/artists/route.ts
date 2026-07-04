import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getToken } from 'next-auth/jwt'
import { prisma } from '@/lib/prisma'
import { getTenant } from '@/lib/tenant'
import { normalizeSlug, isValidSlug, safeHttpsUrl, safeCloudinaryUrl, sanitizeSocials } from '@/lib/artist-validation'
import { getArtistsForAdmin } from '@/lib/artists'
import { submitUrls } from '@/lib/indexnow'

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
  return NextResponse.json(await getArtistsForAdmin())
}

export async function POST(req: NextRequest) {
  const token = await getSessionToken()
  if (!token || !['ADMIN', 'SUPER_ADMIN'].includes(token.role as string)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const tenant = await getTenant()
  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

  const body = await req.json()
  const name = String(body.name || '').trim()
  let slug = normalizeSlug(body.slug || body.name || '')
  if (!name || !slug) return NextResponse.json({ error: 'Name und Slug sind erforderlich' }, { status: 400 })
  if (!isValidSlug(slug)) return NextResponse.json({ error: 'Ungültiger Slug' }, { status: 400 })

  let suffix = 0
  while (await prisma.artist.findUnique({ where: { tenantId_slug: { tenantId: tenant.id, slug } } })) {
    suffix += 1
    slug = `${normalizeSlug(body.slug || body.name)}-${suffix}`
  }

  const genres = Array.isArray(body.genres)
    ? body.genres.map((t: unknown) => String(t).trim()).filter(Boolean)
    : String(body.genres || '').split(',').map((t) => t.trim()).filter(Boolean)

  const artist = await prisma.artist.create({
    data: {
      tenantId: tenant.id, name, slug,
      origin: body.origin ? String(body.origin) : null,
      genres,
      excerpt: body.excerpt ? String(body.excerpt) : null,
      heroImage: safeCloudinaryUrl(body.heroImage),
      website: safeHttpsUrl(body.website),
      socials: sanitizeSocials(body.socials),
      isPublished: body.isPublished === true,
      isFeatured: body.isFeatured === true,
      createdById: (token.sub as string) || null,
      updatedById: (token.sub as string) || null,
    },
  })
  // A newly created artist can be published immediately (unlike pages/events,
  // which are created as drafts and pinged on the publish PUT). Best-effort;
  // no-ops off-prod and never throws.
  if (artist.isPublished && artist.isActive) {
    void submitUrls([`/kuenstler/${artist.slug}`, '/kuenstler'])
  }
  return NextResponse.json(artist, { status: 201 })
}
