# Künstler-Modul (Artist Module) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an Artist module (profiles, public `/kuenstler` pages, media gallery, admin CRUD, slider integration) mirroring the existing Vendor pattern.

**Architecture:** Dedicated `Artist` + `ArtistMedia` Prisma models, tenant-scoped. Public pages render a markdown bio via the existing safe `MarkdownContent` pipeline (no raw HTML). Admin mirrors the Vendor module: minimal `new` create form → redirect to a rich `[id]` edit form (Plate bio + gallery + socials). Slider gains an `ARTIST` type.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Prisma 6 (Neon Postgres), NextAuth 4 (JWT), react-markdown v9, swiper v12, Tailwind 3.4 (liquid-glass). **No test framework** — verification is `npm run build` (type-check + `prisma generate`), `npm run lint`, route smoke-tests, and a manual CRUD roundtrip.

**Spec:** `docs/superpowers/specs/2026-06-14-e-ventschau-artist-module-design.md`

**Working dir:** `/Users/oliverbaer/Projects/minicms` (all paths below relative to it). ⚠️ Prisma reads `.env`, Next.js reads `.env.local`.

---

## File Structure

| File | Responsibility |
|---|---|
| `prisma/schema.prisma` (modify) | `Artist`, `ArtistMedia` models; `SliderItemType` +`ARTIST`; `SliderItem.artistId`; back-relations |
| `src/lib/artist-validation.ts` (create) | Security validators: slug, https-URL, socials array, video-ID parse, Cloudinary host |
| `src/lib/artists.ts` (create) | Tenant-scoped data access: `getPublishedArtists`, `getPublishedArtistBySlug`, `getArtistsForAdmin` |
| `src/app/api/admin/artists/route.ts` (create) | `GET` list, `POST` create (auth, role, field allowlist, scoped slug) |
| `src/app/api/admin/artists/[id]/route.ts` (create) | `GET`/`PUT`/`DELETE` (IDOR check, field allowlist) |
| `src/lib/seo.ts` (modify) | `buildArtistJsonLd` (`MusicGroup`) |
| `src/components/artists/SocialLinks.tsx` (create) | External profile links, https-safe |
| `src/components/artists/ArtistGallery.tsx` (create) | Image grid + YouTube/Vimeo embeds, accessible lightbox |
| `src/components/artists/ArtistCard.tsx` (create) | grid/list/carousel summary card |
| `src/app/(public)/kuenstler/page.tsx` (create) | Public index |
| `src/app/(public)/kuenstler/[slug]/page.tsx` (create) | Public detail + metadata + JsonLd |
| `src/app/admin/artists/page.tsx` (create) | Admin list (client, glass-card grid, toggles) |
| `src/app/admin/artists/new/page.tsx` (create) | Minimal create form → redirect to `[id]` |
| `src/app/admin/artists/[id]/page.tsx` (create) | Rich edit form (Plate bio, gallery, socials, SEO) |
| `src/components/admin/AdminNav.tsx` (modify) | Add "Künstler" nav entry |
| `src/app/api/sliders/route.ts` (modify) | `ARTIST` auto + manual slider items |
| `src/app/admin/sliders/page.tsx` (modify) | Add `ARTIST` to `ItemType` union + picker UI |
| `src/app/sitemap.ts` (modify) | Add published artist URLs |
| `src/app/(public)/page.tsx` (modify) | Link homepage line-up to `/kuenstler/[slug]` |
| `prisma/seed.ts` (modify) | Seed 7 line-up bands + "Künstler" menu item |

---

## Task 1: Prisma schema — Artist, ArtistMedia, Slider ARTIST

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add `ARTIST` to the SliderItemType enum**

Find (`schema.prisma:36-41`):
```prisma
enum SliderItemType {
  PAGE
  PRODUCT
  VENDOR
  MEDIA
}
```
Replace the body to add `ARTIST` as the last value:
```prisma
enum SliderItemType {
  PAGE
  PRODUCT
  VENDOR
  MEDIA
  ARTIST
}
```

- [ ] **Step 2: Add the `artistId` column + relation to `SliderItem`**

In `model SliderItem` (around `schema.prisma:519-543`), add the field next to `productId` and the relation next to `product`:
```prisma
  artistId   String?
```
```prisma
  artist  Artist?  @relation(fields: [artistId], references: [id], onDelete: SetNull)
```

- [ ] **Step 3: Add the back-relations to `Tenant` and `Media`**

In `model Tenant` relations block (after `pageVersions PageVersion[]`, ~line 72):
```prisma
  artists            Artist[]
```
In `model Media` relations block (after `sliderItems SliderItem[]`, ~line 450):
```prisma
  artistMedia ArtistMedia[]
```

- [ ] **Step 4: Append the `Artist` and `ArtistMedia` models**

Add at the end of `prisma/schema.prisma`:
```prisma
model Artist {
  id              String   @id @default(cuid())
  tenantId        String
  slug            String
  name            String
  origin          String?
  genres          String[]
  heroImage       String?
  excerpt         String?  @db.Text
  bio             String?  @db.Text
  bioJson         Json?
  editorMode      String?  @default("markdown")
  website         String?
  socials         Json?
  metaTitle       String?
  metaDescription String?  @db.Text
  isActive        Boolean  @default(true)
  isFeatured      Boolean  @default(false)
  isPublished     Boolean  @default(false)
  sortOrder       Int      @default(0)
  createdById     String?
  updatedById     String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  tenant      Tenant        @relation(fields: [tenantId], references: [id])
  media       ArtistMedia[]
  sliderItems SliderItem[]

  @@unique([tenantId, slug])
  @@index([tenantId])
  @@index([genres])
}

model ArtistMedia {
  id        String  @id @default(cuid())
  artistId  String
  kind      String  @default("image")
  mediaId   String?
  imageUrl  String?
  videoId   String?
  altText   String?
  caption   String?
  sortOrder Int     @default(0)

  artist Artist @relation(fields: [artistId], references: [id], onDelete: Cascade)
  media  Media? @relation(fields: [mediaId], references: [id], onDelete: SetNull)

  @@index([artistId])
}
```

- [ ] **Step 5: Push schema + regenerate client**

Run: `npm run db:push && npx prisma generate`
Expected: "Your database is now in sync with your Prisma schema." and "Generated Prisma Client". (If `db:push` errors on missing `DATABASE_URL`, confirm `.env` has it.)

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(artist): add Artist + ArtistMedia models and Slider ARTIST type"
```

---

## Task 2: Input validation helpers

**Files:**
- Create: `src/lib/artist-validation.ts`

These are the security-critical validators from the spec (§9). Used by both API routes.

- [ ] **Step 1: Create `src/lib/artist-validation.ts`**

```ts
// Security validators for artist input (see spec §9).

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** Normalize a candidate slug to the allowed shape. Returns '' if nothing usable. */
export function normalizeSlug(input: string): string {
  return (input || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96)
}

export function isValidSlug(slug: string): boolean {
  return !!slug && slug.length <= 96 && SLUG_RE.test(slug)
}

/** Allow only https (and mailto) absolute URLs. Returns the cleaned URL or null. */
export function safeHttpsUrl(input: unknown): string | null {
  if (typeof input !== 'string' || !input.trim()) return null
  try {
    const u = new URL(input.trim())
    if (u.protocol === 'https:' || u.protocol === 'mailto:') return u.toString()
    return null
  } catch {
    return null
  }
}

