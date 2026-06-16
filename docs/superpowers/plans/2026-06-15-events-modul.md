# Events-Modul (Spec 2) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a first-class, tenant-scoped Events module (multistage timetable, artist-or-free-text appearance slots, display-only price tiers) for e-Ventschau, with the homepage line-up coupled to the featured event and the Artist "Auftritte" stub finally rendered.

**Architecture:** Mirror the shipped Artist module 1:1. `Event ≈ Artist` (tenant-scoped, `@@unique([tenantId, slug])`, markdown+Plate body, publish/feature flags). Nested children `Stage` / `Appearance` / `PriceTier ≈ ArtistMedia` (cascade-delete, no `tenantId`, scoped via parent). Price tiers persist via a replace-all `$transaction` inside the event PUT; stages and appearances persist via granular per-row sub-resource endpoints (a 2-day timetable is too many rows for fat-replace). All security/a11y lessons from Spec 1 carry over verbatim.

**Tech Stack:** Next.js 15 App Router · React 19 · TypeScript · Tailwind 3.4 (liquid-glass) · Prisma 6 (Neon Postgres) · NextAuth 4 (JWT) · Plate.js · Cloudinary · `react-markdown` **without** `rehype-raw`.

**Spec:** `docs/superpowers/specs/2026-06-15-e-ventschau-events-module-design.md`

---

## Conventions for every task (read once)

- **Working dir:** `/Users/oliverbaer/Projects/minicms`. Branch: `feat/events-module`. Git author **must** stay `oliver.baer@gmail.com`.
- **No test framework exists.** Two verification modes are used in this plan:
  1. **Pure-logic tasks** (`slug.ts`, `event-validation.ts`): a real executable assertion test run with `npx tsx <file>` (uses `node:assert/strict`, zero new deps). This gives genuine red→green.
  2. **DB / route / page / UI tasks**: `npx tsc --noEmit` (must print nothing / exit 0) and `npm run build` (must succeed) are the hard gates, plus a concrete runtime check (curl with expected status, a Prisma query, or a browser visual) where runnable. `npm run lint` is **unusable** (interactive) — never use it.
- **Never commit** `.env` / `.env.local` / `.mcp.json` (all gitignored — verify with `git status` before any `git add -A`; prefer explicit `git add <paths>`).
- **House style to copy exactly:** German user-facing strings & error messages; `String(x).trim()` / `x ? String(x) : null` coercion; booleans `=== true`; URLs through `safeHttpsUrl`/`safeCloudinaryUrl`; conditional-spread for optional JSON-LD keys; `getTenant()` + early-return in every data path; tenant-scoped `where` on every query.
- **Role gate is `['ADMIN','SUPER_ADMIN']`** (NOT `EDITOR`) — this is the minicms set.
- **Schema requirement that DELETE depends on:** Stage/Appearance/PriceTier relations to Event use `onDelete: Cascade`; Appearance→Artist uses `onDelete: SetNull`. Without these the DELETE route FK-errors.

---

## File Structure (what gets created / modified)

**Created:**
- `prisma/schema.prisma` (modified — 4 models + 2 back-relations)
- `src/lib/slug.ts` — extracted shared slug/URL validators
- `src/lib/event-validation.ts` — event/appearance/tier/stage sanitizers
- `src/lib/events.ts` — tenant-scoped getters + `EventWithRelations`/`EventSummary` types
- `src/lib/admin-auth.ts` — shared `getSessionToken`/`authTenant` for the 5 new event routes
- `src/lib/__tests__/slug.test.ts`, `src/lib/__tests__/event-validation.test.ts` — executable assertion tests
- `src/app/api/admin/events/route.ts` — GET list + POST create
- `src/app/api/admin/events/[id]/route.ts` — GET + PUT (+ priceTier replace-all) + DELETE
- `src/app/api/admin/events/[id]/stages/route.ts` + `stages/[stageId]/route.ts`
- `src/app/api/admin/events/[id]/appearances/route.ts` + `appearances/[appId]/route.ts`
- `src/components/events/EventCard.tsx` — list card + `EventSummary` type
- `src/components/events/EventTimetable.tsx` — responsive timetable (desktop grid + mobile agenda)
- `src/components/admin/events/StageManager.tsx`, `src/components/admin/events/TimetableBuilder.tsx`
- `src/app/(public)/events/page.tsx` + `src/app/(public)/events/[slug]/page.tsx`
- `src/app/(public)/programm-2026/page.tsx` — redirect to the festival event
- `src/app/admin/events/page.tsx` + `new/page.tsx` + `[id]/page.tsx`

**Modified:**
- `src/lib/artist-validation.ts` — re-export from `slug.ts` (zero breakage)
- `src/lib/seo.ts` — add `buildEventJsonLd`
- `src/app/sitemap.ts` — add published events
- `src/components/admin/AdminNav.tsx` — add Events entry
- `src/app/(public)/kuenstler/[slug]/page.tsx` — wire up "Auftritte"
- `src/app/(public)/page.tsx` — homepage line-up coupling + Programm links
- `src/components/layout/HeaderClient.tsx`, `src/components/layout/Footer.tsx` — repoint Programm links
- `prisma/seed.ts` — festival 2026 + nested children + Events menu item + repoint Programm hrefs

---

## Task 1: Prisma schema — Event / Stage / Appearance / PriceTier

**Files:**
- Modify: `prisma/schema.prisma`

The existing `Artist` model (`@@unique([tenantId, slug])`, `bio`/`bioJson`/`editorMode`) and `ArtistMedia` (`onDelete: Cascade`, no `tenantId`) are the templates. `Tenant` already has `artists Artist[]` (line ~74). `SliderItemType` currently has `PAGE PRODUCT VENDOR MEDIA ARTIST` — **do not** touch the enum or `SliderItem` here (that is the optional Task 25).

- [ ] **Step 1: Append the four models** at the end of `prisma/schema.prisma`

```prisma
model Event {
  id              String   @id @default(cuid())
  tenantId        String
  slug            String
  title           String
  subtitle        String?
  eventType       String   @default("festival")
  startDate       DateTime
  endDate         DateTime?
  locationName    String?
  locationAddress String?
  locationUrl     String?
  heroImage       String?
  excerpt         String?  @db.Text
  description     String?  @db.Text
  descriptionJson Json?
  editorMode      String?  @default("markdown")
  ticketUrl       String?
  metaTitle       String?
  metaDescription String?  @db.Text
  isPublished     Boolean  @default(false)
  isFeatured      Boolean  @default(false)
  isActive        Boolean  @default(true)
  sortOrder       Int      @default(0)
  createdById     String?
  updatedById     String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  tenant      Tenant       @relation(fields: [tenantId], references: [id])
  stages      Stage[]
  appearances Appearance[]
  priceTiers  PriceTier[]

  @@unique([tenantId, slug])
  @@index([tenantId])
  @@index([startDate])
}

model Stage {
  id        String  @id @default(cuid())
  eventId   String
  name      String
  color     String?
  sortOrder Int     @default(0)

  event       Event        @relation(fields: [eventId], references: [id], onDelete: Cascade)
  appearances Appearance[]

  @@index([eventId])
}

model Appearance {
  id        String    @id @default(cuid())
  eventId   String
  stageId   String
  artistId  String?
  title     String?
  role      String    @default("support")
  startTime DateTime
  endTime   DateTime?
  note      String?
  sortOrder Int       @default(0)

  event  Event   @relation(fields: [eventId], references: [id], onDelete: Cascade)
  stage  Stage   @relation(fields: [stageId], references: [id], onDelete: Cascade)
  artist Artist? @relation(fields: [artistId], references: [id], onDelete: SetNull)

  @@index([eventId])
  @@index([stageId])
  @@index([artistId])
}

model PriceTier {
  id          String    @id @default(cuid())
  eventId     String
  name        String
  description String?
  price       Float?
  currency    String    @default("EUR")
  validFrom   DateTime?
  validUntil  DateTime?
  isSoldOut   Boolean   @default(false)
  isActive    Boolean   @default(true)
  buyUrl      String?
  sortOrder   Int       @default(0)

  event Event @relation(fields: [eventId], references: [id], onDelete: Cascade)

  @@index([eventId])
}
```

- [ ] **Step 2: Add the `Tenant.events` back-relation.** Find the line `  artists            Artist[]` inside `model Tenant {` and add directly beneath it:

```prisma
  events             Event[]
```

- [ ] **Step 3: Add the `Artist.appearances` back-relation.** Inside `model Artist {`, find the relations block:

```prisma
  tenant      Tenant        @relation(fields: [tenantId], references: [id])
  media       ArtistMedia[]
  sliderItems SliderItem[]
```

Add one line so it becomes:

```prisma
  tenant      Tenant        @relation(fields: [tenantId], references: [id])
  media       ArtistMedia[]
  sliderItems SliderItem[]
  appearances Appearance[]
```

- [ ] **Step 4: Validate the schema**

Run: `npx prisma validate`
Expected: `The schema at prisma/schema.prisma is valid 🚀`

- [ ] **Step 5: Push to the Neon DB and regenerate the client**

Run: `npm run db:push && npx prisma generate`
Expected: `Your database is now in sync with your Prisma schema.` followed by `Generated Prisma Client`. (Prisma CLI reads `.env`, not `.env.local` — ensure `.env` has `DATABASE_URL`.)

- [ ] **Step 6: Type-check that the generated client exposes the new models**

Run: `npx tsc --noEmit`
Expected: exit 0, no output. (Confirms `prisma.event` / `prisma.stage` / `prisma.appearance` / `prisma.priceTier` are now typed.)

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(events): add Event/Stage/Appearance/PriceTier schema"
```

---

## Task 2: Shared slug/URL validators — `src/lib/slug.ts`

**Files:**
- Create: `src/lib/slug.ts`
- Modify: `src/lib/artist-validation.ts`
- Test: `src/lib/__tests__/slug.test.ts`

DRY extraction with zero breakage: move `SLUG_RE`, `normalizeSlug`, `isValidSlug`, `safeHttpsUrl`, `safeCloudinaryUrl` into `slug.ts`, then re-export them from `artist-validation.ts` so every existing artist import keeps working. **The umlaut-before-NFKD order is load-bearing** (`Motörhead → motoerhead`, not `motorhead`) — copy verbatim.

- [ ] **Step 1: Write the failing test** at `src/lib/__tests__/slug.test.ts`

```ts
import assert from 'node:assert/strict'
import { normalizeSlug, isValidSlug, safeHttpsUrl, safeCloudinaryUrl } from '../slug'

// umlaut replacement happens BEFORE NFKD — the canonical regression
assert.equal(normalizeSlug('Motörhead'), 'motoerhead')
assert.equal(normalizeSlug('Thorbjørn Risager & The Black Tornado'), 'thorbjorn-risager-the-black-tornado')
assert.equal(normalizeSlug('  Über Größe  '), 'ueber-groesse')
assert.equal(normalizeSlug('a'.repeat(200)).length, 96)

assert.equal(isValidSlug('e-ventschau-2026'), true)
assert.equal(isValidSlug('-bad'), false)
assert.equal(isValidSlug('Bad Caps'), false)
assert.equal(isValidSlug(''), false)

assert.equal(safeHttpsUrl('https://example.com/x'), 'https://example.com/x')
assert.equal(safeHttpsUrl('http://example.com'), null)        // non-https rejected
assert.equal(safeHttpsUrl('https://user:pw@example.com'), null) // userinfo rejected
assert.equal(safeHttpsUrl('not a url'), null)

assert.equal(safeCloudinaryUrl('https://res.cloudinary.com/x/y.jpg'), 'https://res.cloudinary.com/x/y.jpg')
assert.equal(safeCloudinaryUrl('https://evil.com/y.jpg'), null) // wrong host rejected

console.log('✓ slug.test.ts — all assertions passed')
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx tsx src/lib/__tests__/slug.test.ts`
Expected: FAIL — `Cannot find module '../slug'` (file does not exist yet).

- [ ] **Step 3: Create `src/lib/slug.ts`** (verbatim — umlaut replace then NFKD)

```ts
// Shared slug + URL validators (extracted from artist-validation for reuse by the events module).

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function normalizeSlug(input: string): string {
  return (input || '')
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96)
}

export function isValidSlug(slug: string): boolean {
  return !!slug && slug.length <= 96 && SLUG_RE.test(slug)
}

export function safeHttpsUrl(input: unknown): string | null {
  if (typeof input !== 'string' || !input.trim()) return null
  try {
    const u = new URL(input.trim())
    if (u.protocol !== 'https:') return null
    if (u.username || u.password) return null
    return u.toString()
  } catch { return null }
}

export function safeCloudinaryUrl(input: unknown): string | null {
  const url = safeHttpsUrl(input)
  if (!url) return null
  try { return new URL(url).hostname === 'res.cloudinary.com' ? url : null } catch { return null }
}
```

> NOTE: the original `artist-validation.ts` used a literal combining-marks character class. `[̀-ͯ]` is the identical Unicode range written in escape form (safer in source). It strips the same diacritics after NFKD.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx tsx src/lib/__tests__/slug.test.ts`
Expected: `✓ slug.test.ts — all assertions passed` (exit 0).

- [ ] **Step 5: Re-export from `artist-validation.ts`** — replace its local definitions of `SLUG_RE`, `normalizeSlug`, `isValidSlug`, `safeHttpsUrl`, `safeCloudinaryUrl` (lines 3–34) with a re-export. Delete those five definitions and put this at the top of the file (keep everything from `SocialLink` onward unchanged):

```ts
// Security validators for artist input (see spec §9).
// Slug + URL primitives live in ./slug and are re-exported here for backwards compatibility.
export { SLUG_RE, normalizeSlug, isValidSlug, safeHttpsUrl, safeCloudinaryUrl } from './slug'
import { safeHttpsUrl, safeCloudinaryUrl } from './slug'
```

> The `import { safeHttpsUrl, safeCloudinaryUrl }` line is required because `sanitizeSocials` and `sanitizeGalleryItem` (further down the file) call them internally. The `export { ... } from './slug'` re-publishes them for external importers.

- [ ] **Step 6: Verify the artist module still type-checks and builds**

Run: `npx tsc --noEmit`
Expected: exit 0, no output (confirms no artist importer broke).

- [ ] **Step 7: Commit**

```bash
git add src/lib/slug.ts src/lib/artist-validation.ts src/lib/__tests__/slug.test.ts
git commit -m "refactor(events): extract shared slug/url validators to slug.ts"
```

---

## Task 3: Event validation — `src/lib/event-validation.ts`

**Files:**
- Create: `src/lib/event-validation.ts`
- Test: `src/lib/__tests__/event-validation.test.ts`

Pure sanitizers for event scalar input + nested rows. Enforces: `eventType` ∈ allowlist; appearance `artistId` XOR `title` (artist link wins when both sent, title nulled); role ∈ allowlist; `endTime > startTime`; price `≥ 0` or null; `currency` ∈ allowlist; `validUntil ≥ validFrom`. The DB-dependent **artist-tenant-ownership** check is NOT here (it needs Prisma) — it lives in the appearances route (Task 9).

- [ ] **Step 1: Write the failing test** at `src/lib/__tests__/event-validation.test.ts`

```ts
import assert from 'node:assert/strict'
import {
  sanitizeEventType, ALLOWED_ROLES, ALLOWED_CURRENCIES,
  sanitizeStage, sanitizeAppearance, sanitizePriceTier,
} from '../event-validation'

// eventType allowlist
assert.equal(sanitizeEventType('concert'), 'concert')
assert.equal(sanitizeEventType('WORKSHOP'), 'workshop')
assert.equal(sanitizeEventType('garbage'), 'festival') // fallback default

// stage
assert.deepEqual(sanitizeStage({ name: 'Hauptbühne', color: '#b87333' }, 2),
  { name: 'Hauptbühne', color: '#b87333', sortOrder: 2 })
assert.equal(sanitizeStage({ name: '' }, 0), null)            // name required
assert.equal(sanitizeStage({ name: 'X', color: 'red' }, 0)!.color, null) // non-hex dropped

// appearance — artist link wins over title (XOR enforced post-sanitize)
const a1 = sanitizeAppearance({ stageId: 's1', artistId: 'art1', title: 'ignored', role: 'headliner', startTime: '2026-08-07T20:00:00Z' }, 0)!
assert.equal(a1.artistId, 'art1')
assert.equal(a1.title, null)
assert.equal(a1.role, 'headliner')

// appearance — free-text slot (no artist)
const a2 = sanitizeAppearance({ stageId: 's1', title: 'Umbaupause', role: 'break', startTime: '2026-08-07T21:00:00Z' }, 1)!
assert.equal(a2.artistId, null)
assert.equal(a2.title, 'Umbaupause')

// appearance — neither artist nor title → dropped
assert.equal(sanitizeAppearance({ stageId: 's1', startTime: '2026-08-07T20:00:00Z' }, 0), null)
// appearance — no stage → dropped
assert.equal(sanitizeAppearance({ artistId: 'a', startTime: '2026-08-07T20:00:00Z' }, 0), null)
// appearance — endTime <= startTime → dropped
assert.equal(sanitizeAppearance({ stageId: 's1', artistId: 'a', startTime: '2026-08-07T20:00:00Z', endTime: '2026-08-07T19:00:00Z' }, 0), null)
// appearance — bad role falls back to support
assert.equal(sanitizeAppearance({ stageId: 's1', artistId: 'a', role: 'nonsense', startTime: '2026-08-07T20:00:00Z' }, 0)!.role, 'support')

// price tier
const p1 = sanitizePriceTier({ name: 'Festival 2-Tage', price: 49, currency: 'EUR' }, 0)!
assert.equal(p1.price, 49)
assert.equal(p1.currency, 'EUR')
assert.equal(sanitizePriceTier({ name: 'X', price: -5 }, 0)!.price, null)        // negative → null ("auf Anfrage")
assert.equal(sanitizePriceTier({ name: 'X', currency: 'XYZ' }, 0)!.currency, 'EUR') // bad currency → default
assert.equal(sanitizePriceTier({ name: '' }, 0), null)                            // name required
assert.equal(sanitizePriceTier({ name: 'X', buyUrl: 'http://x.com' }, 0)!.buyUrl, null) // non-https dropped
assert.equal(sanitizePriceTier({ name: 'X', validFrom: '2026-02-01', validUntil: '2026-01-01' }, 0), null) // window inverted → dropped

assert.ok(ALLOWED_ROLES.includes('guest'))
assert.ok(ALLOWED_CURRENCIES.includes('CHF'))

console.log('✓ event-validation.test.ts — all assertions passed')
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx tsx src/lib/__tests__/event-validation.test.ts`
Expected: FAIL — `Cannot find module '../event-validation'`.

- [ ] **Step 3: Create `src/lib/event-validation.ts`**

```ts
// Security validators for event input (see spec §5). Pure functions; DB-dependent
// checks (artist-tenant ownership) live in the appearances route.
import { normalizeSlug, isValidSlug, safeHttpsUrl, safeCloudinaryUrl } from './slug'
export { normalizeSlug, isValidSlug, safeHttpsUrl, safeCloudinaryUrl }

export const ALLOWED_EVENT_TYPES = ['festival', 'concert', 'workshop', 'other'] as const
export const ALLOWED_ROLES = ['headliner', 'support', 'guest', 'break'] as const
export const ALLOWED_CURRENCIES = ['EUR', 'USD', 'CHF', 'GBP'] as const

const HEX_COLOR_RE = /^#[0-9a-fA-F]{3,8}$/

function parseDate(input: unknown): Date | null {
  if (input === null || input === undefined || input === '') return null
  const d = new Date(String(input))
  return isNaN(d.getTime()) ? null : d
}

export function sanitizeEventType(input: unknown): string {
  const t = String(input || '').toLowerCase().trim()
  return (ALLOWED_EVENT_TYPES as readonly string[]).includes(t) ? t : 'festival'
}

export type StageInput = { name: string; color: string | null; sortOrder: number }

export function sanitizeStage(raw: unknown, index = 0): StageInput | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const name = String(r.name || '').trim().slice(0, 120)
  if (!name) return null
  const colorRaw = String(r.color || '').trim()
  const color = HEX_COLOR_RE.test(colorRaw) ? colorRaw : null
  const sortOrder = Number.isFinite(Number(r.sortOrder)) ? Number(r.sortOrder) : index
  return { name, color, sortOrder }
}

export type AppearanceInput = {
  stageId: string
  artistId: string | null
  title: string | null
  role: string
  startTime: Date
  endTime: Date | null
  note: string | null
  sortOrder: number
}

export function sanitizeAppearance(raw: unknown, index = 0): AppearanceInput | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const stageId = String(r.stageId || '').trim()
  if (!stageId) return null

  let artistId: string | null = r.artistId ? String(r.artistId).trim() : null
  let title: string | null = r.title ? String(r.title).slice(0, 200).trim() : null
  // XOR: artist link wins; title is only the fallback for non-artist slots.
  if (artistId) title = null
  else if (!title) return null

  const startTime = parseDate(r.startTime)
  if (!startTime) return null
  const endTime = parseDate(r.endTime)
  if (endTime && endTime <= startTime) return null

  const roleRaw = String(r.role || 'support').toLowerCase().trim()
  const role = (ALLOWED_ROLES as readonly string[]).includes(roleRaw) ? roleRaw : 'support'
  const note = r.note ? String(r.note).slice(0, 500).trim() : null
  const sortOrder = Number.isFinite(Number(r.sortOrder)) ? Number(r.sortOrder) : index

  return { stageId, artistId, title, role, startTime, endTime, note, sortOrder }
}

export type PriceTierInput = {
  name: string
  description: string | null
  price: number | null
  currency: string
  validFrom: Date | null
  validUntil: Date | null
  isSoldOut: boolean
  isActive: boolean
  buyUrl: string | null
  sortOrder: number
}

export function sanitizePriceTier(raw: unknown, index = 0): PriceTierInput | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const name = String(r.name || '').trim().slice(0, 120)
  if (!name) return null

  const priceNum = Number(r.price)
  const price = Number.isFinite(priceNum) && priceNum >= 0 ? priceNum : null

  const currencyRaw = String(r.currency || 'EUR').toUpperCase().trim()
  const currency = (ALLOWED_CURRENCIES as readonly string[]).includes(currencyRaw) ? currencyRaw : 'EUR'

  const validFrom = parseDate(r.validFrom)
  const validUntil = parseDate(r.validUntil)
  if (validFrom && validUntil && validUntil < validFrom) return null

  const description = r.description ? String(r.description).slice(0, 500).trim() : null
  const buyUrl = safeHttpsUrl(r.buyUrl)
  const sortOrder = Number.isFinite(Number(r.sortOrder)) ? Number(r.sortOrder) : index

  return {
    name, description, price, currency, validFrom, validUntil,
    isSoldOut: r.isSoldOut === true,
    isActive: r.isActive !== false,
    buyUrl, sortOrder,
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx tsx src/lib/__tests__/event-validation.test.ts`
Expected: `✓ event-validation.test.ts — all assertions passed` (exit 0).

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/lib/event-validation.ts src/lib/__tests__/event-validation.test.ts
git commit -m "feat(events): event/stage/appearance/tier validation"
```

---

## Task 4: Data library — `src/lib/events.ts`

**Files:**
- Create: `src/lib/events.ts`

Mirrors `src/lib/artists.ts`: tenant-scoped getters, try/catch → `[]`/`null`. `getFeaturedEventLineup()` returns `ArtistSummary[]` (the homepage reuses artist card styling). All public getters filter `isPublished + isActive`.

- [ ] **Step 1: Create `src/lib/events.ts`**

```ts
import { prisma } from './prisma'
import { getTenant } from './tenant'
import type { Prisma } from '@prisma/client'
import type { ArtistSummary } from '@/components/artists/ArtistCard'

export type EventWithRelations = Prisma.EventGetPayload<{
  include: {
    stages: true
    priceTiers: true
    appearances: { include: { artist: { select: { slug: true; name: true } }; stage: true } }
  }
}>

export type EventSummary = {
  slug: string
  title: string
  subtitle: string | null
  startDate: Date
  endDate: Date | null
  locationName: string | null
  heroImage: string | null
  excerpt: string | null
  isFeatured: boolean
}

const ROLE_RANK: Record<string, number> = { headliner: 0, support: 1, guest: 2, break: 3 }

export async function getPublishedEvents(): Promise<EventSummary[]> {
  try {
    const tenant = await getTenant()
    if (!tenant) return []
    return await prisma.event.findMany({
      where: { tenantId: tenant.id, isPublished: true, isActive: true },
      select: {
        slug: true, title: true, subtitle: true, startDate: true, endDate: true,
        locationName: true, heroImage: true, excerpt: true, isFeatured: true,
      },
      orderBy: [{ startDate: 'asc' }],
    })
  } catch (e) { console.error('getPublishedEvents failed', e); return [] }
}

export async function getPublishedEventBySlug(slug: string): Promise<EventWithRelations | null> {
  try {
    const tenant = await getTenant()
    if (!tenant) return null
    const event = await prisma.event.findUnique({
      where: { tenantId_slug: { tenantId: tenant.id, slug } },
      include: {
        stages: { orderBy: { sortOrder: 'asc' } },
        priceTiers: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
        appearances: {
          include: { artist: { select: { slug: true, name: true } }, stage: true },
          orderBy: [{ startTime: 'asc' }, { sortOrder: 'asc' }],
        },
      },
    })
    if (!event || !event.isPublished || !event.isActive) return null
    return event
  } catch (e) { console.error('getPublishedEventBySlug failed', e); return null }
}

export async function getEventsForAdmin() {
  const tenant = await getTenant()
  if (!tenant) return []
  return prisma.event.findMany({
    where: { tenantId: tenant.id },
    include: { _count: { select: { stages: true, appearances: true, priceTiers: true } } },
    orderBy: [{ isFeatured: 'desc' }, { startDate: 'asc' }],
  })
}

export async function getFeaturedEvent() {
  try {
    const tenant = await getTenant()
    if (!tenant) return null
    return await prisma.event.findFirst({
      where: { tenantId: tenant.id, isPublished: true, isActive: true },
      orderBy: [{ isFeatured: 'desc' }, { startDate: 'asc' }],
    })
  } catch (e) { console.error('getFeaturedEvent failed', e); return null }
}

export async function getFeaturedEventLineup(): Promise<ArtistSummary[]> {
  try {
    const tenant = await getTenant()
    if (!tenant) return []
    const event = await prisma.event.findFirst({
      where: { tenantId: tenant.id, isPublished: true, isActive: true },
      orderBy: [{ isFeatured: 'desc' }, { startDate: 'asc' }],
      select: { id: true },
    })
    if (!event) return []
    const appearances = await prisma.appearance.findMany({
      where: {
        eventId: event.id,
        artistId: { not: null },
        artist: { isPublished: true, isActive: true },
      },
      include: {
        artist: { select: { slug: true, name: true, origin: true, genres: true, heroImage: true, excerpt: true, isFeatured: true } },
      },
      orderBy: [{ startTime: 'asc' }],
    })
    const sorted = [...appearances].sort((a, b) => (ROLE_RANK[a.role] ?? 9) - (ROLE_RANK[b.role] ?? 9))
    const seen = new Set<string>()
    const lineup: ArtistSummary[] = []
    for (const ap of sorted) {
      if (!ap.artist || seen.has(ap.artist.slug)) continue
      seen.add(ap.artist.slug)
      lineup.push({
        slug: ap.artist.slug,
        name: ap.artist.name,
        origin: ap.artist.origin,
        genres: ap.artist.genres,
        heroImage: ap.artist.heroImage,
        excerpt: ap.artist.excerpt,
        isFeatured: ap.artist.isFeatured,
      })
    }
    return lineup
  } catch (e) { console.error('getFeaturedEventLineup failed', e); return [] }
}