/** Only allow Cloudinary-hosted image URLs (matches next.config remotePatterns origin). */
export function safeCloudinaryUrl(input: unknown): string | null {
  const url = safeHttpsUrl(input)
  if (!url) return null
  try {
    return new URL(url).hostname === 'res.cloudinary.com' ? url : null
  } catch {
    return null
  }
}

export type SocialLink = { platform: string; url: string }

const ALLOWED_PLATFORMS = ['instagram', 'facebook', 'youtube', 'tiktok', 'spotify', 'website', 'bandcamp', 'soundcloud']

/** Validate a socials array; drops entries with bad scheme or unknown platform. */
export function sanitizeSocials(input: unknown): SocialLink[] {
  if (!Array.isArray(input)) return []
  const out: SocialLink[] = []
  for (const entry of input) {
    if (!entry || typeof entry !== 'object') continue
    const platform = String((entry as Record<string, unknown>).platform || '').toLowerCase().trim()
    const url = safeHttpsUrl((entry as Record<string, unknown>).url)
    if (!url || !ALLOWED_PLATFORMS.includes(platform)) continue
    out.push({ platform, url })
  }
  return out
}

const YT_ID_RE = /^[A-Za-z0-9_-]{11}$/
const VIMEO_ID_RE = /^\d+$/

/** Parse a YouTube URL or bare ID into a validated 11-char video ID, or null. */
export function parseYouTubeId(input: string): string | null {
  if (!input) return null
  if (YT_ID_RE.test(input)) return input
  try {
    const u = new URL(input)
    const host = u.hostname.replace(/^www\./, '')
    let id = ''
    if (host === 'youtu.be') id = u.pathname.slice(1)
    else if (host.endsWith('youtube.com')) id = u.searchParams.get('v') || u.pathname.split('/').pop() || ''
    return YT_ID_RE.test(id) ? id : null
  } catch {
    return null
  }
}

/** Parse a Vimeo URL or bare numeric ID into a validated ID, or null. */
export function parseVimeoId(input: string): string | null {
  if (!input) return null
  if (VIMEO_ID_RE.test(input)) return input
  try {
    const u = new URL(input)
    const id = u.pathname.split('/').filter(Boolean).pop() || ''
    return VIMEO_ID_RE.test(id) ? id : null
  } catch {
    return null
  }
}

export type GalleryInput = {
  kind: 'image' | 'youtube' | 'vimeo'
  imageUrl?: string | null
  videoId?: string | null
  altText?: string | null
  caption?: string | null
  sortOrder?: number
}

/** Validate one gallery item; returns a clean record or null to drop it. */
export function sanitizeGalleryItem(raw: unknown, index: number): GalleryInput | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const kind = String(r.kind || 'image')
  const altText = r.altText ? String(r.altText).slice(0, 300) : null
  const caption = r.caption ? String(r.caption).slice(0, 500) : null
  const sortOrder = Number.isFinite(Number(r.sortOrder)) ? Number(r.sortOrder) : index
  if (kind === 'image') {
    const imageUrl = safeCloudinaryUrl(r.imageUrl)
    if (!imageUrl) return null
    return { kind: 'image', imageUrl, altText, caption, sortOrder }
  }
  if (kind === 'youtube') {
    const videoId = parseYouTubeId(String(r.videoId ?? r.imageUrl ?? ''))
    if (!videoId) return null
    return { kind: 'youtube', videoId, altText, caption, sortOrder }
  }
  if (kind === 'vimeo') {
    const videoId = parseVimeoId(String(r.videoId ?? r.imageUrl ?? ''))
    if (!videoId) return null
    return { kind: 'vimeo', videoId, altText, caption, sortOrder }
  }
  return null
}
```

- [ ] **Step 2: Verify it compiles (lint)**

Run: `npm run lint`
Expected: no errors for `src/lib/artist-validation.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/artist-validation.ts
git commit -m "feat(artist): add input validation helpers"
```

---

## Task 3: Data access layer

**Files:**
- Create: `src/lib/artists.ts`

Mirrors `src/lib/markdown.ts` (tenant-scoped, try/catch → null).

- [ ] **Step 1: Create `src/lib/artists.ts`**

```ts
import { prisma } from '@/lib/prisma'
import { getTenant } from '@/lib/tenant'
import type { Artist, ArtistMedia } from '@prisma/client'

export type ArtistWithMedia = Artist & { media: ArtistMedia[] }

/** Published + active artists for public listing. Deterministic order. */
export async function getPublishedArtists(): Promise<ArtistWithMedia[]> {
  try {
    const tenant = await getTenant()
    if (!tenant) return []
    return await prisma.artist.findMany({
      where: { tenantId: tenant.id, isPublished: true, isActive: true },
      include: { media: { orderBy: { sortOrder: 'asc' } } },
      orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    })
  } catch (e) {
    console.error('getPublishedArtists failed', e)
    return []
  }
}

/** One published artist by slug, or null (draft/unknown). */
export async function getPublishedArtistBySlug(slug: string): Promise<ArtistWithMedia | null> {
  try {
    const tenant = await getTenant()
    if (!tenant) return null
    const artist = await prisma.artist.findUnique({
      where: { tenantId_slug: { tenantId: tenant.id, slug } },
      include: { media: { orderBy: { sortOrder: 'asc' } } },
    })
    if (!artist || !artist.isPublished || !artist.isActive) return null
    return artist
  } catch (e) {
    console.error('getPublishedArtistBySlug failed', e)
    return null
  }
}

/** All artists for the current tenant (admin). */
export async function getArtistsForAdmin() {
  const tenant = await getTenant()
  if (!tenant) return []
  return prisma.artist.findMany({
    where: { tenantId: tenant.id },
    include: { _count: { select: { media: true } } },
    orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }, { name: 'asc' }],
  })
}
```

- [ ] **Step 2: Verify the prisma import path**

Run: `grep -rn "from '@/lib/prisma'" src/lib/markdown.ts || grep -rn "import { prisma }" src/lib/markdown.ts`
Expected: confirms the import style. If `markdown.ts` imports prisma differently (e.g. `import prisma from '@/lib/prisma'`), match that exact style in `artists.ts`.

- [ ] **Step 3: Build + commit**

Run: `npm run build`
Expected: compiles (Prisma types `Artist`/`ArtistMedia` now exist from Task 1).
```bash
git add src/lib/artists.ts
git commit -m "feat(artist): add tenant-scoped data access layer"
```

---

## Task 4: Admin API — list + create

**Files:**
- Create: `src/app/api/admin/artists/route.ts`

Replicates the auth/role/tenant pattern from `src/app/api/admin/vendors/route.ts` verbatim, with **scoped** slug uniqueness (not Vendor's global bug) and an explicit field allowlist.

- [ ] **Step 1: Create `src/app/api/admin/artists/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getToken } from 'next-auth/jwt'
import { prisma } from '@/lib/prisma'
import { getTenant } from '@/lib/tenant'
import {
  normalizeSlug, isValidSlug, safeHttpsUrl, safeCloudinaryUrl, sanitizeSocials,
} from '@/lib/artist-validation'

async function getSessionToken() {
  const cookieStore = await cookies()
  const req = { cookies: Object.fromEntries(cookieStore.getAll().map((c) => [c.name, c.value])) } as never
  return getToken({ req, secret: process.env.NEXTAUTH_SECRET })
}