export type ArtistAppearance = Prisma.AppearanceGetPayload<{
  include: { event: { select: { slug: true; title: true; startDate: true } }; stage: { select: { name: true } } }
}>

export async function getArtistAppearances(artistId: string): Promise<ArtistAppearance[]> {
  try {
    const tenant = await getTenant()
    if (!tenant) return []
    return await prisma.appearance.findMany({
      where: { artistId, event: { tenantId: tenant.id, isPublished: true, isActive: true } },
      include: {
        event: { select: { slug: true, title: true, startDate: true } },
        stage: { select: { name: true } },
      },
      orderBy: [{ startTime: 'asc' }],
    })
  } catch (e) { console.error('getArtistAppearances failed', e); return [] }
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: exit 0. (Confirms `ArtistSummary` import resolves and the `Prisma.EventGetPayload` includes are valid.)

- [ ] **Step 3: Commit**

```bash
git add src/lib/events.ts
git commit -m "feat(events): tenant-scoped event getters + lineup coupling"
```

---

## Task 5: SEO — `buildEventJsonLd` in `src/lib/seo.ts`

**Files:**
- Modify: `src/lib/seo.ts`

`seo.ts` exports `buildMetadata`, `buildArtistJsonLd` (MusicGroup), `buildVendorJsonLd` (nested PostalAddress), `websiteJsonLd`, `organizationJsonLd`. The `<JsonLd>` component (`src/components/JsonLd.tsx`) already escapes `<`,`>`,`&` to unicode — so builders return **plain objects**; never hand-serialize. Add a `MusicEvent` builder following the conditional-spread house style, with ISO date coercion.

- [ ] **Step 1: Append `buildEventJsonLd`** to `src/lib/seo.ts` (after `buildArtistJsonLd`)

```ts
export function buildEventJsonLd(event: {
  title: string
  slug: string
  startDate: string | Date
  endDate?: string | Date | null
  excerpt?: string | null
  heroImage?: string | null
  locationName?: string | null
  locationAddress?: string | null
  performers?: { name: string; slug: string }[] | null
  priceTiers?: { name: string; price: number | null; currency?: string | null; buyUrl?: string | null }[] | null
}) {
  const iso = (d: string | Date) => (typeof d === 'string' ? d : d.toISOString())
  return {
    '@context': 'https://schema.org',
    '@type': 'MusicEvent',
    name: event.title,
    url: `${SITE_URL}/events/${event.slug}`,
    startDate: iso(event.startDate),
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    ...(event.endDate ? { endDate: iso(event.endDate) } : {}),
    ...(event.excerpt ? { description: event.excerpt } : {}),
    ...(event.heroImage ? { image: event.heroImage } : {}),
    ...(event.locationName
      ? {
          location: {
            '@type': 'Place',
            name: event.locationName,
            ...(event.locationAddress ? { address: event.locationAddress } : {}),
          },
        }
      : {}),
    ...(event.performers?.length
      ? { performer: event.performers.map((p) => ({ '@type': 'MusicGroup', name: p.name, url: `${SITE_URL}/kuenstler/${p.slug}` })) }
      : {}),
    ...(event.priceTiers?.length
      ? {
          offers: event.priceTiers.map((t) => ({
            '@type': 'Offer',
            name: t.name,
            ...(t.price !== null && t.price !== undefined ? { price: t.price, priceCurrency: t.currency || 'EUR' } : {}),
            availability: 'https://schema.org/InStock',
            url: t.buyUrl || `${SITE_URL}/events/${event.slug}`,
          })),
        }
      : {}),
  }
}
```

> `SITE_URL` is the existing module-level const — reuse it; do not re-derive. The `<JsonLd>` component does the escaping, so this returns a plain object.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/lib/seo.ts
git commit -m "feat(events): buildEventJsonLd (schema.org MusicEvent)"
```

---

## Task 6: API — events collection route (GET list + POST create)

**Files:**
- Create: `src/lib/admin-auth.ts`
- Create: `src/app/api/admin/events/route.ts`

DRY improvement: the 5 new event routes share one auth helper module (`admin-auth.ts`) instead of inlining `getSessionToken` five times. The artist routes keep their inline copy (don't refactor shipped code).

- [ ] **Step 1: Create `src/lib/admin-auth.ts`**

```ts
import { cookies } from 'next/headers'
import { getToken } from 'next-auth/jwt'
import { NextResponse } from 'next/server'
import { getTenant } from './tenant'
import type { Tenant } from '@prisma/client'
import type { JWT } from 'next-auth/jwt'

export async function getSessionToken() {
  const cookieStore = await cookies()
  return getToken({
    req: {
      cookies: Object.fromEntries(cookieStore.getAll().map((c) => [c.name, c.value])),
    } as any,
    secret: process.env.NEXTAUTH_SECRET,
  })
}

export type AuthContext = { token: JWT; tenant: Tenant }

export async function authTenant(): Promise<{ error: NextResponse } | AuthContext> {
  const token = await getSessionToken()
  if (!token || !['ADMIN', 'SUPER_ADMIN'].includes(token.role as string)) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  const tenant = await getTenant()
  if (!tenant) return { error: NextResponse.json({ error: 'Tenant not found' }, { status: 404 }) }
  return { token, tenant }
}
```

- [ ] **Step 2: Create `src/app/api/admin/events/route.ts`**

```ts
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
```

- [ ] **Step 3: Type-check + build**

Run: `npx tsc --noEmit && npm run build`
Expected: both succeed (build compiles the new route).

- [ ] **Step 4: Runtime smoke (unauthenticated → 401)**

Run (dev server in another terminal via `npm run dev`):
`curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/admin/events`
Expected: `401` (no session cookie → `authTenant` rejects). This confirms the gate fires.

- [ ] **Step 5: Commit**

```bash
git add src/lib/admin-auth.ts src/app/api/admin/events/route.ts
git commit -m "feat(events): admin events collection route + shared auth helper"
```

---

## Task 7: API — events item route (GET + PUT + DELETE)

**Files:**
- Create: `src/app/api/admin/events/[id]/route.ts`

Mirrors the artist `[id]` route: async params, fetch-then-tenant-check IDOR guard, PUT field-allowlist, **price-tier replace-all** inside a single `$transaction`, DELETE relies on schema cascade → 204. Stages/appearances are NOT touched here (granular routes, Tasks 8–9).

- [ ] **Step 1: Create `src/app/api/admin/events/[id]/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authTenant } from '@/lib/admin-auth'
import {
  normalizeSlug, isValidSlug, safeHttpsUrl, safeCloudinaryUrl,
  sanitizeEventType, sanitizePriceTier,
} from '@/lib/event-validation'

const EVENT_INCLUDE = {
  stages: { orderBy: { sortOrder: 'asc' as const } },
  priceTiers: { orderBy: { sortOrder: 'asc' as const } },
  appearances: {
    include: { artist: { select: { slug: true, name: true } }, stage: true },
    orderBy: [{ startTime: 'asc' as const }, { sortOrder: 'asc' as const }],
  },
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await authTenant()
  if ('error' in ctx) return ctx.error
  const event = await prisma.event.findUnique({ where: { id }, include: EVENT_INCLUDE })
  if (!event || event.tenantId !== ctx.tenant.id) return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  return NextResponse.json(event)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await authTenant()
  if ('error' in ctx) return ctx.error
  const existing = await prisma.event.findUnique({ where: { id } })
  if (!existing || existing.tenantId !== ctx.tenant.id) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

  const body = await req.json()
  const data: Record<string, unknown> = { updatedById: (ctx.token.sub as string) || null }

  if (body.title !== undefined) data.title = String(body.title).trim()
  if (body.subtitle !== undefined) data.subtitle = body.subtitle ? String(body.subtitle) : null
  if (body.eventType !== undefined) data.eventType = sanitizeEventType(body.eventType)
  if (body.startDate !== undefined) {
    const d = new Date(String(body.startDate))
    if (isNaN(d.getTime())) return NextResponse.json({ error: 'Ungültiges Startdatum' }, { status: 400 })
    data.startDate = d
  }
  if (body.endDate !== undefined) {
    if (!body.endDate) data.endDate = null
    else {
      const d = new Date(String(body.endDate))
      if (isNaN(d.getTime())) return NextResponse.json({ error: 'Ungültiges Enddatum' }, { status: 400 })
      data.endDate = d
    }
  }
  if (body.locationName !== undefined) data.locationName = body.locationName ? String(body.locationName) : null
  if (body.locationAddress !== undefined) data.locationAddress = body.locationAddress ? String(body.locationAddress) : null
  if (body.locationUrl !== undefined) data.locationUrl = safeHttpsUrl(body.locationUrl)
  if (body.heroImage !== undefined) data.heroImage = safeCloudinaryUrl(body.heroImage)
  if (body.excerpt !== undefined) data.excerpt = body.excerpt ? String(body.excerpt) : null
  if (body.description !== undefined) data.description = body.description ? String(body.description) : null
  if (body.descriptionJson !== undefined) data.descriptionJson = Array.isArray(body.descriptionJson) ? body.descriptionJson : null
  if (body.editorMode !== undefined) {
    const mode = String(body.editorMode)
    data.editorMode = ['markdown', 'wysiwyg'].includes(mode) ? mode : 'markdown'
  }
  if (body.ticketUrl !== undefined) data.ticketUrl = safeHttpsUrl(body.ticketUrl)
  if (body.metaTitle !== undefined) data.metaTitle = body.metaTitle ? String(body.metaTitle) : null
  if (body.metaDescription !== undefined) data.metaDescription = body.metaDescription ? String(body.metaDescription) : null
  if (body.isPublished !== undefined) data.isPublished = body.isPublished === true
  if (body.isActive !== undefined) data.isActive = body.isActive === true
  if (body.isFeatured !== undefined) data.isFeatured = body.isFeatured === true
  if (body.sortOrder !== undefined) data.sortOrder = Number(body.sortOrder) || 0

  if (body.slug !== undefined) {
    const slug = normalizeSlug(body.slug)
    if (!isValidSlug(slug)) return NextResponse.json({ error: 'Ungültiger Slug' }, { status: 400 })
    const clash = await prisma.event.findUnique({ where: { tenantId_slug: { tenantId: ctx.tenant.id, slug } } })
    if (clash && clash.id !== id) return NextResponse.json({ error: 'Slug bereits vergeben' }, { status: 409 })
    data.slug = slug
  }

  if (Array.isArray(body.priceTiers)) {
    const clean = body.priceTiers
      .map((t: unknown, i: number) => sanitizePriceTier(t, i))
      .filter(Boolean) as NonNullable<ReturnType<typeof sanitizePriceTier>>[]
    await prisma.$transaction([
      prisma.priceTier.deleteMany({ where: { eventId: id } }),
      prisma.event.update({ where: { id }, data }),
      prisma.priceTier.createMany({
        data: clean.map((t, i) => ({
          eventId: id, name: t.name, description: t.description, price: t.price, currency: t.currency,
          validFrom: t.validFrom, validUntil: t.validUntil, isSoldOut: t.isSoldOut, isActive: t.isActive,
          buyUrl: t.buyUrl, sortOrder: i,
        })),
      }),
    ])
  } else {
    await prisma.event.update({ where: { id }, data })
  }

  const updated = await prisma.event.findUnique({ where: { id }, include: EVENT_INCLUDE })
  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await authTenant()
  if ('error' in ctx) return ctx.error
  const existing = await prisma.event.findUnique({ where: { id } })
  if (!existing || existing.tenantId !== ctx.tenant.id) return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  await prisma.event.delete({ where: { id } })
  return new NextResponse(null, { status: 204 })
}
```

- [ ] **Step 2: Type-check + build**

Run: `npx tsc --noEmit && npm run build`
Expected: both succeed.

- [ ] **Step 3: Runtime smoke (unauthenticated → 401)**

Run: `curl -s -o /dev/null -w "%{http_code}\n" -X DELETE http://localhost:3000/api/admin/events/nonexistent`
Expected: `401`.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/admin/events/[id]/route.ts
git commit -m "feat(events): admin event item route (GET/PUT/DELETE + tier replace-all)"
```

---

## Task 8: API — stages sub-resource routes

**Files:**
- Create: `src/app/api/admin/events/[id]/stages/route.ts`
- Create: `src/app/api/admin/events/[id]/stages/[stageId]/route.ts`

Granular per-row endpoints (spec ⑤). Every handler verifies the parent event belongs to the tenant (IDOR), and the `[stageId]` handlers additionally verify the stage belongs to that event.

- [ ] **Step 1: Create `src/app/api/admin/events/[id]/stages/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authTenant } from '@/lib/admin-auth'
import { sanitizeStage } from '@/lib/event-validation'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await authTenant()
  if ('error' in ctx) return ctx.error
  const event = await prisma.event.findUnique({ where: { id } })
  if (!event || event.tenantId !== ctx.tenant.id) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

  const body = await req.json()
  const clean = sanitizeStage(body, Number(body.sortOrder) || 0)
  if (!clean) return NextResponse.json({ error: 'Name ist erforderlich' }, { status: 400 })

  const stage = await prisma.stage.create({
    data: { eventId: id, name: clean.name, color: clean.color, sortOrder: clean.sortOrder },
  })
  return NextResponse.json(stage, { status: 201 })
}
```

- [ ] **Step 2: Create `src/app/api/admin/events/[id]/stages/[stageId]/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authTenant } from '@/lib/admin-auth'
import { sanitizeStage } from '@/lib/event-validation'