export async function GET() {
  const token = await getSessionToken()
  if (!token || !['ADMIN', 'SUPER_ADMIN'].includes(token.role as string)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const tenant = await getTenant()
  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

  const artists = await prisma.artist.findMany({
    where: { tenantId: tenant.id },
    include: { _count: { select: { media: true } } },
    orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }, { name: 'asc' }],
  })
  return NextResponse.json(artists)
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
  if (!name || !slug) {
    return NextResponse.json({ error: 'Name und Slug sind erforderlich' }, { status: 400 })
  }
  if (!isValidSlug(slug)) {
    return NextResponse.json({ error: 'Ungültiger Slug' }, { status: 400 })
  }

  // Scoped uniqueness with auto-suffix on collision.
  let suffix = 0
  while (
    await prisma.artist.findUnique({ where: { tenantId_slug: { tenantId: tenant.id, slug } } })
  ) {
    suffix += 1
    slug = `${normalizeSlug(body.slug || body.name)}-${suffix}`
  }

  const genres = Array.isArray(body.genres)
    ? body.genres.map((t: unknown) => String(t).trim()).filter(Boolean)
    : String(body.genres || '').split(',').map((t) => t.trim()).filter(Boolean)

  const artist = await prisma.artist.create({
    data: {
      tenantId: tenant.id,
      name,
      slug,
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
  return NextResponse.json(artist, { status: 201 })
}
```

- [ ] **Step 2: Confirm the `getSessionToken` helper matches the vendor route**

Run: `sed -n '1,30p' src/app/api/admin/vendors/route.ts`
Expected: same imports + `getSessionToken` shape. If the vendor helper differs (e.g. uses `headers()` differently), copy its exact implementation into the artist route to stay consistent.

- [ ] **Step 3: Build + smoke test (unauthorized path)**

Run: `npm run build` then start dev (`npm run dev`) in another shell and:
`curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/admin/artists`
Expected: `401` (no session cookie).

- [ ] **Step 4: Commit**

```bash
git add src/app/api/admin/artists/route.ts
git commit -m "feat(artist): admin API list + create with scoped slug + validation"
```

---

## Task 5: Admin API — single artist GET/PUT/DELETE

**Files:**
- Create: `src/app/api/admin/artists/[id]/route.ts`

Replicates the IDOR check from `vendors/[id]/route.ts` (`findUnique` then reject on `tenantId` mismatch). Field allowlist on PUT; gallery + socials sanitized. Bio stored as markdown + bioJson (Plate value), exactly like Pages.

- [ ] **Step 1: Create `src/app/api/admin/artists/[id]/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getToken } from 'next-auth/jwt'
import { prisma } from '@/lib/prisma'
import { getTenant } from '@/lib/tenant'
import {
  normalizeSlug, isValidSlug, safeHttpsUrl, safeCloudinaryUrl,
  sanitizeSocials, sanitizeGalleryItem,
} from '@/lib/artist-validation'

async function getSessionToken() {
  const cookieStore = await cookies()
  const req = { cookies: Object.fromEntries(cookieStore.getAll().map((c) => [c.name, c.value])) } as never
  return getToken({ req, secret: process.env.NEXTAUTH_SECRET })
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
  if (!artist || artist.tenantId !== ctx.tenant.id) {
    return NextResponse.json({ error: 'Artist not found' }, { status: 404 })
  }
  return NextResponse.json(artist)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await authTenant()
  if ('error' in ctx) return ctx.error

  const existing = await prisma.artist.findUnique({ where: { id } })
  if (!existing || existing.tenantId !== ctx.tenant.id) {
    return NextResponse.json({ error: 'Artist not found' }, { status: 404 })
  }

  const body = await req.json()

  // Explicit field allowlist — never spread raw body.
  const data: Record<string, unknown> = {
    updatedById: (ctx.token.sub as string) || null,
  }
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
  if (Array.isArray(body.genres)) {
    data.genres = body.genres.map((t: unknown) => String(t).trim()).filter(Boolean)
  }
  if (body.slug !== undefined) {
    const slug = normalizeSlug(body.slug)
    if (!isValidSlug(slug)) return NextResponse.json({ error: 'Ungültiger Slug' }, { status: 400 })
    const clash = await prisma.artist.findUnique({ where: { tenantId_slug: { tenantId: ctx.tenant.id, slug } } })
    if (clash && clash.id !== id) return NextResponse.json({ error: 'Slug bereits vergeben' }, { status: 409 })
    data.slug = slug
  }

  // Replace gallery if provided.
  if (Array.isArray(body.media)) {
    const clean = body.media
      .map((m: unknown, i: number) => sanitizeGalleryItem(m, i))
      .filter(Boolean) as ReturnType<typeof sanitizeGalleryItem>[]
    await prisma.$transaction([
      prisma.artistMedia.deleteMany({ where: { artistId: id } }),
      prisma.artist.update({ where: { id }, data }),
      prisma.artistMedia.createMany({
        data: clean.map((m) => ({
          artistId: id,
          kind: m!.kind,
          imageUrl: m!.imageUrl ?? null,
          videoId: m!.videoId ?? null,
          altText: m!.altText ?? null,
          caption: m!.caption ?? null,
          sortOrder: m!.sortOrder ?? 0,
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
  if (!existing || existing.tenantId !== ctx.tenant.id) {
    return NextResponse.json({ error: 'Artist not found' }, { status: 404 })
  }
  await prisma.artist.delete({ where: { id } })
  return new NextResponse(null, { status: 204 })
}
```

- [ ] **Step 2: Build + smoke test (unauthorized)**

Run: `npm run build`, then with dev running:
`curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/admin/artists/nonexistent`
Expected: `401`.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/admin/artists/[id]/route.ts
git commit -m "feat(artist): admin API GET/PUT/DELETE with IDOR check + field allowlist"
```

---

## Task 6: SEO — artist JSON-LD

**Files:**
- Modify: `src/lib/seo.ts`

- [ ] **Step 1: Add `buildArtistJsonLd` near `buildVendorJsonLd`**

Open `src/lib/seo.ts`, find `buildVendorJsonLd` (~line 96) and add below it (use `SITE_URL` exactly as the existing helpers do):
```ts
export function buildArtistJsonLd(artist: {
  name: string
  slug: string
  origin?: string | null
  genres?: string[]
  heroImage?: string | null
  excerpt?: string | null
  socials?: { platform: string; url: string }[] | null
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'MusicGroup',
    name: artist.name,
    url: `${SITE_URL}/kuenstler/${artist.slug}`,
    ...(artist.genres?.length ? { genre: artist.genres } : {}),
    ...(artist.heroImage ? { image: artist.heroImage } : {}),
    ...(artist.excerpt ? { description: artist.excerpt } : {}),
    ...(artist.origin ? { foundingLocation: artist.origin } : {}),
    ...(artist.socials?.length ? { sameAs: artist.socials.map((s) => s.url) } : {}),
  }
}
```

- [ ] **Step 2: Confirm `SITE_URL` is in scope**

Run: `grep -n "SITE_URL" src/lib/seo.ts | head -3`
Expected: `SITE_URL` is defined/imported at top of the file (used by `websiteJsonLd`). If it's a local const, the new function already has access.

- [ ] **Step 3: Lint + commit**

Run: `npm run lint`
```bash
git add src/lib/seo.ts
git commit -m "feat(artist): add MusicGroup JSON-LD builder"
```

---

## Task 7: Public components — SocialLinks, ArtistGallery, ArtistCard

**Files:**
- Create: `src/components/artists/SocialLinks.tsx`
- Create: `src/components/artists/ArtistGallery.tsx`
- Create: `src/components/artists/ArtistCard.tsx`

- [ ] **Step 1: Create `src/components/artists/SocialLinks.tsx`**

```tsx
type SocialLink = { platform: string; url: string; label?: string }

const PLATFORM_LABELS: Record<string, string> = {
  instagram: 'Instagram', facebook: 'Facebook', youtube: 'YouTube', tiktok: 'TikTok',
  spotify: 'Spotify', bandcamp: 'Bandcamp', soundcloud: 'SoundCloud', website: 'Website',
}

export default function SocialLinks({
  links, variant = 'labeled',
}: { links: SocialLink[]; variant?: 'icon' | 'labeled' }) {
  if (!links?.length) return null
  return (
    <ul className="flex flex-wrap gap-3" aria-label="Social-Media-Links">
      {links.map((l) => {
        const label = l.label || PLATFORM_LABELS[l.platform] || l.platform
        return (
          <li key={`${l.platform}-${l.url}`}>
            <a
              href={l.url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              aria-label={label}
              className="glass-card inline-flex items-center gap-2 rounded-pill px-4 py-2 text-sm text-brand-text transition-all hover:shadow-card-hover"
            >
              {variant === 'labeled' ? label : <span aria-hidden="true">{label[0]}</span>}
            </a>
          </li>
        )
      })}
    </ul>
  )
}
```

- [ ] **Step 2: Create `src/components/artists/ArtistGallery.tsx`**

Uses a focus-trapped dialog for image zoom (spec §10). Video embeds use the locked-down nocookie/player hosts.
```tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'

type GalleryItem = {
  id: string
  kind: string
  imageUrl?: string | null
  videoId?: string | null
  altText?: string | null
  caption?: string | null
}

function embedSrc(item: GalleryItem): string | null {
  if (item.kind === 'youtube' && item.videoId) return `https://www.youtube-nocookie.com/embed/${item.videoId}`
  if (item.kind === 'vimeo' && item.videoId) return `https://player.vimeo.com/video/${item.videoId}`
  return null
}

export default function ArtistGallery({ items, artistName }: { items: GalleryItem[]; artistName: string }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)

  const images = items.filter((i) => i.kind === 'image' && i.imageUrl)

  useEffect(() => {
    if (lightboxIndex === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
      if (e.key === 'ArrowRight') setLightboxIndex((i) => (i === null ? i : (i + 1) % images.length))
      if (e.key === 'ArrowLeft') setLightboxIndex((i) => (i === null ? i : (i - 1 + images.length) % images.length))
    }
    document.addEventListener('keydown', onKey)
    dialogRef.current?.focus()
    return () => document.removeEventListener('keydown', onKey)
  }, [lightboxIndex, images.length])

  function close() {
    setLightboxIndex(null)
    triggerRef.current?.focus()
  }

  if (!items.length) return null

  return (
    <div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {items.map((item, idx) => {
          const src = embedSrc(item)
          if (src) {
            return (
              <div key={item.id} className="aspect-video overflow-hidden rounded-section glass-card">
                <iframe
                  src={src}
                  title={item.altText || `${artistName} – Video`}
                  loading="lazy"
                  allow="accelerometer; clipboard-write; encrypted-media; picture-in-picture"
                  allowFullScreen
                  className="h-full w-full"
                />
              </div>
            )
          }
          if (item.kind === 'image' && item.imageUrl) {
            const imageIndex = images.findIndex((i) => i.id === item.id)
            return (
              <button
                key={item.id}
                ref={imageIndex === 0 ? triggerRef : undefined}
                onClick={() => setLightboxIndex(imageIndex)}
                className="aspect-square overflow-hidden rounded-section glass-card"
                aria-label={`${item.altText || artistName} vergrößern`}
              >
                <Image
                  src={item.imageUrl}
                  alt={item.altText || `${artistName} (${idx + 1})`}
                  width={600}
                  height={600}
                  className="h-full w-full object-cover"
                />
              </button>
            )
          }
          return null
        })}
      </div>

      {lightboxIndex !== null && images[lightboxIndex] && (
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label={`${artistName} – Bild ${lightboxIndex + 1} von ${images.length}`}
          tabIndex={-1}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={close}
        >
          <Image
            src={images[lightboxIndex].imageUrl as string}
            alt={images[lightboxIndex].altText || artistName}
            width={1200}
            height={1200}
            className="max-h-[90vh] w-auto object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button onClick={close} className="absolute right-4 top-4 text-white" aria-label="Schließen">✕</button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Create `src/components/artists/ArtistCard.tsx`**

```tsx
import Link from 'next/link'
import Image from 'next/image'

export type ArtistSummary = {
  slug: string
  name: string
  origin?: string | null
  genres?: string[]
  heroImage?: string | null
  excerpt?: string | null
  isFeatured?: boolean
}

export default function ArtistCard({
  artist, variant = 'grid', priority = false,
}: { artist: ArtistSummary; variant?: 'grid' | 'list' | 'carousel'; priority?: boolean }) {
  const isList = variant === 'list'
  return (
    <Link
      href={`/kuenstler/${artist.slug}`}
      className={`glass-card group block overflow-hidden rounded-section transition-all hover:shadow-card-hover ${isList ? 'flex items-center gap-4' : ''}`}
    >
      <div className={isList ? 'h-24 w-24 flex-shrink-0 overflow-hidden' : 'aspect-[4/3] w-full overflow-hidden'}>
        {artist.heroImage ? (
          <Image
            src={artist.heroImage}
            alt={artist.name}
            width={600}
            height={450}
            priority={priority}
            className="h-full w-full object-cover transition-transform duration-300 motion-safe:group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-brand-primary/10 text-brand-primary">♪</div>
        )}
      </div>
      <div className="p-5">
        {artist.origin && <p className="text-xs font-semibold uppercase tracking-wider text-brand-accent">{artist.origin}</p>}
        <h3 className="mt-1 font-display text-xl font-bold leading-snug text-brand-text">{artist.name}</h3>
        {artist.isFeatured && (
          <span className="mt-1 inline-block rounded-pill bg-brand-accent/10 px-2 py-0.5 text-xs font-medium text-brand-accent">Headliner</span>
        )}
        {artist.genres?.length ? (
          <p className="mt-2 text-sm text-brand-text-muted">{artist.genres.join(' · ')}</p>
        ) : null}
      </div>
    </Link>
  )
}
```

- [ ] **Step 4: Lint + build + commit**

Run: `npm run lint && npm run build`
Expected: compiles. (`motion-safe:` is the Tailwind reduced-motion guard from spec §10.)
```bash
git add src/components/artists/
git commit -m "feat(artist): public components — SocialLinks, ArtistGallery, ArtistCard"
```

---

## Task 8: Public index page `/kuenstler`

**Files:**
- Create: `src/app/(public)/kuenstler/page.tsx`

- [ ] **Step 1: Create `src/app/(public)/kuenstler/page.tsx`**

```tsx
import type { Metadata } from 'next'
import { getPublishedArtists } from '@/lib/artists'
import { buildMetadata } from '@/lib/seo'
import ArtistCard from '@/components/artists/ArtistCard'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata(null, '/kuenstler', {
    title: 'Künstler:innen – e-Ventschau',
    description: 'Alle Bands und Acts des e-Ventschau-Benefiz-Festivals.',
  })
}

export default async function ArtistIndexPage() {
  const artists = await getPublishedArtists()
  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
      <header className="mb-10 text-center">
        <h1 className="font-display text-4xl font-bold text-brand-text sm:text-5xl">Künstler:innen</h1>
        <p className="mt-3 text-brand-text-muted">Die Acts des e-Ventschau-Festivals.</p>
      </header>

      {artists.length === 0 ? (
        <p className="text-center text-brand-text-muted">Noch keine Künstler:innen veröffentlicht.</p>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {artists.map((a, i) => (
            <ArtistCard
              key={a.id}
              priority={i < 3}
              artist={{
                slug: a.slug, name: a.name, origin: a.origin, genres: a.genres,
                heroImage: a.heroImage, excerpt: a.excerpt, isFeatured: a.isFeatured,
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Build + smoke test**

Run: `npm run build`, then with dev running:
`curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/kuenstler`
Expected: `200` (empty-state copy if no artists yet).

- [ ] **Step 3: Commit**

```bash
git add "src/app/(public)/kuenstler/page.tsx"
git commit -m "feat(artist): public /kuenstler index page"
```

---

## Task 9: Public detail page `/kuenstler/[slug]`

**Files:**
- Create: `src/app/(public)/kuenstler/[slug]/page.tsx`

- [ ] **Step 1: Create `src/app/(public)/kuenstler/[slug]/page.tsx`**

```tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import { getPublishedArtistBySlug } from '@/lib/artists'
import { buildMetadata, buildArtistJsonLd } from '@/lib/seo'
import JsonLd from '@/components/JsonLd'
import MarkdownContent from '@/components/MarkdownContent'
import SocialLinks from '@/components/artists/SocialLinks'
import ArtistGallery from '@/components/artists/ArtistGallery'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const artist = await getPublishedArtistBySlug(slug)
  if (!artist) return buildMetadata(null, `/kuenstler/${slug}`, { title: 'Künstler nicht gefunden' })
  return buildMetadata(null, `/kuenstler/${slug}`, {
    title: artist.metaTitle || `${artist.name} – e-Ventschau`,
    description: artist.metaDescription || artist.excerpt || `${artist.name} beim e-Ventschau-Festival.`,
    ogImage: artist.heroImage || undefined,
  })
}

export default async function ArtistDetailPage({ params }: Props) {
  const { slug } = await params
  const artist = await getPublishedArtistBySlug(slug)
  if (!artist) notFound()

  const socials = Array.isArray(artist.socials) ? (artist.socials as { platform: string; url: string }[]) : []

  return (
    <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6 lg:px-8">
      <JsonLd data={buildArtistJsonLd({ ...artist, socials })} />

      <header className="mb-8">
        {artist.heroImage && (
          <div className="relative mb-6 aspect-[16/9] overflow-hidden rounded-section">
            <Image src={artist.heroImage} alt={artist.name} fill priority className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          </div>
        )}
        {artist.origin && <p className="text-sm font-semibold uppercase tracking-wider text-brand-accent">{artist.origin}</p>}
        <h1 className="mt-1 font-display text-4xl font-bold text-brand-text sm:text-5xl">{artist.name}</h1>
        {artist.genres.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2" aria-label="Genres">
            {artist.genres.map((g) => (
              <li key={g} className="rounded-pill bg-brand-accent/10 px-3 py-1 text-sm text-brand-accent">{g}</li>
            ))}
          </ul>
        )}
      </header>

      {artist.bio && (
        <section className="mb-10">
          <MarkdownContent content={artist.bio} />
        </section>
      )}

      {socials.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 font-display text-2xl font-bold text-brand-text">Links</h2>
          <SocialLinks links={socials} />
        </section>
      )}

      {artist.media.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-4 font-display text-2xl font-bold text-brand-text">Galerie</h2>
          <ArtistGallery items={artist.media} artistName={artist.name} />
        </section>
      )}

      {/* "Auftritte"-Sektion wird erst in Spec 2 (Events) befüllt — bis dahin bewusst nicht gerendert. */}
    </div>
  )
}
```

- [ ] **Step 2: Build + smoke test**

Run: `npm run build`, then with dev running:
`curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/kuenstler/does-not-exist`
Expected: `404`.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(public)/kuenstler/[slug]/page.tsx"
git commit -m "feat(artist): public /kuenstler/[slug] detail page with JSON-LD"
```

---

## Task 10: Admin list page

**Files:**
- Create: `src/app/admin/artists/page.tsx`

Mirror `src/app/admin/vendors/page.tsx` (client component, `glass-card` grid, `toggleField`, `deleteVendor`).

- [ ] **Step 1: Create `src/app/admin/artists/page.tsx`**

```tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type Artist = {
  id: string; name: string; slug: string; origin: string | null
  isPublished: boolean; isActive: boolean; isFeatured: boolean
  _count?: { media: number }
}

export default function AdminArtistsPage() {
  const [artists, setArtists] = useState<Artist[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/artists')
      .then((r) => r.json())
      .then((d) => setArtists(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false))
  }, [])

  async function toggleField(id: string, field: 'isPublished' | 'isActive' | 'isFeatured', current: boolean) {
    await fetch(`/api/admin/artists/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: !current }),
    })
    setArtists((prev) => prev.map((a) => (a.id === id ? { ...a, [field]: !current } : a)))
  }

  async function remove(id: string) {
    if (!confirm('Künstler wirklich löschen?')) return
    await fetch(`/api/admin/artists/${id}`, { method: 'DELETE' })
    setArtists((prev) => prev.filter((a) => a.id !== id))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Künstler</h1>
        <Link href="/admin/artists/new" className="btn-primary px-4 py-2">+ Neuer Künstler</Link>
      </div>

      {loading ? (
        <p>Lädt…</p>
      ) : artists.length === 0 ? (
        <p className="text-brand-text-muted">Noch keine Künstler angelegt.</p>
      ) : (
        <div className="grid gap-4">
          {artists.map((a) => (
            <div key={a.id} className="glass-card flex items-center justify-between gap-4 rounded-section p-4">
              <div>
                <p className="font-semibold">{a.name}</p>
                <p className="text-sm text-brand-text-muted">/{a.slug}{a.origin ? ` · ${a.origin}` : ''}</p>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <button onClick={() => toggleField(a.id, 'isPublished', a.isPublished)} className="rounded-pill px-3 py-1 glass">
                  {a.isPublished ? 'Veröffentlicht' : 'Entwurf'}
                </button>
                <button onClick={() => toggleField(a.id, 'isFeatured', a.isFeatured)} className="rounded-pill px-3 py-1 glass">
                  {a.isFeatured ? '★ Headliner' : '☆'}
                </button>
                <Link href={`/admin/artists/${a.id}`} className="btn-secondary px-3 py-1">Bearbeiten</Link>
                <button onClick={() => remove(a.id)} className="px-3 py-1 text-red-600">Löschen</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Lint + commit**

Run: `npm run lint`
```bash
git add src/app/admin/artists/page.tsx
git commit -m "feat(artist): admin list page"
```

---

## Task 11: Admin create form (`new`)

**Files:**
- Create: `src/app/admin/artists/new/page.tsx`

Minimal flat create (like `vendors/new`), then redirect to `[id]` for rich editing. Uses `MediaPickerDialog` for the hero image.

- [ ] **Step 1: Create `src/app/admin/artists/new/page.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import MediaPickerDialog from '@/components/admin/MediaPickerDialog'

export default function NewArtistPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', slug: '', origin: '', genres: '', excerpt: '', heroImage: '' })
  const [pickHero, setPickHero] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  function update(field: keyof typeof form, value: string) {
    setForm((p) => {
      const next = { ...p, [field]: value }
      if (field === 'name' && !p.slug) {
        next.slug = value.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
          .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
      }
      return next
    })
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError('')
    const res = await fetch('/api/admin/artists', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, genres: form.genres.split(',').map((g) => g.trim()).filter(Boolean) }),
    })
    setSaving(false)
    if (!res.ok) { setError((await res.json()).error || 'Fehler'); return }
    const artist = await res.json()
    router.push(`/admin/artists/${artist.id}`)
  }

  return (
    <form onSubmit={submit} className="max-w-2xl space-y-4">
      <h1 className="font-display text-2xl font-bold">Neuer Künstler</h1>
      {error && <p className="rounded-section bg-red-50 p-3 text-red-700">{error}</p>}

      <label className="block">
        <span className="text-sm font-medium">Name *</span>
        <input className="mt-1 w-full rounded-section border p-2" value={form.name} onChange={(e) => update('name', e.target.value)} required />
      </label>
      <label className="block">
        <span className="text-sm font-medium">Slug *</span>
        <input className="mt-1 w-full rounded-section border p-2" value={form.slug} onChange={(e) => update('slug', e.target.value)} required />
      </label>
      <label className="block">
        <span className="text-sm font-medium">Herkunft</span>
        <input className="mt-1 w-full rounded-section border p-2" value={form.origin} onChange={(e) => update('origin', e.target.value)} />
      </label>
      <label className="block">
        <span className="text-sm font-medium">Genres (Komma-getrennt)</span>
        <input className="mt-1 w-full rounded-section border p-2" value={form.genres} onChange={(e) => update('genres', e.target.value)} />
      </label>
      <label className="block">
        <span className="text-sm font-medium">Kurzbeschreibung</span>
        <textarea className="mt-1 w-full rounded-section border p-2" rows={3} value={form.excerpt} onChange={(e) => update('excerpt', e.target.value)} />
      </label>
      <div>
        <span className="text-sm font-medium">Hero-Foto</span>
        <div className="mt-1 flex items-center gap-3">
          {form.heroImage && <span className="truncate text-sm text-brand-text-muted">{form.heroImage}</span>}
          <button type="button" className="btn-secondary px-3 py-1" onClick={() => setPickHero(true)}>Medien…</button>
        </div>
      </div>

      <button type="submit" disabled={saving} className="btn-primary px-5 py-2">
        {saving ? 'Speichert…' : 'Anlegen & weiter bearbeiten'}
      </button>

      <MediaPickerDialog
        open={pickHero}
        onClose={() => setPickHero(false)}
        onSelect={(url) => { setForm((p) => ({ ...p, heroImage: url })); setPickHero(false) }}
      />
    </form>
  )
}
```

- [ ] **Step 2: Verify the MediaPickerDialog import path**

Run: `grep -rn "MediaPickerDialog" src/app/admin/vendors/new/page.tsx`
Expected: confirms `@/components/admin/MediaPickerDialog` (default vs named import — match it exactly).

- [ ] **Step 3: Lint + commit**

Run: `npm run lint`
```bash
git add src/app/admin/artists/new/page.tsx
git commit -m "feat(artist): admin create form"
```

---

## Task 12: Admin edit form (`[id]`) — Plate bio, gallery, socials, SEO

**Files:**
- Create: `src/app/admin/artists/[id]/page.tsx`

Mirrors the PlateEditor wiring from `src/app/admin/content/[id]/page.tsx` (dynamic import, `markdownToPlate`/`plateToMarkdown`, save-time conversion).

- [ ] **Step 1: Create `src/app/admin/artists/[id]/page.tsx`**

```tsx
'use client'

import { useEffect, useRef, useState, use } from 'react'
import dynamic from 'next/dynamic'
import type { TElement } from '@udecode/plate-common'
import MediaPickerDialog from '@/components/admin/MediaPickerDialog'
import { markdownToPlate, plateToMarkdown } from '@/components/admin/editor/serialization'

const PlateEditor = dynamic(() => import('@/components/admin/editor/PlateEditor').then((m) => m.PlateEditor), { ssr: false })

type Social = { platform: string; url: string }
type GalleryItem = { id?: string; kind: string; imageUrl?: string | null; videoId?: string | null; altText?: string | null }

export default function EditArtistPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [form, setForm] = useState({
    name: '', slug: '', origin: '', genres: '', excerpt: '', heroImage: '',
    website: '', metaTitle: '', metaDescription: '', isPublished: false, isFeatured: false,
  })
  const [bioJson, setBioJson] = useState<TElement[] | null>(null)
  const [socials, setSocials] = useState<Social[]>([])
  const [gallery, setGallery] = useState<GalleryItem[]>([])
  const [pick, setPick] = useState<'hero' | 'gallery' | null>(null)
  const [saved, setSaved] = useState(false)
  const loadedRef = useRef(false)

  useEffect(() => {
    fetch(`/api/admin/artists/${id}`).then((r) => r.json()).then((a) => {
      setForm({
        name: a.name || '', slug: a.slug || '', origin: a.origin || '', genres: (a.genres || []).join(', '),
        excerpt: a.excerpt || '', heroImage: a.heroImage || '', website: a.website || '',
        metaTitle: a.metaTitle || '', metaDescription: a.metaDescription || '',
        isPublished: !!a.isPublished, isFeatured: !!a.isFeatured,
      })
      setBioJson(a.bioJson || markdownToPlate(a.bio || ''))
      setSocials(Array.isArray(a.socials) ? a.socials : [])
      setGallery(a.media || [])
      loadedRef.current = true
    })
  }, [id])

  async function save() {
    const bio = bioJson ? plateToMarkdown(bioJson) : ''
    const res = await fetch(`/api/admin/artists/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        genres: form.genres.split(',').map((g) => g.trim()).filter(Boolean),
        bio, bioJson, editorMode: 'wysiwyg', socials, media: gallery,
      }),
    })
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2000) }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Künstler bearbeiten</h1>
        <div className="flex items-center gap-3">
          {saved && <span className="text-green-600">Gespeichert ✓</span>}
          <button onClick={save} className="btn-primary px-5 py-2">Speichern</button>
        </div>
      </div>

      {/* Basics */}
      <div className="grid gap-4">
        <input className="rounded-section border p-2" placeholder="Name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
        <input className="rounded-section border p-2" placeholder="Slug" value={form.slug} onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))} />
        <input className="rounded-section border p-2" placeholder="Herkunft" value={form.origin} onChange={(e) => setForm((p) => ({ ...p, origin: e.target.value }))} />
        <input className="rounded-section border p-2" placeholder="Genres (Komma)" value={form.genres} onChange={(e) => setForm((p) => ({ ...p, genres: e.target.value }))} />
        <textarea className="rounded-section border p-2" rows={2} placeholder="Kurzbeschreibung" value={form.excerpt} onChange={(e) => setForm((p) => ({ ...p, excerpt: e.target.value }))} />
        <div className="flex items-center gap-3">
          <span className="text-sm">Hero: {form.heroImage || '—'}</span>
          <button type="button" className="btn-secondary px-3 py-1" onClick={() => setPick('hero')}>Medien…</button>
        </div>
        <input className="rounded-section border p-2" placeholder="Website (https://)" value={form.website} onChange={(e) => setForm((p) => ({ ...p, website: e.target.value }))} />
      </div>

      {/* Bio (Plate) */}
      <div>
        <h2 className="mb-2 font-semibold">Bio</h2>
        {bioJson !== null && <PlateEditor initialValue={bioJson} onChange={(v) => setBioJson(v)} />}
      </div>

      {/* Socials */}
      <div>
        <h2 className="mb-2 font-semibold">Social-Links</h2>
        {socials.map((s, i) => (
          <div key={i} className="mb-2 flex gap-2">
            <input className="w-40 rounded-section border p-2" placeholder="Plattform" value={s.platform}
              onChange={(e) => setSocials((p) => p.map((x, j) => (j === i ? { ...x, platform: e.target.value } : x)))} />
            <input className="flex-1 rounded-section border p-2" placeholder="https://…" value={s.url}
              onChange={(e) => setSocials((p) => p.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))} />
            <button type="button" onClick={() => setSocials((p) => p.filter((_, j) => j !== i))} className="px-2 text-red-600">✕</button>
          </div>
        ))}
        <button type="button" className="btn-secondary px-3 py-1" onClick={() => setSocials((p) => [...p, { platform: '', url: '' }])}>+ Link</button>
      </div>

      {/* Gallery */}
      <div>
        <h2 className="mb-2 font-semibold">Galerie</h2>
        <div className="grid grid-cols-3 gap-2">
          {gallery.map((g, i) => (
            <div key={i} className="rounded-section border p-2 text-xs">
              <p className="truncate">{g.kind}: {g.imageUrl || g.videoId}</p>
              <input className="mt-1 w-full border p-1" placeholder="Alt-Text" value={g.altText || ''}
                onChange={(e) => setGallery((p) => p.map((x, j) => (j === i ? { ...x, altText: e.target.value } : x)))} />
              <button type="button" onClick={() => setGallery((p) => p.filter((_, j) => j !== i))} className="mt-1 text-red-600">Entfernen</button>
            </div>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <button type="button" className="btn-secondary px-3 py-1" onClick={() => setPick('gallery')}>+ Bild</button>
          <button type="button" className="btn-secondary px-3 py-1"
            onClick={() => { const u = prompt('YouTube- oder Vimeo-Link:'); if (u) setGallery((p) => [...p, { kind: u.includes('vimeo') ? 'vimeo' : 'youtube', videoId: u }]) }}>
            + Video (YouTube/Vimeo)
          </button>
        </div>
      </div>

      {/* SEO + publish */}
      <div className="grid gap-3">
        <input className="rounded-section border p-2" placeholder="Meta-Title" value={form.metaTitle} onChange={(e) => setForm((p) => ({ ...p, metaTitle: e.target.value }))} />
        <textarea className="rounded-section border p-2" rows={2} placeholder="Meta-Description" value={form.metaDescription} onChange={(e) => setForm((p) => ({ ...p, metaDescription: e.target.value }))} />
        <label className="flex items-center gap-2"><input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm((p) => ({ ...p, isFeatured: e.target.checked }))} /> Headliner</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={form.isPublished} onChange={(e) => setForm((p) => ({ ...p, isPublished: e.target.checked }))} /> Veröffentlicht</label>
      </div>

      <MediaPickerDialog
        open={pick !== null}
        onClose={() => setPick(null)}
        onSelect={(url) => {
          if (pick === 'hero') setForm((p) => ({ ...p, heroImage: url }))
          else if (pick === 'gallery') setGallery((p) => [...p, { kind: 'image', imageUrl: url }])
          setPick(null)
        }}
      />
    </div>
  )
}
```

- [ ] **Step 2: Verify the serialization re-export path + Plate type import**

Run: `grep -rn "plateToMarkdown\|markdownToPlate" src/app/admin/content/[id]/page.tsx | head -3` and `grep -rn "TElement" src/components/admin/editor/PlateEditor.tsx | head -2`
Expected: confirms the import source for `markdownToPlate`/`plateToMarkdown` (match `content/[id]`'s exact path — adjust from `@/components/admin/editor/serialization` if it differs) and the package `TElement` comes from. Fix imports to match.

- [ ] **Step 3: Build + commit**

Run: `npm run build`
Expected: compiles. (If `use(params)` causes an issue, mirror however `content/[id]/page.tsx` unwraps params.)
```bash
git add "src/app/admin/artists/[id]/page.tsx"
git commit -m "feat(artist): admin edit form with Plate bio, gallery, socials, SEO"
```

---

## Task 13: Admin navigation entry

**Files:**
- Modify: `src/components/admin/AdminNav.tsx`

- [ ] **Step 1: Import an icon + add the nav item**

At the icon import block (top of file, ~lines 6-24), add `MusicalNoteIcon` to the `@heroicons/react/24/outline` import.

In `navStructure` (~line 62), add to the "Inhalte" group's `items` array (the group that already contains content/pages — verify by reading lines 75-90), or as a sibling item:
```ts
{ name: 'Künstler', href: '/admin/artists', icon: MusicalNoteIcon },
```

- [ ] **Step 2: Build + smoke check**

Run: `npm run build`, then with dev running, log into `/admin` and confirm "Künstler" appears in the sidebar and links to `/admin/artists`.

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/AdminNav.tsx
git commit -m "feat(artist): add Künstler to admin sidebar nav"
```