async function loadStage(eventId: string, stageId: string, tenantId: string) {
  const stage = await prisma.stage.findUnique({ where: { id: stageId }, include: { event: true } })
  if (!stage || stage.eventId !== eventId || stage.event.tenantId !== tenantId) return null
  return stage
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string; stageId: string }> }) {
  const { id, stageId } = await params
  const ctx = await authTenant()
  if ('error' in ctx) return ctx.error
  if (!(await loadStage(id, stageId, ctx.tenant.id))) return NextResponse.json({ error: 'Stage not found' }, { status: 404 })

  const body = await req.json()
  const clean = sanitizeStage(body, Number(body.sortOrder) || 0)
  if (!clean) return NextResponse.json({ error: 'Name ist erforderlich' }, { status: 400 })

  const stage = await prisma.stage.update({
    where: { id: stageId },
    data: { name: clean.name, color: clean.color, sortOrder: clean.sortOrder },
  })
  return NextResponse.json(stage)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; stageId: string }> }) {
  const { id, stageId } = await params
  const ctx = await authTenant()
  if ('error' in ctx) return ctx.error
  if (!(await loadStage(id, stageId, ctx.tenant.id))) return NextResponse.json({ error: 'Stage not found' }, { status: 404 })
  await prisma.stage.delete({ where: { id: stageId } })
  return new NextResponse(null, { status: 204 })
}
```

> Deleting a stage cascade-deletes its appearances (schema `onDelete: Cascade` on `Appearance.stage`). The admin UI must reload appearances after a stage delete.

- [ ] **Step 3: Type-check + build**

Run: `npx tsc --noEmit && npm run build`
Expected: both succeed.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/admin/events/[id]/stages
git commit -m "feat(events): granular stage sub-resource routes"
```

---

## Task 9: API — appearances sub-resource routes

**Files:**
- Create: `src/app/api/admin/events/[id]/appearances/route.ts`
- Create: `src/app/api/admin/events/[id]/appearances/[appId]/route.ts`

Granular per-slot endpoints. Beyond the event IDOR check, these enforce: the chosen `stageId` belongs to this event, and any `artistId` belongs to the **same tenant** (cross-tenant IDOR guard — the one DB-dependent invariant the pure sanitizer can't do).

- [ ] **Step 1: Create `src/app/api/admin/events/[id]/appearances/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authTenant } from '@/lib/admin-auth'
import { sanitizeAppearance } from '@/lib/event-validation'

// Verifies the stage belongs to the event and (if linked) the artist belongs to the tenant.
async function validateRefs(eventId: string, tenantId: string, stageId: string, artistId: string | null) {
  const stage = await prisma.stage.findUnique({ where: { id: stageId } })
  if (!stage || stage.eventId !== eventId) return 'Bühne gehört nicht zu diesem Event'
  if (artistId) {
    const artist = await prisma.artist.findUnique({ where: { id: artistId } })
    if (!artist || artist.tenantId !== tenantId) return 'Künstler nicht gefunden'
  }
  return null
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await authTenant()
  if ('error' in ctx) return ctx.error
  const event = await prisma.event.findUnique({ where: { id } })
  if (!event || event.tenantId !== ctx.tenant.id) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

  const body = await req.json()
  const clean = sanitizeAppearance(body, Number(body.sortOrder) || 0)
  if (!clean) return NextResponse.json({ error: 'Bühne, Startzeit und Künstler oder Titel sind erforderlich' }, { status: 400 })

  const refErr = await validateRefs(id, ctx.tenant.id, clean.stageId, clean.artistId)
  if (refErr) return NextResponse.json({ error: refErr }, { status: 400 })

  const appearance = await prisma.appearance.create({
    data: {
      eventId: id, stageId: clean.stageId, artistId: clean.artistId, title: clean.title,
      role: clean.role, startTime: clean.startTime, endTime: clean.endTime, note: clean.note, sortOrder: clean.sortOrder,
    },
  })
  return NextResponse.json(appearance, { status: 201 })
}
```

- [ ] **Step 2: Create `src/app/api/admin/events/[id]/appearances/[appId]/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authTenant } from '@/lib/admin-auth'
import { sanitizeAppearance } from '@/lib/event-validation'

async function loadAppearance(eventId: string, appId: string, tenantId: string) {
  const appearance = await prisma.appearance.findUnique({ where: { id: appId }, include: { event: true } })
  if (!appearance || appearance.eventId !== eventId || appearance.event.tenantId !== tenantId) return null
  return appearance
}

async function validateRefs(eventId: string, tenantId: string, stageId: string, artistId: string | null) {
  const stage = await prisma.stage.findUnique({ where: { id: stageId } })
  if (!stage || stage.eventId !== eventId) return 'Bühne gehört nicht zu diesem Event'
  if (artistId) {
    const artist = await prisma.artist.findUnique({ where: { id: artistId } })
    if (!artist || artist.tenantId !== tenantId) return 'Künstler nicht gefunden'
  }
  return null
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string; appId: string }> }) {
  const { id, appId } = await params
  const ctx = await authTenant()
  if ('error' in ctx) return ctx.error
  if (!(await loadAppearance(id, appId, ctx.tenant.id))) return NextResponse.json({ error: 'Appearance not found' }, { status: 404 })

  const body = await req.json()
  const clean = sanitizeAppearance(body, Number(body.sortOrder) || 0)
  if (!clean) return NextResponse.json({ error: 'Bühne, Startzeit und Künstler oder Titel sind erforderlich' }, { status: 400 })

  const refErr = await validateRefs(id, ctx.tenant.id, clean.stageId, clean.artistId)
  if (refErr) return NextResponse.json({ error: refErr }, { status: 400 })

  const appearance = await prisma.appearance.update({
    where: { id: appId },
    data: {
      stageId: clean.stageId, artistId: clean.artistId, title: clean.title,
      role: clean.role, startTime: clean.startTime, endTime: clean.endTime, note: clean.note, sortOrder: clean.sortOrder,
    },
  })
  return NextResponse.json(appearance)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; appId: string }> }) {
  const { id, appId } = await params
  const ctx = await authTenant()
  if ('error' in ctx) return ctx.error
  if (!(await loadAppearance(id, appId, ctx.tenant.id))) return NextResponse.json({ error: 'Appearance not found' }, { status: 404 })
  await prisma.appearance.delete({ where: { id: appId } })
  return new NextResponse(null, { status: 204 })
}
```

- [ ] **Step 3: Type-check + build**

Run: `npx tsc --noEmit && npm run build`
Expected: both succeed.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/admin/events/[id]/appearances
git commit -m "feat(events): granular appearance sub-resource routes (XOR + IDOR guards)"
```

---

## Task 10: `EventCard` component + `EventSummary`

**Files:**
- Create: `src/components/events/EventCard.tsx`

Server-compatible card (no `'use client'`, like `ArtistCard`). Renders heroImage-or-placeholder, date range, venue, title, excerpt, "Hauptevent" pill when featured. Imports `EventSummary` from `@/lib/events`.

- [ ] **Step 1: Create `src/components/events/EventCard.tsx`**

```tsx
import Link from 'next/link'
import Image from 'next/image'
import type { EventSummary } from '@/lib/events'

function formatRange(start: Date, end: Date | null): string {
  const fmt = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })
  if (!end || start.toDateString() === end.toDateString()) return fmt.format(start)
  const dayFmt = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: 'long' })
  return `${dayFmt.format(start)} – ${fmt.format(end)}`
}

export default function EventCard({ event, priority = false }: { event: EventSummary; priority?: boolean }) {
  return (
    <Link href={`/events/${event.slug}`} className="glass-card group block overflow-hidden rounded-section transition-all hover:shadow-card-hover">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-brand-primary/10">
        {event.heroImage ? (
          <Image src={event.heroImage} alt={event.title} width={600} height={450} priority={priority}
            className="h-full w-full object-cover transition-transform motion-safe:group-hover:scale-105" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl text-brand-primary/40">♪</div>
        )}
      </div>
      <div className="p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-accent">{formatRange(event.startDate, event.endDate)}</p>
        <h3 className="mt-2 font-display text-xl font-bold leading-snug text-brand-text">{event.title}</h3>
        {event.isFeatured && (
          <span className="mt-2 inline-block rounded-pill bg-brand-accent/10 px-3 py-0.5 text-xs font-semibold text-brand-accent">Hauptevent</span>
        )}
        {event.locationName && <p className="mt-1 text-sm text-brand-text-muted">{event.locationName}</p>}
        {event.excerpt && <p className="mt-3 line-clamp-2 text-sm text-brand-text-muted">{event.excerpt}</p>}
      </div>
    </Link>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/events/EventCard.tsx
git commit -m "feat(events): EventCard list component"
```

---

## Task 11: Public `/events` list page

**Files:**
- Create: `src/app/(public)/events/page.tsx`

`force-dynamic`. Lists `getPublishedEvents()` as `EventCard`s; empty-state when none.

- [ ] **Step 1: Create `src/app/(public)/events/page.tsx`**

```tsx
import type { Metadata } from 'next'
import { getPublishedEvents } from '@/lib/events'
import { buildMetadata } from '@/lib/seo'
import EventCard from '@/components/events/EventCard'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata(null, '/events', {
    title: 'Events & Programm – e-Ventschau',
    description: 'Alle Veranstaltungen des e-Ventschau-Benefiz-Festivals – Termine, Line-up und Tickets.',
  })
}

export default async function EventsIndexPage() {
  const events = await getPublishedEvents()
  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
      <div className="mb-10 text-center">
        <h1 className="font-display text-3xl font-bold text-brand-text sm:text-4xl">Events</h1>
        <p className="mt-3 text-brand-text-muted">Termine, Line-up und Tickets für die e-Ventschau.</p>
      </div>
      {events.length === 0 ? (
        <p className="text-center text-brand-text-muted">Aktuell sind keine Veranstaltungen angekündigt.</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event, i) => (
            <EventCard key={event.slug} event={event} priority={i < 3} />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: success; build output lists `/events` as a route.

- [ ] **Step 3: Runtime check**

Run (dev server up): `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/events`
Expected: `200`. (Page renders the empty-state until Task 24 seeds events.)

- [ ] **Step 4: Commit**

```bash
git add src/app/(public)/events/page.tsx
git commit -m "feat(events): public /events list page"
```

---

## Task 12: `EventTimetable` component (responsive)

**Files:**
- Create: `src/components/events/EventTimetable.tsx`

Server component. Desktop: grid (Bühne × Zeit) with day-tabs for multi-day (CSS-only tabs via radio inputs so it stays server-rendered); mobile: agenda list grouped by day → time. Artist-linked slots link to `/kuenstler/[slug]`; free-text slots render muted/non-clickable; headliners get a ★.

- [ ] **Step 1: Create `src/components/events/EventTimetable.tsx`**

```tsx
import Link from 'next/link'
import type { EventWithRelations } from '@/lib/events'

type Appearance = EventWithRelations['appearances'][number]

const dayKey = (d: Date) => d.toISOString().slice(0, 10)
const dayLabel = (d: Date) => new Intl.DateTimeFormat('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' }).format(d)
const timeLabel = (d: Date) => new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' }).format(d)

function slotLabel(a: Appearance) {
  return a.artist ? a.artist.name : (a.title ?? '')
}

function Slot({ a }: { a: Appearance }) {
  const isHeadliner = a.role === 'headliner'
  const star = isHeadliner ? '★ ' : ''
  if (a.artist) {
    return (
      <Link href={`/kuenstler/${a.artist.slug}`} className="block rounded-pill px-2 py-1 text-sm font-medium text-brand-text hover:text-brand-accent">
        {star}{a.artist.name}
      </Link>
    )
  }
  return <span className="block px-2 py-1 text-sm text-brand-text-muted">{a.title}</span>
}

export default function EventTimetable({ event }: { event: EventWithRelations }) {
  const { stages, appearances } = event
  if (appearances.length === 0) return null

  // group by day
  const days = Array.from(new Set(appearances.map((a) => dayKey(a.startTime)))).sort()
  const sortedStages = [...stages].sort((s1, s2) => s1.sortOrder - s2.sortOrder)

  return (
    <section className="mb-10">
      <h2 className="mb-4 font-display text-2xl font-bold text-brand-text">Timetable</h2>

      {/* Mobile: agenda list */}
      <div className="space-y-6 md:hidden">
        {days.map((day) => {
          const rows = appearances.filter((a) => dayKey(a.startTime) === day)
          return (
            <div key={day}>
              <h3 className="mb-2 border-b border-brand-text/10 pb-1 font-display text-lg font-bold text-brand-text">
                {dayLabel(new Date(day + 'T00:00:00'))}
              </h3>
              <ul className="space-y-1">
                {rows.map((a) => (
                  <li key={a.id} className="flex items-baseline gap-3 text-sm">
                    <span className="w-12 shrink-0 tabular-nums text-brand-text-muted">{timeLabel(a.startTime)}</span>
                    <span className="flex-1">{a.role === 'headliner' ? '★ ' : ''}{slotLabel(a) || '—'}</span>
                    <span className="shrink-0 text-xs text-brand-text-muted">{a.stage?.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>

      {/* Desktop: grid per day (Bühne × Zeit) */}
      <div className="hidden space-y-8 md:block">
        {days.map((day) => {
          const dayRows = appearances.filter((a) => dayKey(a.startTime) === day)
          const times = Array.from(new Set(dayRows.map((a) => a.startTime.toISOString()))).sort()
          return (
            <div key={day} className="overflow-x-auto">
              <h3 className="mb-3 font-display text-lg font-bold text-brand-text">{dayLabel(new Date(day + 'T00:00:00'))}</h3>
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr>
                    <th className="w-20 border-b border-brand-text/10 p-2 text-xs uppercase tracking-wider text-brand-text-muted">Zeit</th>
                    {sortedStages.map((s) => (
                      <th key={s.id} className="border-b border-brand-text/10 p-2 text-xs uppercase tracking-wider text-brand-text-muted"
                        style={s.color ? { color: s.color } : undefined}>
                        {s.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {times.map((t) => (
                    <tr key={t}>
                      <td className="border-b border-brand-text/5 p-2 align-top text-sm tabular-nums text-brand-text-muted">
                        {timeLabel(new Date(t))}
                      </td>
                      {sortedStages.map((s) => {
                        const cell = dayRows.filter((a) => a.stageId === s.id && a.startTime.toISOString() === t)
                        return (
                          <td key={s.id} className="border-b border-brand-text/5 p-1 align-top">
                            {cell.map((a) => <Slot key={a.id} a={a} />)}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        })}
      </div>
      <p className="mt-3 text-xs text-brand-text-muted">★ = Headliner · klickbare Slots führen zur Künstler-Seite</p>
    </section>
  )
}
```

> Grid time-rows are derived from the sorted distinct start times of that day (not a fixed 24h axis). Single-day events render exactly one day block (no tab chrome needed). `overflow-x-auto` keeps wide multistage grids usable on tablets.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/events/EventTimetable.tsx
git commit -m "feat(events): responsive timetable (desktop grid + mobile agenda)"
```

---

## Task 13: Public `/events/[slug]` detail page

**Files:**
- Create: `src/app/(public)/events/[slug]/page.tsx`

`React.cache(getPublishedEventBySlug)`, `notFound()` on null, async params. Sections: Hero → Beschreibung (`MarkdownContent`, no rehype-raw) → Timetable → Line-up (`ArtistCard` grid) → Preise (PriceTier cards, external `buyUrl` with `rel="noopener noreferrer nofollow"`) → Ticket-CTA → JSON-LD via `<JsonLd>`.

- [ ] **Step 1: Create `src/app/(public)/events/[slug]/page.tsx`**

```tsx
import type { Metadata } from 'next'
import { cache } from 'react'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { getPublishedEventBySlug } from '@/lib/events'
import { buildMetadata, buildEventJsonLd } from '@/lib/seo'
import JsonLd from '@/components/JsonLd'
import MarkdownContent from '@/components/MarkdownContent'
import ArtistCard from '@/components/artists/ArtistCard'
import EventTimetable from '@/components/events/EventTimetable'

export const dynamic = 'force-dynamic'

const getEvent = cache(getPublishedEventBySlug)

type Props = { params: Promise<{ slug: string }> }

function formatRange(start: Date, end: Date | null): string {
  const fmt = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })
  if (!end || start.toDateString() === end.toDateString()) return fmt.format(start)
  const dayFmt = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: 'long' })
  return `${dayFmt.format(start)} – ${fmt.format(end)}`
}

function formatPrice(price: number | null, currency: string): string {
  if (price === null) return 'auf Anfrage'
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency }).format(price)
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const event = await getEvent(slug)
  if (!event) return buildMetadata(null, `/events/${slug}`, { title: 'Event nicht gefunden', description: '' })
  return buildMetadata(null, `/events/${slug}`, {
    title: event.metaTitle || `${event.title} – e-Ventschau`,
    description: event.metaDescription || event.excerpt || `${event.title} beim e-Ventschau-Festival.`,
    ogImage: event.heroImage || undefined,
  })
}

export default async function EventDetailPage({ params }: Props) {
  const { slug } = await params
  const event = await getEvent(slug)
  if (!event) notFound()

  const lineup = event.appearances.filter((a) => a.artist)
  const seenArtists = new Set<string>()
  const uniqueLineup = lineup.filter((a) => {
    if (!a.artist || seenArtists.has(a.artist.slug)) return false
    seenArtists.add(a.artist.slug)
    return true
  })

  return (
    <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6 lg:px-8">
      <JsonLd
        data={buildEventJsonLd({
          title: event.title,
          slug: event.slug,
          startDate: event.startDate,
          endDate: event.endDate,
          excerpt: event.excerpt,
          heroImage: event.heroImage,
          locationName: event.locationName,
          locationAddress: event.locationAddress,
          performers: uniqueLineup.map((a) => ({ name: a.artist!.name, slug: a.artist!.slug })),
          priceTiers: event.priceTiers.map((t) => ({ name: t.name, price: t.price, currency: t.currency, buyUrl: t.buyUrl })),
        })}
      />

      {/* Hero */}
      <header className="mb-10">
        {event.heroImage && (
          <div className="relative mb-6 aspect-[16/9] w-full overflow-hidden rounded-section bg-brand-primary/10">
            <Image src={event.heroImage} alt={event.title} fill priority className="object-cover" />
          </div>
        )}
        <p className="text-sm font-semibold uppercase tracking-wider text-brand-accent">{formatRange(event.startDate, event.endDate)}</p>
        <h1 className="mt-2 font-display text-3xl font-bold text-brand-text sm:text-5xl">{event.title}</h1>
        {event.subtitle && <p className="mt-3 text-lg text-brand-text-muted">{event.subtitle}</p>}
        {event.locationName && (
          <p className="mt-3 text-brand-text-muted">
            {event.locationUrl ? (
              <a href={event.locationUrl} target="_blank" rel="noopener noreferrer nofollow" className="underline hover:text-brand-accent">
                {event.locationName}
              </a>
            ) : event.locationName}
            {event.locationAddress ? ` · ${event.locationAddress}` : ''}
          </p>
        )}
      </header>

      {/* Beschreibung */}
      {event.description && (
        <section className="mb-10">
          <MarkdownContent content={event.description} />
        </section>
      )}

      {/* Timetable */}
      <EventTimetable event={event} />

      {/* Line-up */}
      {uniqueLineup.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-4 font-display text-2xl font-bold text-brand-text">Line-up</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {uniqueLineup.map((a) => (
              <ArtistCard key={a.artist!.slug} artist={{ slug: a.artist!.slug, name: a.artist!.name, isFeatured: a.role === 'headliner' }} />
            ))}
          </div>
        </section>
      )}

      {/* Preise */}
      {event.priceTiers.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-4 font-display text-2xl font-bold text-brand-text">Preise</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {event.priceTiers.map((t) => (
              <div key={t.id} className="glass-card rounded-section p-5">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="font-display text-lg font-bold text-brand-text">{t.name}</h3>
                  <span className="shrink-0 font-semibold text-brand-accent">{formatPrice(t.price, t.currency)}</span>
                </div>
                {t.description && <p className="mt-1 text-sm text-brand-text-muted">{t.description}</p>}
                {t.isSoldOut && <span className="mt-2 inline-block rounded-pill bg-red-100 px-3 py-0.5 text-xs font-semibold text-red-700">Ausverkauft</span>}
                {t.buyUrl && !t.isSoldOut && (
                  <a href={t.buyUrl} target="_blank" rel="noopener noreferrer nofollow" className="btn-secondary mt-3 inline-block px-4 py-1.5 text-sm">
                    Ticket kaufen
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Ticket-CTA */}
      {event.ticketUrl && (
        <section className="text-center">
          <a href={event.ticketUrl} target="_blank" rel="noopener noreferrer nofollow" className="btn-primary px-7 py-3 text-base">
            Tickets sichern
          </a>
        </section>
      )}
    </div>
  )
}
```

> The Line-up reuses `ArtistCard` with a minimal `ArtistSummary` (`slug`/`name`/`isFeatured`). The card's other fields are optional and degrade gracefully (placeholder image, no genres line) — acceptable here since the full artist record lives at `/kuenstler/[slug]`.

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: success; `/events/[slug]` appears in the route list.

- [ ] **Step 3: Runtime check (draft/missing → 404)**

Run (dev server up): `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/events/does-not-exist`
Expected: `404` (the `notFound()` path). Full render is verified after seeding (Task 24).

- [ ] **Step 4: Commit**

```bash
git add src/app/(public)/events/[slug]/page.tsx
git commit -m "feat(events): public event detail page (timetable/lineup/prices/JSON-LD)"
```

---

## Task 14: Wire up the Artist "Auftritte" section

**Files:**
- Modify: `src/app/(public)/kuenstler/[slug]/page.tsx`

Replace the Spec-1 placeholder comment (the last child of the outer `<div>`, after the Galerie block) with a guarded section fed by `getArtistAppearances(artist.id)`. This is a separate query from the cached `getArtist` (different data), so it does not violate the React.cache de-dupe contract.

- [ ] **Step 1: Add the import** near the other `@/lib` imports at the top of the file

```tsx
import { getArtistAppearances } from '@/lib/events'
```

- [ ] **Step 2: Load appearances** in the page body, right after `if (!artist) notFound()`

```tsx
  const appearances = await getArtistAppearances(artist.id)
```

- [ ] **Step 3: Replace the placeholder comment** — find:

```tsx
      {/* "Auftritte"-Sektion wird erst in Spec 2 (Events) befüllt — bis dahin bewusst nicht gerendert. */}
```

and replace with:

```tsx
      {appearances.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-4 font-display text-2xl font-bold text-brand-text">Auftritte</h2>
          <ul className="space-y-2">
            {appearances.map((a) => {
              const date = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: 'long', year: 'numeric' }).format(a.startTime)
              const time = new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' }).format(a.startTime)
              return (
                <li key={a.id} className="glass-card rounded-section p-4">
                  <Link href={`/events/${a.event.slug}`} className="font-semibold text-brand-text hover:text-brand-accent">
                    {a.event.title}
                  </Link>
                  <p className="mt-1 text-sm text-brand-text-muted">{date} · {time} Uhr · {a.stage.name}</p>
                </li>
              )
            })}
          </ul>
        </section>
      )}
```

> If `Link` is not already imported in this file, add `import Link from 'next/link'` at the top. (Check the existing imports first — the artist detail page already uses links to socials/gallery, but verify.)

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: success.

- [ ] **Step 5: Runtime check (still renders for an existing artist)**

Run (dev server up): `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/kuenstler/rovar`
Expected: `200`. (The section stays hidden until appearances are seeded in Task 24; this confirms no regression.)

- [ ] **Step 6: Commit**

```bash
git add "src/app/(public)/kuenstler/[slug]/page.tsx"
git commit -m "feat(events): wire up artist Auftritte section"
```

---

## Task 15: Sitemap — add published events

**Files:**
- Modify: `src/app/sitemap.ts`

Mirror the artist block: fetch published+active events, map to `/events/<slug>` entries (`changeFrequency: 'monthly' as const`, `priority: 0.6`).

- [ ] **Step 1: Add the events fetch** after the existing `artists` fetch in `sitemap.ts`

```ts
  const events = await prisma.event.findMany({
    where: { tenantId: tenant.id, isPublished: true, isActive: true },
    select: { slug: true, updatedAt: true },
  })