---

## Task 14: Slider ARTIST integration

**Files:**
- Modify: `src/app/api/sliders/route.ts`
- Modify: `src/app/admin/sliders/page.tsx`

- [ ] **Step 1: Add the ARTIST auto-populate branch in `getAutoItems`**

In `src/app/api/sliders/route.ts`, after the `VENDOR` branch (~line 118), add:
```ts
    if (slider.itemType === 'ARTIST') {
      const artists = await prisma.artist.findMany({
        where: { tenantId, isPublished: true, isActive: true, ...(slider.filterTags?.length ? { genres: { hasSome: slider.filterTags } } : {}) },
        orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }],
        take: slider.maxItems || 12,
      })
      return artists.map((a) => ({
        id: a.id,
        title: a.name,
        subtitle: a.origin || (a.genres[0] ?? ''),
        imageUrl: a.heroImage || '',
        linkUrl: `/kuenstler/${a.slug}`,
        type: 'ARTIST' as const,
      }))
    }
```

- [ ] **Step 2: Handle ARTIST in the manual-items map**

In the manual items mapping (~lines 168-193), add `artist: true` to the `include` if present, and extend the per-item mapping so `item.artist` maps `imageUrl: item.artist?.heroImage`, `linkUrl: '/kuenstler/' + item.artist?.slug`, and the `type:` ternary returns `'ARTIST'` when `item.artistId`. Read the existing block and mirror the `vendor` handling exactly for `artist`.

- [ ] **Step 3: Add ARTIST to the admin union type**

In `src/app/admin/sliders/page.tsx` (~line 31), change:
```ts
type ItemType = 'PAGE' | 'PRODUCT' | 'VENDOR' | 'MEDIA'
```
to include `'ARTIST'`, and add an `ARTIST` option wherever `itemType` choices are rendered (mirror the VENDOR `<option>`).

- [ ] **Step 4: Build + commit**

Run: `npm run build`
```bash
git add src/app/api/sliders/route.ts src/app/admin/sliders/page.tsx
git commit -m "feat(artist): slider ARTIST type (auto + manual)"
```

---

## Task 15: Sitemap + homepage line-up links

**Files:**
- Modify: `src/app/sitemap.ts`
- Modify: `src/app/(public)/page.tsx`

- [ ] **Step 1: Add published artists to the sitemap**

In `src/app/sitemap.ts`, after the page query (~line 26), add:
```ts
  const artists = await prisma.artist.findMany({
    where: { tenantId: tenant.id, isPublished: true, isActive: true },
    select: { slug: true, updatedAt: true },
  })
```
And concatenate into the returned array:
```ts
    ...artists.map((a) => ({
      url: `${SITE_URL}/kuenstler/${a.slug}`,
      lastModified: a.updatedAt,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
```