```

- [ ] **Step 2: Add the events spread** to the returned array, alongside the existing `...artists.map(...)` spread

```ts
    ...events.map((e) => ({
      url: `${SITE_URL}/events/${e.slug}`,
      lastModified: e.updatedAt,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
```

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: success.

- [ ] **Step 4: Commit**

```bash
git add src/app/sitemap.ts
git commit -m "feat(events): add events to sitemap"
```

---

## Task 16: AdminNav — Events entry

**Files:**
- Modify: `src/components/admin/AdminNav.tsx`

Add `CalendarIcon` to the heroicons barrel import and a `{ name: 'Events', href: '/admin/events', icon: CalendarIcon }` item directly after the Künstler entry in the `inhalte` group. Active-highlight and auto-expand work automatically.

- [ ] **Step 1: Add `CalendarIcon`** to the existing `@heroicons/react/24/outline` import block

```ts
  CalendarIcon,
```

- [ ] **Step 2: Add the Events nav item** directly after `{ name: 'Künstler', href: '/admin/artists', icon: MusicalNoteIcon },`

```ts
        { name: 'Events', href: '/admin/events', icon: CalendarIcon },
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/AdminNav.tsx
git commit -m "feat(events): admin nav Events entry"
```

---

## Task 17: Admin `/admin/events` list page

**Files:**
- Create: `src/app/admin/events/page.tsx`

`'use client'`. Loads `GET /api/admin/events`, renders rows with publish/feature toggles (**status-check-before-state-update, not optimistic**), delete-with-confirm, and a "Neu" link. Mirrors the artist list page.

- [ ] **Step 1: Create `src/app/admin/events/page.tsx`**

```tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type EventRow = {
  id: string
  title: string
  slug: string
  startDate: string
  isPublished: boolean
  isActive: boolean
  isFeatured: boolean
  _count?: { stages: number; appearances: number; priceTiers: number }
}

export default function AdminEventsPage() {
  const [events, setEvents] = useState<EventRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/events')
      .then((r) => r.json())
      .then((d) => setEvents(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false))
  }, [])

  async function toggleField(id: string, field: 'isPublished' | 'isActive' | 'isFeatured', current: boolean) {
    const res = await fetch(`/api/admin/events/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: !current }),
    })
    if (!res.ok) return
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, [field]: !current } : e)))
  }

  async function remove(id: string) {
    if (!confirm('Veranstaltung wirklich löschen? Bühnen, Timetable und Preise werden mitgelöscht.')) return
    const res = await fetch(`/api/admin/events/${id}`, { method: 'DELETE' })
    if (!res.ok) return
    setEvents((prev) => prev.filter((e) => e.id !== id))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Events</h1>
        <Link href="/admin/events/new" className="btn-primary px-4 py-2">+ Neues Event</Link>
      </div>

      {loading ? (
        <p>Lädt…</p>
      ) : events.length === 0 ? (
        <p className="text-brand-text-muted">Noch keine Events angelegt.</p>
      ) : (
        <div className="grid gap-4">
          {events.map((e) => (
            <div key={e.id} className="glass-card flex items-center justify-between gap-4 p-4">
              <div>
                <p className="font-semibold">{e.title}</p>
                <p className="text-sm text-brand-text-muted">
                  /{e.slug} · {new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium' }).format(new Date(e.startDate))}
                  {e._count ? ` · ${e._count.appearances} Slots · ${e._count.stages} Bühnen` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <button onClick={() => toggleField(e.id, 'isPublished', e.isPublished)} aria-pressed={e.isPublished} aria-label="Veröffentlichungsstatus" className="rounded-pill px-3 py-1 glass">
                  {e.isPublished ? 'Veröffentlicht' : 'Entwurf'}
                </button>
                <button onClick={() => toggleField(e.id, 'isFeatured', e.isFeatured)} aria-pressed={e.isFeatured} aria-label="Hauptevent-Status" className="rounded-pill px-3 py-1 glass">
                  {e.isFeatured ? '★ Hauptevent' : '☆'}
                </button>
                <Link href={`/admin/events/${e.id}`} className="btn-secondary px-3 py-1">Bearbeiten</Link>
                <button onClick={() => remove(e.id)} className="px-3 py-1 text-red-600">Löschen</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: success.

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/events/page.tsx
git commit -m "feat(events): admin events list page"
```

---

## Task 18: Admin `/admin/events/new` page

**Files:**
- Create: `src/app/admin/events/new/page.tsx`

Minimal create (title + slug + startDate) → POST → redirect to edit. Auto-slug from title while slug is empty.

- [ ] **Step 1: Create `src/app/admin/events/new/page.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function NewEventPage() {
  const router = useRouter()
  const [form, setForm] = useState({ title: '', slug: '', startDate: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function update(field: keyof typeof form, value: string) {
    setForm((p) => {
      const next = { ...p, [field]: value }
      if (field === 'title' && !p.slug) {
        next.slug = value.toLowerCase()
          .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
          .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
      }
      return next
    })
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError('')
    const res = await fetch('/api/admin/events', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    if (!res.ok) { setError((await res.json().catch(() => ({}))).error || 'Fehler'); return }
    const event = await res.json()
    router.push(`/admin/events/${event.id}`)
  }

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="font-display text-2xl font-bold">Neues Event</h1>
      <form onSubmit={submit} className="space-y-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Titel</span>
          <input className="glass rounded-lg px-3 py-2" value={form.title} onChange={(e) => update('title', e.target.value)} required />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Slug</span>
          <input className="glass rounded-lg px-3 py-2" value={form.slug} onChange={(e) => update('slug', e.target.value)} required />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Startdatum &amp; Uhrzeit</span>
          <input type="datetime-local" className="glass rounded-lg px-3 py-2" value={form.startDate} onChange={(e) => update('startDate', e.target.value)} required />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={saving} className="btn-primary px-5 py-2">{saving ? 'Speichert…' : 'Erstellen'}</button>
      </form>
    </div>
  )
}
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: success.

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/events/new/page.tsx
git commit -m "feat(events): admin event create page"
```

---

## Task 21: Admin `/admin/events/[id]` edit page — core + description + hero + SEO + price tiers

> **Depends on Tasks 19 (StageManager) and 20 (TimetableBuilder)** — implement those first; this page imports both.

**Files:**
- Create: `src/app/admin/events/[id]/page.tsx`

`useParams()` (not `use(params)`). Dynamic Plate editor for `description`, MediaPicker for hero, SEO fields, and a **price-tier editor** (local array → sent in the main PUT body, replace-all). Stage manager + timetable builder are the child components from Tasks 19–20. All inputs labelled.

- [ ] **Step 1: Create `src/app/admin/events/[id]/page.tsx`**

```tsx
'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import type { TElement } from '@udecode/plate'
import { markdownToPlate } from '@/components/admin/editor/serialization/markdownToPlate'
import { plateToMarkdown } from '@/components/admin/editor/serialization/plateToMarkdown'
import MediaPickerDialog from '@/components/admin/MediaPickerDialog'
import StageManager from '@/components/admin/events/StageManager'
import TimetableBuilder from '@/components/admin/events/TimetableBuilder'

const PlateEditor = dynamic(
  () => import('@/components/admin/editor/PlateEditor').then((m) => ({ default: m.PlateEditor })),
  { ssr: false },
)

type TierRow = {
  id?: string; name: string; description?: string | null; price?: number | null
  currency?: string; validFrom?: string | null; validUntil?: string | null
  isSoldOut?: boolean; isActive?: boolean; buyUrl?: string | null
}

const EVENT_TYPES = ['festival', 'concert', 'workshop', 'other']

function toLocalInput(value: string | null | undefined): string {
  if (!value) return ''
  const d = new Date(value)
  if (isNaN(d.getTime())) return ''
  // datetime-local wants YYYY-MM-DDTHH:mm in local time
  const off = d.getTimezoneOffset()
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16)
}

export default function EditEventPage() {
  const params = useParams()
  const id = params.id as string

  const [form, setForm] = useState({
    title: '', slug: '', subtitle: '', eventType: 'festival', startDate: '', endDate: '',
    locationName: '', locationAddress: '', locationUrl: '', ticketUrl: '',
    heroImage: '', excerpt: '', metaTitle: '', metaDescription: '',
    isPublished: false, isFeatured: false, isActive: true,
  })
  const [descJson, setDescJson] = useState<TElement[] | null>(null)
  const [tiers, setTiers] = useState<TierRow[]>([])
  const [pickHero, setPickHero] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    fetch(`/api/admin/events/${id}`).then((r) => r.json()).then((e) => {
      setForm({
        title: e.title || '', slug: e.slug || '', subtitle: e.subtitle || '',
        eventType: e.eventType || 'festival',
        startDate: toLocalInput(e.startDate), endDate: toLocalInput(e.endDate),
        locationName: e.locationName || '', locationAddress: e.locationAddress || '', locationUrl: e.locationUrl || '',
        ticketUrl: e.ticketUrl || '', heroImage: e.heroImage || '', excerpt: e.excerpt || '',
        metaTitle: e.metaTitle || '', metaDescription: e.metaDescription || '',
        isPublished: !!e.isPublished, isFeatured: !!e.isFeatured, isActive: e.isActive !== false,
      })
      setDescJson(e.descriptionJson || markdownToPlate(e.description || ''))
      setTiers(Array.isArray(e.priceTiers) ? e.priceTiers.map((t: TierRow) => ({
        ...t, validFrom: toLocalInput(t.validFrom), validUntil: toLocalInput(t.validUntil),
      })) : [])
    })
  }, [id])

  function set<K extends keyof typeof form>(field: K, value: (typeof form)[K]) {
    setForm((p) => ({ ...p, [field]: value }))
  }

  async function save() {
    setSaveError('')
    const description = descJson ? plateToMarkdown(descJson) : ''
    const res = await fetch(`/api/admin/events/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        startDate: form.startDate ? new Date(form.startDate).toISOString() : undefined,
        endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
        description, descriptionJson: descJson, editorMode: 'wysiwyg',
        priceTiers: tiers.map((t) => ({
          ...t,
          price: (t.price === null || t.price === undefined) ? null : Number(t.price),
          validFrom: t.validFrom ? new Date(t.validFrom).toISOString() : null,
          validUntil: t.validUntil ? new Date(t.validUntil).toISOString() : null,
        })),
      }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setSaveError(body.error || `Fehler ${res.status}`)
      return
    }
    setSaved(true); setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="max-w-3xl space-y-8">
      <h1 className="font-display text-2xl font-bold">Event bearbeiten</h1>

      {/* Core fields */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1"><span className="text-sm font-medium">Titel</span>
          <input className="glass rounded-lg px-3 py-2" value={form.title} onChange={(e) => set('title', e.target.value)} /></label>
        <label className="flex flex-col gap-1"><span className="text-sm font-medium">Slug</span>
          <input className="glass rounded-lg px-3 py-2" value={form.slug} onChange={(e) => set('slug', e.target.value)} /></label>
        <label className="flex flex-col gap-1 sm:col-span-2"><span className="text-sm font-medium">Untertitel</span>
          <input className="glass rounded-lg px-3 py-2" value={form.subtitle} onChange={(e) => set('subtitle', e.target.value)} /></label>
        <label className="flex flex-col gap-1"><span className="text-sm font-medium">Typ</span>
          <select className="glass rounded-lg px-3 py-2" value={form.eventType} onChange={(e) => set('eventType', e.target.value)}>
            {EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select></label>
        <div />
        <label className="flex flex-col gap-1"><span className="text-sm font-medium">Start</span>
          <input type="datetime-local" className="glass rounded-lg px-3 py-2" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} /></label>
        <label className="flex flex-col gap-1"><span className="text-sm font-medium">Ende</span>
          <input type="datetime-local" className="glass rounded-lg px-3 py-2" value={form.endDate} onChange={(e) => set('endDate', e.target.value)} /></label>
        <label className="flex flex-col gap-1"><span className="text-sm font-medium">Ort (Name)</span>
          <input className="glass rounded-lg px-3 py-2" value={form.locationName} onChange={(e) => set('locationName', e.target.value)} /></label>
        <label className="flex flex-col gap-1"><span className="text-sm font-medium">Ort (Adresse)</span>
          <input className="glass rounded-lg px-3 py-2" value={form.locationAddress} onChange={(e) => set('locationAddress', e.target.value)} /></label>
        <label className="flex flex-col gap-1"><span className="text-sm font-medium">Karten-Link (https)</span>
          <input className="glass rounded-lg px-3 py-2" value={form.locationUrl} onChange={(e) => set('locationUrl', e.target.value)} /></label>
        <label className="flex flex-col gap-1"><span className="text-sm font-medium">Ticket-Link (https)</span>
          <input className="glass rounded-lg px-3 py-2" value={form.ticketUrl} onChange={(e) => set('ticketUrl', e.target.value)} /></label>
        <label className="flex flex-col gap-1 sm:col-span-2"><span className="text-sm font-medium">Teaser (excerpt)</span>
          <textarea className="glass rounded-lg px-3 py-2" rows={2} value={form.excerpt} onChange={(e) => set('excerpt', e.target.value)} /></label>
      </div>

      {/* Hero image */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">Hero-Bild</span>
        {form.heroImage && <span className="text-xs text-brand-text-muted">{form.heroImage.slice(0, 48)}…</span>}
        <button type="button" onClick={() => setPickHero(true)} className="btn-secondary px-3 py-1 text-sm">Bild wählen</button>
        {form.heroImage && <button type="button" onClick={() => set('heroImage', '')} className="text-sm text-red-600">Entfernen</button>}
      </div>

      {/* Description (Plate) */}
      <div>
        <span className="mb-1 block text-sm font-medium">Beschreibung</span>
        {descJson !== null && <PlateEditor initialValue={descJson} onChange={(v: TElement[]) => setDescJson(v)} />}
      </div>

      {/* Stage manager + timetable builder (Tasks 20–21) */}
      <StageManager eventId={id} />
      <TimetableBuilder eventId={id} />

      {/* Price tiers */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Preise</h2>
          <button type="button" onClick={() => setTiers((p) => [...p, { name: '', currency: 'EUR', isActive: true }])} className="btn-secondary px-3 py-1 text-sm">+ Preis</button>
        </div>
        {tiers.map((t, i) => (
          <div key={i} className="glass-card grid grid-cols-2 gap-2 p-3 sm:grid-cols-4">
            <label className="flex flex-col gap-1"><span className="sr-only" id={`tier-name-${i}`}>Name</span>
              <input aria-labelledby={`tier-name-${i}`} placeholder="Name" className="glass rounded px-2 py-1" value={t.name} onChange={(e) => setTiers((p) => p.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} /></label>
            <label className="flex flex-col gap-1"><span className="sr-only" id={`tier-price-${i}`}>Preis</span>
              <input aria-labelledby={`tier-price-${i}`} type="number" min="0" step="0.01" placeholder="Preis" className="glass rounded px-2 py-1" value={t.price ?? ''} onChange={(e) => setTiers((p) => p.map((x, j) => j === i ? { ...x, price: e.target.value === '' ? null : Number(e.target.value) } : x))} /></label>
            <label className="flex flex-col gap-1"><span className="sr-only" id={`tier-cur-${i}`}>Währung</span>
              <select aria-labelledby={`tier-cur-${i}`} className="glass rounded px-2 py-1" value={t.currency || 'EUR'} onChange={(e) => setTiers((p) => p.map((x, j) => j === i ? { ...x, currency: e.target.value } : x))}>
                {['EUR', 'USD', 'CHF', 'GBP'].map((c) => <option key={c} value={c}>{c}</option>)}
              </select></label>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={!!t.isSoldOut} onChange={(e) => setTiers((p) => p.map((x, j) => j === i ? { ...x, isSoldOut: e.target.checked } : x))} /> Ausverkauft</label>
              <button type="button" aria-label={`Preis ${i + 1} entfernen`} onClick={() => setTiers((p) => p.filter((_, j) => j !== i))} className="text-red-600">✕</button>
            </div>
          </div>
        ))}
      </div>

      {/* Status + save */}
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isPublished} onChange={(e) => set('isPublished', e.target.checked)} /> Veröffentlicht</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isFeatured} onChange={(e) => set('isFeatured', e.target.checked)} /> Hauptevent (Homepage)</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isActive} onChange={(e) => set('isActive', e.target.checked)} /> Aktiv</label>
        <button type="button" onClick={save} className="btn-primary px-5 py-2">Speichern</button>
        {saved && <span className="text-sm text-green-600">Gespeichert ✓</span>}
        {saveError && <span className="text-sm text-red-600">{saveError}</span>}
      </div>

      <MediaPickerDialog open={pickHero} onClose={() => setPickHero(false)} onSelect={(url) => { set('heroImage', url); setPickHero(false) }} />
    </div>
  )
}
```

> The price-tier editor saves with the main PUT (replace-all in `$transaction`). `StageManager`/`TimetableBuilder` (next two tasks) persist via their own granular endpoints and are independent of this Save button.

- [ ] **Step 2: Type-check + build** (StageManager + TimetableBuilder already exist from Tasks 19–20)

Run: `npx tsc --noEmit && npm run build`
Expected: both succeed.

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/events/[id]/page.tsx
git commit -m "feat(events): admin event edit page (core/desc/hero/SEO/tiers)"
```

---

## Task 19: `StageManager` component (granular stage endpoints)

**Files:**
- Create: `src/components/admin/events/StageManager.tsx`

`'use client'`. Loads stages from `GET /api/admin/events/[id]` (reuses the event GET which includes stages), then per-row add/edit/delete via the granular stage endpoints, each with status-check-before-state-update.

- [ ] **Step 1: Create `src/components/admin/events/StageManager.tsx`**

```tsx
'use client'

import { useEffect, useState } from 'react'

type Stage = { id: string; name: string; color: string | null; sortOrder: number }

export default function StageManager({ eventId }: { eventId: string }) {
  const [stages, setStages] = useState<Stage[]>([])
  const [newName, setNewName] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/admin/events/${eventId}`).then((r) => r.json()).then((e) => {
      setStages(Array.isArray(e.stages) ? e.stages : [])
    })
  }, [eventId])

  async function add() {
    setError('')
    if (!newName.trim()) return
    const res = await fetch(`/api/admin/events/${eventId}/stages`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), sortOrder: stages.length }),
    })
    if (!res.ok) { setError((await res.json().catch(() => ({}))).error || 'Fehler'); return }
    const stage = await res.json()
    setStages((p) => [...p, stage])
    setNewName('')
  }

  async function rename(stage: Stage, name: string) {
    const res = await fetch(`/api/admin/events/${eventId}/stages/${stage.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, color: stage.color, sortOrder: stage.sortOrder }),
    })
    if (!res.ok) return
    setStages((p) => p.map((s) => (s.id === stage.id ? { ...s, name } : s)))
  }

  async function remove(id: string) {
    if (!confirm('Bühne löschen? Zugehörige Timetable-Slots werden mitgelöscht.')) return
    const res = await fetch(`/api/admin/events/${eventId}/stages/${id}`, { method: 'DELETE' })
    if (!res.ok) return
    setStages((p) => p.filter((s) => s.id !== id))
  }

  return (
    <div className="space-y-3">
      <h2 className="font-display text-lg font-bold">Bühnen</h2>
      <div className="space-y-2">
        {stages.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2">
            <label className="sr-only" htmlFor={`stage-name-${i}`}>Bühnenname</label>
            <input id={`stage-name-${i}`} className="glass flex-1 rounded px-2 py-1" value={s.name}
              onChange={(e) => setStages((p) => p.map((x) => (x.id === s.id ? { ...x, name: e.target.value } : x)))}
              onBlur={(e) => rename(s, e.target.value)} />
            <button type="button" aria-label={`Bühne ${i + 1} löschen`} onClick={() => remove(s.id)} className="text-red-600">✕</button>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <label className="sr-only" htmlFor="new-stage">Neue Bühne</label>
        <input id="new-stage" className="glass flex-1 rounded px-2 py-1" placeholder="Neue Bühne…" value={newName} onChange={(e) => setNewName(e.target.value)} />
        <button type="button" onClick={add} className="btn-secondary px-3 py-1 text-sm">+ Bühne</button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: exit 0. (This is a standalone client component; full `npm run build` runs green at the end of Task 21.)

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/events/StageManager.tsx
git commit -m "feat(events): admin stage manager (granular endpoints)"
```

---

## Task 20: `TimetableBuilder` component (granular appearance endpoints)

**Files:**
- Create: `src/components/admin/events/TimetableBuilder.tsx`

`'use client'`. Loads stages + artists + appearances; per-row add/edit/delete of appearances via the granular endpoints. Each row: stage select + (artist select OR free title) + role + start/end time. The edit page (Task 21) consumes this and StageManager.

- [ ] **Step 1: Create `src/components/admin/events/TimetableBuilder.tsx`**

```tsx
'use client'

import { useEffect, useState } from 'react'

type Stage = { id: string; name: string }
type ArtistOpt = { id: string; name: string }
type Appearance = {
  id: string; stageId: string; artistId: string | null; title: string | null
  role: string; startTime: string; endTime: string | null; sortOrder: number
}

const ROLES = ['headliner', 'support', 'guest', 'break']

function toLocalInput(value: string | null): string {
  if (!value) return ''
  const d = new Date(value)
  if (isNaN(d.getTime())) return ''
  const off = d.getTimezoneOffset()
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16)
}

export default function TimetableBuilder({ eventId }: { eventId: string }) {
  const [stages, setStages] = useState<Stage[]>([])
  const [artists, setArtists] = useState<ArtistOpt[]>([])
  const [rows, setRows] = useState<Appearance[]>([])
  const [error, setError] = useState('')

  function reload() {
    fetch(`/api/admin/events/${eventId}`).then((r) => r.json()).then((e) => {
      setStages(Array.isArray(e.stages) ? e.stages : [])
      setRows(Array.isArray(e.appearances) ? e.appearances.map((a: Appearance) => ({
        ...a, startTime: toLocalInput(a.startTime), endTime: toLocalInput(a.endTime),
      })) : [])
    })
  }

  useEffect(() => {
    reload()
    fetch('/api/admin/artists').then((r) => r.json()).then((d) => {
      setArtists(Array.isArray(d) ? d.map((a: { id: string; name: string }) => ({ id: a.id, name: a.name })) : [])
    })
  }, [eventId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function add() {
    setError('')
    if (stages.length === 0) { setError('Erst eine Bühne anlegen.'); return }
    const res = await fetch(`/api/admin/events/${eventId}/appearances`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stageId: stages[0].id, title: 'Neuer Slot', role: 'support',
        startTime: new Date(`${new Date().getFullYear()}-08-07T18:00:00`).toISOString(),
        sortOrder: rows.length,
      }),
    })
    if (!res.ok) { setError((await res.json().catch(() => ({}))).error || 'Fehler'); return }
    reload()
  }

  async function persist(row: Appearance) {
    setError('')
    const res = await fetch(`/api/admin/events/${eventId}/appearances/${row.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stageId: row.stageId,
        artistId: row.artistId || null,
        title: row.artistId ? null : (row.title || null),
        role: row.role,
        startTime: row.startTime ? new Date(row.startTime).toISOString() : null,
        endTime: row.endTime ? new Date(row.endTime).toISOString() : null,
        sortOrder: row.sortOrder,
      }),
    })
    if (!res.ok) { setError((await res.json().catch(() => ({}))).error || 'Fehler beim Speichern eines Slots'); return }
  }

  async function remove(id: string) {
    const res = await fetch(`/api/admin/events/${eventId}/appearances/${id}`, { method: 'DELETE' })
    if (!res.ok) return
    setRows((p) => p.filter((r) => r.id !== id))
  }

  function patch(id: string, changes: Partial<Appearance>) {
    setRows((p) => p.map((r) => (r.id === id ? { ...r, ...changes } : r)))
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold">Timetable</h2>
        <button type="button" onClick={add} className="btn-secondary px-3 py-1 text-sm">+ Slot</button>
      </div>
      {rows.length === 0 && <p className="text-sm text-brand-text-muted">Noch keine Slots. Lege zuerst Bühnen an, dann Slots.</p>}
      {rows.map((r, i) => (
        <div key={r.id} className="glass-card grid grid-cols-2 gap-2 p-3 sm:grid-cols-6">
          <label className="flex flex-col gap-1"><span className="sr-only" id={`ap-stage-${i}`}>Bühne</span>
            <select aria-labelledby={`ap-stage-${i}`} className="glass rounded px-2 py-1" value={r.stageId}
              onChange={(e) => patch(r.id, { stageId: e.target.value })} onBlur={() => persist(r)}>
              {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select></label>
          <label className="flex flex-col gap-1"><span className="sr-only" id={`ap-artist-${i}`}>Künstler</span>
            <select aria-labelledby={`ap-artist-${i}`} className="glass rounded px-2 py-1" value={r.artistId || ''}
              onChange={(e) => patch(r.id, { artistId: e.target.value || null })} onBlur={() => persist(r)}>
              <option value="">— Freitext —</option>
              {artists.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select></label>
          <label className="flex flex-col gap-1"><span className="sr-only" id={`ap-title-${i}`}>Titel (falls kein Künstler)</span>
            <input aria-labelledby={`ap-title-${i}`} placeholder="Titel" className="glass rounded px-2 py-1" value={r.title || ''} disabled={!!r.artistId}
              onChange={(e) => patch(r.id, { title: e.target.value })} onBlur={() => persist(r)} /></label>
          <label className="flex flex-col gap-1"><span className="sr-only" id={`ap-role-${i}`}>Rolle</span>
            <select aria-labelledby={`ap-role-${i}`} className="glass rounded px-2 py-1" value={r.role}
              onChange={(e) => patch(r.id, { role: e.target.value })} onBlur={() => persist(r)}>
              {ROLES.map((ro) => <option key={ro} value={ro}>{ro}</option>)}
            </select></label>
          <label className="flex flex-col gap-1"><span className="sr-only" id={`ap-start-${i}`}>Start</span>
            <input aria-labelledby={`ap-start-${i}`} type="datetime-local" className="glass rounded px-2 py-1" value={r.startTime}
              onChange={(e) => patch(r.id, { startTime: e.target.value })} onBlur={() => persist(r)} /></label>
          <div className="flex items-center gap-2">
            <label className="flex flex-col gap-1"><span className="sr-only" id={`ap-end-${i}`}>Ende</span>
              <input aria-labelledby={`ap-end-${i}`} type="datetime-local" className="glass rounded px-2 py-1" value={r.endTime || ''}
                onChange={(e) => patch(r.id, { endTime: e.target.value || null })} onBlur={() => persist(r)} /></label>
            <button type="button" aria-label={`Slot ${i + 1} entfernen`} onClick={() => remove(r.id)} className="text-red-600">✕</button>
          </div>
        </div>
      ))}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
```

> Each field change updates local state immediately and persists on `blur` (status-checked). Selecting an artist disables the free-title input and the PUT nulls `title` (XOR enforced both client- and server-side).

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: exit 0. (Full `npm run build` runs green at the end of Task 21, once the edit page imports both child components.)

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/events/TimetableBuilder.tsx
git commit -m "feat(events): admin timetable builder (granular appearance endpoints)"
```

---

## Task 22: Homepage coupling + repoint Programm links

**Files:**
- Modify: `src/app/(public)/page.tsx`
- Modify: `src/components/layout/HeaderClient.tsx`
- Modify: `src/components/layout/Footer.tsx`

Replace the hardcoded `lineup2026` array with `getFeaturedEventLineup()`. Repoint the two homepage "Programm" CTAs, the header `quickNavItems` "Programm", and the footer `fallbackLinks` "Programm 2026" to the canonical `/events/e-ventschau-2026`.

- [ ] **Step 1: Edit `src/app/(public)/page.tsx`** — add the import at the top

```tsx
import { getFeaturedEventLineup } from '@/lib/events'
```

- [ ] **Step 2: Delete the hardcoded `lineup2026` array** (the `const lineup2026 = [ ... ]` block, lines ~38–46).

- [ ] **Step 3: Make the component async and load the lineup.** Change `export default function HomePage() {` to:

```tsx
export default async function HomePage() {
  const lineup2026 = await getFeaturedEventLineup()
```

- [ ] **Step 4: Update the line-up card markup** — the existing `.map` uses `band.origin`, `band.name`, `band.genre`. `ArtistSummary` has `genres: string[]` (plural). Replace the card block with:

```tsx
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {lineup2026.map((band) => (
            <Link key={band.slug} href={`/kuenstler/${band.slug}`} className="glass-card rounded-section p-6 transition-all hover:shadow-card-hover block">
              {band.origin && <p className="text-xs uppercase tracking-wider text-brand-accent font-semibold">{band.origin}</p>}
              <h3 className="mt-2 font-display text-xl font-bold text-brand-text leading-snug">{band.name}</h3>
              {band.genres?.length ? <p className="mt-1 text-sm text-brand-text-muted">{band.genres.join(' · ')}</p> : null}
            </Link>
          ))}
        </div>
```

- [ ] **Step 5: Guard the empty case.** Wrap the entire Line-up `<section>` so it only renders when there is a lineup (graceful fallback = hide). Change the section opening to:

```tsx
      {lineup2026.length > 0 && (
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
```

and add the closing `)}` after the section's closing `</section>`.

- [ ] **Step 6: Repoint the two homepage Programm CTAs** — change both `<Link href="/programm-2026" ...>` occurrences (the hero CTA and the "Zum vollständigen Programm" button) to `href="/events/e-ventschau-2026"`.

- [ ] **Step 7: Repoint `HeaderClient.tsx`** — in the `quickNavItems` array (line ~94), change `{ label: 'Programm', href: '/programm-2026', icon: Squares2X2Icon }` to `href: '/events/e-ventschau-2026'`.

- [ ] **Step 8: Repoint `Footer.tsx`** — in `fallbackLinks` (line ~26), change `{ name: 'Programm 2026', href: '/programm-2026' }` to `href: '/events/e-ventschau-2026'`.

- [ ] **Step 9: Build**

Run: `npm run build`
Expected: success.

- [ ] **Step 10: Runtime check**

Run (dev server up): `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/`
Expected: `200`. (Line-up section is hidden until a featured event is seeded; verified in Task 24.)

- [ ] **Step 11: Commit**

```bash
git add "src/app/(public)/page.tsx" src/components/layout/HeaderClient.tsx src/components/layout/Footer.tsx
git commit -m "feat(events): couple homepage lineup to featured event + repoint Programm links"
```

---

## Task 23: `/programm-2026` redirect

**Files:**
- Create: `src/app/(public)/programm-2026/page.tsx`

A static `programm-2026` segment takes precedence over the catch-all `[...slug]`, so this permanently redirects the old URL to the canonical event detail (preserves SEO; external/bookmarked links keep working).

- [ ] **Step 1: Create `src/app/(public)/programm-2026/page.tsx`**

```tsx
import { redirect, permanentRedirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default function Programm2026Redirect() {
  // 308 permanent redirect to the canonical festival event page.
  permanentRedirect('/events/e-ventschau-2026')
  // unreachable; satisfies the component return type
  redirect('/events/e-ventschau-2026')
}
```

> `permanentRedirect` emits a 308 (SEO-friendly). The trailing `redirect` is dead code that only exists so TS sees a terminal call; `permanentRedirect` throws, so it never runs. (If the linter objects, delete the `redirect` line and import — `permanentRedirect` alone is sufficient.)

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: success.

- [ ] **Step 3: Runtime check (308 to canonical)**

Run (dev server up): `curl -s -o /dev/null -w "%{http_code} -> %{redirect_url}\n" http://localhost:3000/programm-2026`
Expected: `308 -> .../events/e-ventschau-2026` (the redirect target). The event itself 404s until Task 24 seeds it — that's fine; the redirect wiring is what's verified here.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(public)/programm-2026/page.tsx"
git commit -m "feat(events): redirect /programm-2026 to canonical event page"
```

---

## Task 24: Seed — e-Ventschau 2026 festival + nested children + menu

**Files:**
- Modify: `prisma/seed.ts`

Seed the festival (`slug: e-ventschau-2026`, 7.–8. Aug 2026, Resthof Thiele, `isFeatured + isPublished`), 2 stages, appearances linking the 7 existing artists across both days with roles + plausible times, and a few price tiers. Add an "Events" header menu item and repoint the two `/programm-2026` menu hrefs to `/events/e-ventschau-2026`. Idempotent: upsert the event by `tenantId_slug`, then delete-and-recreate its children.

- [ ] **Step 1: Add the Events seed block** inside `main()` after the artist-seeding loop (the 7 artist slugs already exist: `thorbjorn-risager, lebron-johnson, killabeatmaker, jed-thomas-band, rovar, nanny-goats, the-klaxon`)

```ts
  // ── Event: e-Ventschau 2026 ─────────────────────────────
  const festival = await prisma.event.upsert({
    where: { tenantId_slug: { tenantId: tenant.id, slug: 'e-ventschau-2026' } },
    update: {
      title: 'e-Ventschau 2026', subtitle: '11. Benefiz-Festival',
      startDate: new Date('2026-08-07T17:00:00Z'), endDate: new Date('2026-08-08T23:59:00Z'),
      locationName: 'Resthof Thiele, Ventschau', locationAddress: '21368 Ventschau, Landkreis Lüneburg',
      excerpt: 'Zwei Tage internationale Live-Musik für den guten Zweck.',
      eventType: 'festival', isPublished: true, isFeatured: true,
    },
    create: {
      tenantId: tenant.id, slug: 'e-ventschau-2026',
      title: 'e-Ventschau 2026', subtitle: '11. Benefiz-Festival', eventType: 'festival',
      startDate: new Date('2026-08-07T17:00:00Z'), endDate: new Date('2026-08-08T23:59:00Z'),
      locationName: 'Resthof Thiele, Ventschau', locationAddress: '21368 Ventschau, Landkreis Lüneburg',
      excerpt: 'Zwei Tage internationale Live-Musik für den guten Zweck.',
      isPublished: true, isFeatured: true, isActive: true, sortOrder: 0,
    },
  })

  // children are delete-then-recreate (idempotent re-seed)
  await prisma.appearance.deleteMany({ where: { eventId: festival.id } })
  await prisma.priceTier.deleteMany({ where: { eventId: festival.id } })
  await prisma.stage.deleteMany({ where: { eventId: festival.id } })

  const haupt = await prisma.stage.create({ data: { eventId: festival.id, name: 'Hauptbühne', color: '#b87333', sortOrder: 0 } })
  const zelt = await prisma.stage.create({ data: { eventId: festival.id, name: 'Zeltbühne', color: '#7c9a6c', sortOrder: 1 } })

  const bySlug = async (slug: string) =>
    prisma.artist.findUnique({ where: { tenantId_slug: { tenantId: tenant.id, slug } } })

  const [risager, lebron, killa, jed, rovar, nanny, klaxon] = await Promise.all([
    bySlug('thorbjorn-risager'), bySlug('lebron-johnson'), bySlug('killabeatmaker'),
    bySlug('jed-thomas-band'), bySlug('rovar'), bySlug('nanny-goats'), bySlug('the-klaxon'),
  ])

  const d = (iso: string) => new Date(iso)
  const appearances = [
    // Freitag 07.08.
    { stageId: haupt.id, artistId: nanny?.id, role: 'support', startTime: d('2026-08-07T18:00:00Z') },
    { stageId: haupt.id, artistId: rovar?.id, role: 'support', startTime: d('2026-08-07T19:00:00Z') },
    { stageId: zelt.id, artistId: klaxon?.id, role: 'support', startTime: d('2026-08-07T19:00:00Z') },
    { stageId: haupt.id, artistId: jed?.id, role: 'support', startTime: d('2026-08-07T20:30:00Z') },
    { stageId: zelt.id, artistId: killa?.id, role: 'guest', startTime: d('2026-08-07T20:30:00Z') },
    { stageId: haupt.id, artistId: risager?.id, role: 'headliner', startTime: d('2026-08-07T22:00:00Z') },
    // Samstag 08.08.
    { stageId: haupt.id, title: 'Soundcheck & Begrüßung', role: 'break', startTime: d('2026-08-08T17:30:00Z') },
    { stageId: haupt.id, artistId: lebron?.id, role: 'support', startTime: d('2026-08-08T19:00:00Z') },
    { stageId: zelt.id, artistId: nanny?.id, role: 'support', startTime: d('2026-08-08T19:00:00Z') },
    { stageId: haupt.id, artistId: killa?.id, role: 'headliner', startTime: d('2026-08-08T21:30:00Z') },
  ]
  for (const [i, a] of appearances.entries()) {
    await prisma.appearance.create({
      data: {
        eventId: festival.id, stageId: a.stageId,
        artistId: a.artistId ?? null, title: a.title ?? null,
        role: a.role, startTime: a.startTime, sortOrder: i,
      },
    })
  }

  await prisma.priceTier.createMany({
    data: [
      { eventId: festival.id, name: 'Festival-Pass (2 Tage)', price: 39, currency: 'EUR', sortOrder: 0 },
      { eventId: festival.id, name: 'Tagesticket', price: 22, currency: 'EUR', sortOrder: 1 },
      { eventId: festival.id, name: 'Early-Bird Festival-Pass', price: 29, currency: 'EUR', validFrom: new Date('2026-01-01T00:00:00Z'), validUntil: new Date('2026-04-30T23:59:00Z'), sortOrder: 2 },
      { eventId: festival.id, name: 'Förder-Ticket (Spende)', price: null, currency: 'EUR', sortOrder: 3 },
    ],
  })
  console.log('Event seeded: e-Ventschau 2026 with', appearances.length, 'appearances')
```

- [ ] **Step 2: Repoint the menu `/programm-2026` hrefs + add an "Events" item.** In the existing menu block (`prisma.menuItem.deleteMany` + creates), change the header `{ label: 'Programm 2026', href: '/programm-2026', ... }` and the footer child `{ ..., label: 'Programm 2026', href: '/programm-2026', location: 'footer', ... }` so both use `href: '/events/e-ventschau-2026'`. Then add an Events header item near the Künstler entry (adjust surrounding `sortOrder` values so they stay contiguous):

```ts
  await prisma.menuItem.create({
    data: { tenantId: tenant.id, label: 'Events', href: '/events', sortOrder: 3 },
  })
```

> Because the seed's menu block is delete-then-recreate, edit the existing creates in place — do not append a second menu block.

- [ ] **Step 3: Run the seed**

Run: `npm run db:seed`
Expected: console includes `Event seeded: e-Ventschau 2026 with 10 appearances`, no errors.

- [ ] **Step 4: Verify the seeded data via a Prisma query**

Run:
```bash
npx tsx -e "import {PrismaClient} from '@prisma/client'; const p=new PrismaClient(); p.event.findFirst({where:{slug:'e-ventschau-2026'}, include:{_count:{select:{stages:true,appearances:true,priceTiers:true}}}}).then(e=>{console.log(JSON.stringify({slug:e?.slug,published:e?.isPublished,featured:e?.isFeatured,counts:e?._count})); return p.$disconnect()})"
```
Expected: `{"slug":"e-ventschau-2026","published":true,"featured":true,"counts":{"stages":2,"appearances":10,"priceTiers":4}}`.

- [ ] **Step 5: Re-run the seed to confirm idempotency**

Run: `npm run db:seed`
Expected: same success output; counts stay 2/10/4 (no duplication). Re-run the Step-4 query to confirm.

- [ ] **Step 6: End-to-end runtime check** (dev server up)

```bash
curl -s -o /dev/null -w "events list: %{http_code}\n" http://localhost:3000/events
curl -s -o /dev/null -w "event detail: %{http_code}\n" http://localhost:3000/events/e-ventschau-2026
curl -s -o /dev/null -w "programm redirect: %{http_code} -> %{redirect_url}\n" http://localhost:3000/programm-2026
curl -s http://localhost:3000/ | grep -c "Thorbjørn\|Line-up 2026"
```
Expected: events list `200`; event detail `200`; programm redirect `308 -> .../events/e-ventschau-2026`; homepage grep ≥ 1 (the featured-event lineup now renders). Also open `/events/e-ventschau-2026` in a browser and confirm the timetable grid shows both days, the headliners carry ★, artist slots link to `/kuenstler/...`, and the price tiers render (incl. "auf Anfrage" for the donation tier).

- [ ] **Step 7: Commit**

```bash
git add prisma/seed.ts
git commit -m "feat(events): seed e-Ventschau 2026 festival + nav"
```

---

## Task 25 (OPTIONAL, trimmable): Slider EVENT parity

**Files:**
- Modify: `prisma/schema.prisma` (enum + `SliderItem.eventId`/relation + `Event.sliderItems`)
- Modify: `src/lib/sliders.ts`
- Modify: `src/app/api/sliders/route.ts`

Parity with the ARTIST slider branch. The module is fully functional without this — implement only if event sliders are wanted.

- [ ] **Step 1: Schema — extend the enum and add the relation.** In `prisma/schema.prisma`:
  - Add `EVENT` to `enum SliderItemType` (after `ARTIST`).
  - In `model SliderItem`, add `eventId String?` (near `artistId`) and `event Event? @relation(fields: [eventId], references: [id], onDelete: SetNull)` (near the `artist` relation).
  - In `model Event`, add `sliderItems SliderItem[]` to the relations block.

```prisma
enum SliderItemType {
  PAGE
  PRODUCT
  VENDOR
  MEDIA
  ARTIST
  EVENT
}
```

- [ ] **Step 2: Push + generate**

Run: `npm run db:push && npx prisma generate`
Expected: in sync; client regenerated.

- [ ] **Step 3: `sliders.ts` — add the `event` include** alongside the existing `artist` include in `getSliderBySlug`

```ts
          event: { select: { id: true, title: true, slug: true, heroImage: true, startDate: true } },
```

- [ ] **Step 4: `api/sliders/route.ts` — add the EVENT auto-branch** in `getAutoItems` (mirror the ARTIST branch)

```ts
  if (slider.itemType === 'EVENT') {
    const events = await prisma.event.findMany({
      where: { tenantId, isPublished: true, isActive: true },
      select: { id: true, title: true, slug: true, heroImage: true, startDate: true },
      orderBy: [{ isFeatured: 'desc' }, { startDate: 'asc' }],
      take: slider.maxItems || 12,
    })
    return events.map((e) => ({
      id: e.id,
      title: e.title,
      subtitle: new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium' }).format(e.startDate),
      imageUrl: e.heroImage || '',
      linkUrl: `/events/${e.slug}`,
      type: 'EVENT' as const,
    }))
  }
```

- [ ] **Step 5: `api/sliders/route.ts` — add the manual-item `event` handling.** Add an `eventItem` cast mirroring `artistItem` and splice it into the four fallback chains (`title`, `subtitle`, `imageUrl`, `linkUrl`) and the `type:` ternary

```ts
      const eventItem = (item as any).event as { id: string; title: string; slug: string; heroImage: string | null; startDate: Date } | null
      // title:    ... || eventItem?.title || ...
      // subtitle: ... || (eventItem ? new Intl.DateTimeFormat('de-DE',{dateStyle:'medium'}).format(eventItem.startDate) : null) || ...
      // imageUrl: ... || eventItem?.heroImage || ...
      // linkUrl:  ... || (eventItem ? `/events/${eventItem.slug}` : null)
      // type:     ... (item as any).eventId ? 'EVENT' : ...
```

- [ ] **Step 6: Type-check + build**

Run: `npx tsc --noEmit && npm run build`
Expected: both succeed.

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma src/lib/sliders.ts src/app/api/sliders/route.ts
git commit -m "feat(events): optional slider EVENT parity"
```

---

## Final verification (after all tasks)

- [ ] `npx tsx src/lib/__tests__/slug.test.ts` → passes
- [ ] `npx tsx src/lib/__tests__/event-validation.test.ts` → passes
- [ ] `npx tsc --noEmit` → exit 0
- [ ] `npm run build` → success
- [ ] Dev-server smoke (Task 24 Step 6) all green
- [ ] Browser pass: `/events`, `/events/e-ventschau-2026` (timetable both days, ★ headliners, clickable artist slots, prices), `/` (lineup renders from featured event), `/kuenstler/rovar` ("Auftritte" section shows the festival), `/programm-2026` → 308 → event page, admin `/admin/events` (create → edit → add stages → add timetable slots → add price tiers → publish → verify on public page)
- [ ] Use **superpowers:finishing-a-development-branch** to integrate.

---

## Spec → Task coverage (self-review)

| Spec section | Task(s) |
|---|---|
| §4 Data model (Event/Stage/Appearance/PriceTier) | 1 |
| §5 Validation + slug extraction | 2, 3 |
| §6 Library (`events.ts` getters, lineup) | 4 |
| §7 Public pages + timetable + Auftritte | 11, 12, 13, 14 |
| §8 Homepage coupling + `/programm-2026` | 22, 23 |
| §9 SEO (`buildEventJsonLd`) + sitemap | 5, 15 |
| §10 Admin (nav, list, new, edit, stage/timetable/tier editors) | 16–21 |
| §11 API routes (CRUD + sub-resources + tier replace-all) | 6, 7, 8, 9 |
| §12 Seed | 24 |
| §13 Optional slider EVENT parity | 25 |
| §14 Security/a11y carry-overs | enforced across 6–9 (auth/IDOR/allowlist/XOR/tenant-ownership), 13 (no rehype-raw, safe URLs, JsonLd escaping), 18–21 (labelled inputs, status-checked toggles) |