- [ ] **Step 2: Link homepage line-up cards to artist pages**

In `src/app/(public)/page.tsx`, the `lineup2026` cards (~lines 86-93) currently render a static `<div>`. Wrap each card content in `<Link href={`/kuenstler/${slug}`}>`, deriving `slug` from the band name via the same normalize logic, OR (preferred) add an explicit `slug` field to each `lineup2026` entry matching the seeded slugs from Task 16. Use explicit slugs to avoid drift.

- [ ] **Step 3: Build + commit**

Run: `npm run build`
```bash
git add src/app/sitemap.ts "src/app/(public)/page.tsx"
git commit -m "feat(artist): sitemap entries + homepage line-up links"
```

---

## Task 16: Seed line-up bands + menu item

**Files:**
- Modify: `prisma/seed.ts`

- [ ] **Step 1: Add an artists seed block**

In `prisma/seed.ts`, after the menu block (before the content-pages loop, ~line 186), add:
```ts
  // ── Artists (Line-up 2026) ──────────────────────────────
  const lineup = [
    { slug: 'thorbjorn-risager', name: 'Thorbjørn Risager & The Black Tornado', origin: 'Dänemark', genres: ['Blues Rock', 'Soul'], featured: true },
    { slug: 'lebron-johnson', name: 'Lebron Johnson', origin: 'Italien', genres: ['Rock', 'Funk'], featured: true },
    { slug: 'killabeatmaker', name: 'Killabeatmaker', origin: 'Kolumbien', genres: ['Latin', 'Electronic'], featured: false },
    { slug: 'jed-thomas-band', name: 'Jed Thomas Band', origin: 'Großbritannien', genres: ['Heavy Blues Rock'], featured: false },
    { slug: 'rovar', name: 'ROVAR', origin: 'Münster', genres: ['Stoner', '70s Rock'], featured: false },
    { slug: 'nanny-goats', name: 'Nanny Goats', origin: 'Lüneburg', genres: ['Semi-Acoustic'], featured: false },
    { slug: 'the-klaxon', name: 'The Klaxon', origin: 'Kolumbien', genres: ['Ska', 'Latin'], featured: false },
  ]
  for (const [i, band] of lineup.entries()) {
    await prisma.artist.upsert({
      where: { tenantId_slug: { tenantId: tenant.id, slug: band.slug } },
      update: { name: band.name, origin: band.origin, genres: band.genres, isFeatured: band.featured, isPublished: true },
      create: {
        tenantId: tenant.id, slug: band.slug, name: band.name, origin: band.origin,
        genres: band.genres, isFeatured: band.featured, isPublished: true, isActive: true, sortOrder: i,
      },
    })
  }
  console.log(`Artists seeded: ${lineup.length}`)
```

- [ ] **Step 2: Add a "Künstler" header menu item**

In the header menu block (~after line 114, the "Programm 2026" item), add an item with the next `sortOrder` (re-number the following items if needed):
```ts
  await prisma.menuItem.create({
    data: { tenantId: tenant.id, label: 'Künstler', href: '/kuenstler', sortOrder: 3 },
  })
```
(Adjust the `sortOrder` values of the subsequent header items so they remain sequential.)

- [ ] **Step 3: Run seed + verify**

Run: `npm run db:seed`
Expected: log shows "Artists seeded: 7". Then with dev running:
`curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/kuenstler/thorbjorn-risager`
Expected: `200`.

- [ ] **Step 4: Commit**

```bash
git add prisma/seed.ts
git commit -m "feat(artist): seed line-up 2026 bands + Künstler menu item"
```

---

## Task 17: Full verification + CRUD roundtrip

**Files:** none (verification only)

- [ ] **Step 1: Clean build + lint**

Run: `npm run build && npm run lint`
Expected: both green, no type errors.

- [ ] **Step 2: Public smoke tests**

With `npm run dev` running:
```bash
for p in /kuenstler /kuenstler/thorbjorn-risager; do
  echo -n "$p -> "; curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:3000$p"
done
curl -s -o /dev/null -w "draft 404 -> %{http_code}\n" "http://localhost:3000/kuenstler/__nope__"
```
Expected: `200`, `200`, `404`.

- [ ] **Step 3: Manual admin CRUD roundtrip**

Log into `/admin` (admin@e-ventschau.de / admin2024!). Create a test artist via `/admin/artists/new` → land on edit form → add a Plate bio, one social link (`https://…`), one gallery image and one YouTube link → set "Veröffentlicht" → Save. Visit `/kuenstler/<slug>`: bio renders, social link has `rel="noopener noreferrer nofollow"`, gallery image opens lightbox (Esc closes, arrows navigate), YouTube embeds from `youtube-nocookie.com`. Then create a slider with `itemType=ARTIST` and confirm the artist appears.

- [ ] **Step 4: Security spot-checks (manual)**

- Try saving a social URL `javascript:alert(1)` → must be dropped (not rendered).
- Try saving a bio containing `<script>` via the editor → output renders escaped, no execution (react-markdown, no rehype-raw).
- Confirm gallery video stores only the ID (inspect DB via `npm run db:studio` → `ArtistMedia.videoId` is an 11-char ID / numeric, never a full URL).

- [ ] **Step 5: Final commit (if any verification fixes were needed)**

```bash
git add -A
git commit -m "chore(artist): verification fixes" || echo "nothing to commit"
```

---

## Verification Summary (Definition of Done)

- `npm run build` and `npm run lint` pass.
- `/kuenstler` (index, empty-state safe) and `/kuenstler/[slug]` (detail, draft→404) return correct status codes.
- Admin CRUD roundtrip works: create → rich edit (Plate bio, gallery, socials, SEO) → publish → public render.
- Security controls verified: markdown-only bio (no raw HTML execution), https-only socials with safe `rel`, video-ID-only embeds on locked hosts, per-tenant unique slug, IDOR-safe `[id]` routes, role-gated API.
- Slider `ARTIST` type works (auto + manual). Sitemap lists published artists. Homepage line-up links to artist pages. Seed creates the 7 bands + "Künstler" menu item.
- A11y: lightbox keyboard nav + focus return, `motion-safe:` hover guard, alt text, single `<h1>` per page.
