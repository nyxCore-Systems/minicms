# Timetable-Kategorien + slot-getriebene Lineup-Sektion — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Timetable-Slots nach inhaltlichen Kategorien (`musik·film·performance·kinder·break`) klassifizieren und die Homepage-Lineup-Sektion aus diesen Slots (gefiltert + manuell sortierbar) generieren.

**Architecture:** Slot-Kategorie = Spalte `Appearance.category` (aus `role` umbenannt). Reine Logik (Kategorie-Konstanten, Filter-/Sortier-Funktionen) in `lib/lineup.ts` (client-sicher, TDD). Server-Datenzugriff in `lib/lineup-data.ts`. Public-Sektion `NoirLineupSection` liest `content.{categories,order}` der `HomepageSection`. Admin-Editor (`/admin/sections`) bietet Kategorie-Checkboxen + dnd-kit-Reorder-Vorschau, gespeist von `GET /api/admin/lineup/preview`.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Prisma 6 (Neon Postgres), @dnd-kit, node:test via tsx.

## Global Constraints

- Gates in Reihenfolge: `npx prisma generate` (nach jeder schema.prisma-Änderung) → `npx tsc --noEmit` → `npm test` → `npm run build`. CI führt **kein** Lint aus.
- **Migration datenerhaltend + hand-geschrieben** (`RENAME COLUMN`). **Niemals** `prisma migrate dev` laufen lassen (würde die stale/live DB treffen bzw. den Rename als drop+add neu generieren). `prisma generate` genügt lokal; die Migration läuft live via `prisma migrate deploy` im Deploy-Job.
- Lokale `.env` `DATABASE_URL` ist veraltet — keine Skripte lokal gegen die DB.
- UI-Copy Deutsch. Kategorie-Werte lowercase in DB; Labels via `CATEGORY_LABELS`.
- Git: Dateien einzeln nach Namen stagen (kein `git add -A`); `.codex/`, `.memory/…`, `AGENTS.md` unangetastet. Commit-Messages enden mit:
  `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`
- Kategorien-Kanon (überall identisch): `['musik','film','performance','kinder','break']`; Default-Slot-Kategorie `'musik'`; Lineup-Default-Filter `['musik','film','performance','kinder']` (alle außer `break`).

---

### Task 1: Reine Lineup-Kern-Logik (`lib/lineup.ts`)

**Files:**
- Create: `src/lib/lineup.ts`
- Test: `src/lib/__tests__/lineup.test.ts`

**Interfaces:**
- Consumes: nichts (rein, kein Prisma-Import).
- Produces:
  - `CATEGORY_LABELS: Record<string,string>`
  - `LINEUP_DEFAULT_CATEGORIES: string[]`
  - `interface LineupSlot { appearanceId: string; category: string; categoryLabel: string; name: string; image: string | null; slug: string | null; genres: string[]; origin: string | null; excerpt: string | null; meta: string }`
  - `resolveLineupCategories(raw: unknown): string[]`
  - `orderSlots(slots: LineupSlot[], savedOrder: string[]): LineupSlot[]`

- [ ] **Step 1: Failing test schreiben** — `src/lib/__tests__/lineup.test.ts`

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  resolveLineupCategories, orderSlots, LINEUP_DEFAULT_CATEGORIES, CATEGORY_LABELS, type LineupSlot,
} from '../lineup'

const slot = (id: string, category = 'musik'): LineupSlot => ({
  appearanceId: id, category, categoryLabel: CATEGORY_LABELS[category] ?? category,
  name: id, image: null, slug: id, genres: [], origin: null, excerpt: null, meta: '',
})

// resolveLineupCategories --------------------------------------------------
test('resolveLineupCategories: leer/undefined → Default (alle außer break)', () => {
  assert.deepEqual(resolveLineupCategories(undefined), LINEUP_DEFAULT_CATEGORIES)
  assert.deepEqual(resolveLineupCategories([]), LINEUP_DEFAULT_CATEGORIES)
  assert.ok(!LINEUP_DEFAULT_CATEGORIES.includes('break'))
})

test('resolveLineupCategories: filtert unbekannte Werte, behält gültige Reihenfolge', () => {
  assert.deepEqual(resolveLineupCategories(['film', 'quatsch', 'break']), ['film', 'break'])
})

test('resolveLineupCategories: nur-ungültig → Default', () => {
  assert.deepEqual(resolveLineupCategories(['quatsch']), LINEUP_DEFAULT_CATEGORIES)
})

// orderSlots ---------------------------------------------------------------
test('orderSlots: leere Order → Eingangsreihenfolge unverändert', () => {
  const input = [slot('a'), slot('b'), slot('c')]
  assert.deepEqual(orderSlots(input, []).map((s) => s.appearanceId), ['a', 'b', 'c'])
})

test('orderSlots: gespeicherte Order zuerst, neue Slots hinten in Eingangsreihenfolge', () => {
  const input = [slot('a'), slot('b'), slot('c'), slot('d')] // (Tag,Zeit)-Reihenfolge
  const out = orderSlots(input, ['c', 'a']).map((s) => s.appearanceId)
  assert.deepEqual(out, ['c', 'a', 'b', 'd'])
})

test('orderSlots: nicht mehr existierende ids in Order werden ignoriert', () => {
  const input = [slot('a'), slot('b')]
  assert.deepEqual(orderSlots(input, ['x', 'b', 'a']).map((s) => s.appearanceId), ['b', 'a'])
})
```

- [ ] **Step 2: Test laufen lassen — muss fehlschlagen**

Run: `npx tsx --test src/lib/__tests__/lineup.test.ts`
Expected: FAIL (`Cannot find module '../lineup'`).

- [ ] **Step 3: `src/lib/lineup.ts` implementieren**

```ts
// Pure, client-safe core for the slot-driven line-up section. NO prisma import
// here — the admin client bundle imports orderSlots/CATEGORY_LABELS from this
// file. Server data access lives in lineup-data.ts.
export const CATEGORY_LABELS: Record<string, string> = {
  musik: 'Musik', film: 'Film', performance: 'Performance', kinder: 'Kinder', break: 'Break',
}

const ALL_CATEGORIES = ['musik', 'film', 'performance', 'kinder', 'break']

/** Lineup default: all content categories except breaks. */
export const LINEUP_DEFAULT_CATEGORIES = ['musik', 'film', 'performance', 'kinder']

export interface LineupSlot {
  appearanceId: string
  category: string
  categoryLabel: string
  name: string
  image: string | null
  slug: string | null
  genres: string[]
  origin: string | null
  excerpt: string | null
  meta: string
}

/** Validate raw categories against the canon; empty/all-invalid → default. */
export function resolveLineupCategories(raw: unknown): string[] {
  const list = Array.isArray(raw) ? raw : []
  const valid = list.filter((c): c is string => typeof c === 'string' && ALL_CATEGORIES.includes(c))
  return valid.length > 0 ? valid : LINEUP_DEFAULT_CATEGORIES
}

/**
 * Reorder `slots` (given in Tag/Uhrzeit order) by a saved appearanceId order:
 * ids present in savedOrder come first (in savedOrder sequence), the rest follow
 * in their incoming order. savedOrder ids that no longer exist are ignored.
 */
export function orderSlots(slots: LineupSlot[], savedOrder: string[]): LineupSlot[] {
  const byId = new Map(slots.map((s) => [s.appearanceId, s]))
  const head: LineupSlot[] = []
  const used = new Set<string>()
  for (const id of savedOrder) {
    const s = byId.get(id)
    if (s && !used.has(id)) { head.push(s); used.add(id) }
  }
  const tail = slots.filter((s) => !used.has(s.appearanceId))
  return [...head, ...tail]
}
```

- [ ] **Step 4: Test laufen lassen — muss bestehen**

Run: `npx tsx --test src/lib/__tests__/lineup.test.ts`
Expected: PASS (6 Tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/lineup.ts src/lib/__tests__/lineup.test.ts
git commit -m "feat(lineup): pure category + ordering core (resolveLineupCategories, orderSlots)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Spalte `role` → `category` (Schema, Migration, Validierung, alle Consumer)

Atomarer Rename-Task: endet erst grün, wenn alle Prisma-Consumer auf `category` umgestellt sind. Die Validierungs-Kernlogik wird per TDD (tsx-Testrunner, prisma-frei) zuerst umgestellt; danach Schema + generate + mechanische Consumer-Fixes.

**Files:**
- Modify: `prisma/schema.prisma` (Feld `role`→`category` im `Appearance`-Model)
- Create: `prisma/migrations/20260703120000_rename_appearance_role_to_category/migration.sql`
- Modify: `src/lib/event-validation.ts`
- Test: `src/lib/__tests__/event-validation.test.ts`
- Modify: `src/components/admin/events/TimetableBuilder.tsx`
- Modify: `src/app/api/admin/events/[id]/appearances/route.ts`
- Modify: `src/app/api/admin/events/[id]/appearances/[appId]/route.ts`
- Modify: `src/lib/noir-home.ts`
- Modify: `src/lib/events.ts`
- Modify: `src/components/events/EventTimetable.tsx`
- Modify: `src/app/(public)/events/[slug]/page.tsx`
- Modify: `prisma/seed.ts`

**Interfaces:**
- Consumes: `CATEGORY_LABELS` from `../lineup` (Task 1).
- Produces: `ALLOWED_SLOT_CATEGORIES: readonly string[]`, `DEFAULT_SLOT_CATEGORY: string`, `AppearanceInput` mit Feld `category: string` (statt `role`). Prisma-Model `Appearance` mit Feld `category`.

- [ ] **Step 1: Validierungs-Test auf Kategorien umschreiben** — `src/lib/__tests__/event-validation.test.ts`

Import-Zeile 3 auf `ALLOWED_SLOT_CATEGORIES` ändern und die Rollen-Zeilen ersetzen:

```ts
// Zeile 3:
import {
  sanitizeEventType, ALLOWED_SLOT_CATEGORIES, ALLOWED_CURRENCIES,
  sanitizeStage, sanitizeAppearance, sanitizePriceTier,
} from '../event-validation'
```

Die bisherigen Appearance-Rollen-Assertions (a1 `role:'headliner'`, `nonsense`→`support`, `ALLOWED_ROLES.includes('guest')`) ersetzen durch:

```ts
const a1 = sanitizeAppearance({ stageId: 's1', artistId: 'art1', title: 'ignored', category: 'film', startTime: '2026-08-07T20:00:00Z' }, 0)!
assert.equal(a1.category, 'film')
assert.equal(a1.artistId, 'art1')
assert.equal(a1.title, null) // artistId gesetzt ⇒ title verworfen

// ungültige/fehlende Kategorie → Default 'musik'
assert.equal(sanitizeAppearance({ stageId: 's1', artistId: 'a', category: 'nonsense', startTime: '2026-08-07T20:00:00Z' }, 0)!.category, 'musik')
assert.equal(sanitizeAppearance({ stageId: 's1', artistId: 'a', startTime: '2026-08-07T20:00:00Z' }, 0)!.category, 'musik')

assert.ok(ALLOWED_SLOT_CATEGORIES.includes('kinder'))
assert.ok(!(ALLOWED_SLOT_CATEGORIES as readonly string[]).includes('headliner'))
```

- [ ] **Step 2: Test laufen lassen — muss fehlschlagen**

Run: `npx tsx --test src/lib/__tests__/event-validation.test.ts`
Expected: FAIL (Import `ALLOWED_SLOT_CATEGORIES` undefined / `a1.category` undefined).

- [ ] **Step 3: `event-validation.ts` umstellen**

Ersetze `ALLOWED_ROLES` (Zeile 7) und passe `AppearanceInput` + `sanitizeAppearance` an:

```ts
export const ALLOWED_SLOT_CATEGORIES = ['musik', 'film', 'performance', 'kinder', 'break'] as const
export const DEFAULT_SLOT_CATEGORY = 'musik'
```

In `AppearanceInput`: `role: string` → `category: string`.
In `sanitizeAppearance` die Rollen-Zeilen (63–64) ersetzen und das Rückgabeobjekt anpassen:

```ts
const catRaw = String(r.category || DEFAULT_SLOT_CATEGORY).toLowerCase().trim()
const category = (ALLOWED_SLOT_CATEGORIES as readonly string[]).includes(catRaw) ? catRaw : DEFAULT_SLOT_CATEGORY
// ...
return { stageId, artistId, title, category, startTime, endTime, note, sortOrder }
```

- [ ] **Step 4: Validierungs-Test grün**

Run: `npx tsx --test src/lib/__tests__/event-validation.test.ts`
Expected: PASS.

- [ ] **Step 5: Prisma-Schema umbenennen** — `prisma/schema.prisma`

Im `Appearance`-Model das Feld umbenennen (Typ/Attribute unverändert):

```prisma
category  String
```
(vorher `role  String`). Falls `role` in einem `@@index` referenziert wird, dort ebenfalls umbenennen (aktuell nicht der Fall).

- [ ] **Step 6: Migration von Hand anlegen**

Vorher prüfen, dass der Ordnername nach der letzten Migration einsortiert:
Run: `ls prisma/migrations`

Create `prisma/migrations/20260703120000_rename_appearance_role_to_category/migration.sql`:

```sql
-- Rename the slot-category column and remap legacy role values to content categories.
ALTER TABLE "Appearance" RENAME COLUMN "role" TO "category";
UPDATE "Appearance" SET "category" = 'musik' WHERE "category" IN ('headliner', 'support', 'guest');
-- 'break' bleibt unverändert.
```

- [ ] **Step 7: Prisma-Client regenerieren**

Run: `npx prisma generate`
Expected: OK (Client kennt jetzt `Appearance.category`). **Kein** `migrate dev`.

- [ ] **Step 8: Consumer umstellen (Prisma-Feld + Headliner-Emphase entfernen)**

`src/components/admin/events/TimetableBuilder.tsx`:
- `const ROLES = [...]` → `const CATEGORIES = ['musik','film','performance','kinder','break']`; Import `CATEGORY_LABELS` aus `@/lib/lineup`.
- Typ `Row`: `role: string` → `category: string`; ebenso `ApiAppearance`.
- `toRow`: `role: a.role` → `category: a.category`.
- `add()`: `role: 'support'` → `category: 'musik'`.
- `persist()`: `role: row.role` → `category: row.category`.
- Das Kategorie-Select (Zeilen ~228–232): `value={row.category}`, `onChange … { category: e.target.value }`, Optionen `{CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}`, `aria`-Label „Kategorie".

`src/app/api/admin/events/[id]/appearances/route.ts` und `.../[appId]/route.ts`:
- `role: clean.role` → `category: clean.category` im `data:`-Objekt.

`src/lib/noir-home.ts`:
- Import `CATEGORY_LABELS` aus `@/lib/lineup`; `ROLE_TYPE`-Block (23–28) entfernen.
- In der Timetable-Row-Map: `type: ROLE_TYPE[ap.role] ?? 'Programm'` → `type: CATEGORY_LABELS[ap.category] ?? 'Programm'`; Zeile `highlight: ap.role === 'headliner'` → `highlight: false`.

`src/lib/events.ts`:
- `ROLE_RANK`-Const (26) entfernen; in `getFeaturedEventLineup` die Zeile `const sorted = [...appearances].sort((a,b)=>ROLE_RANK…)` ersetzen durch `const sorted = appearances` (bereits `orderBy startTime asc`).
- `EventWithRelations` (Zeilen 6–12) **und** die `getPublishedEventBySlug`-Query (Zeilen ~49–55): im Artist-`select` `isFeatured: true` ergänzen → `artist: { select: { slug: true, name: true, isFeatured: true } }`.

`src/components/events/EventTimetable.tsx`:
- `isHeadliner`/`star`-Logik entfernen. Mobile-Zeile 52: `{a.role === 'headliner' ? '★ ' : ''}{slotLabel(a) || '—'}` → `{slotLabel(a) || '—'}`. `Slot`-Komponente: `star`-Präfix entfernen. Fußnote (104) „★ = Headliner · " streichen, Rest „klickbare Slots führen zur Künstler-Seite" behalten.

`src/app/(public)/events/[slug]/page.tsx` (Zeile ~110):
- `isFeatured: a.role === 'headliner'` → `isFeatured: a.artist?.isFeatured ?? false`.

`prisma/seed.ts` (eventAppearances, ~253 ff.):
- Feld `role:` → `category:`; Werte `'headliner'|'support'|'guest'` → `'musik'`, `'break'` bleibt. Typ-Annotation des Arrays (`role: string`) → `category: string`.

- [ ] **Step 9: Volle Gates grün**

Run: `npx tsc --noEmit` → keine Fehler.
Run: `npm test` → alle Tests grün.
Run: `npm run build` → erfolgreich.

- [ ] **Step 10: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260703120000_rename_appearance_role_to_category/migration.sql \
  src/lib/event-validation.ts src/lib/__tests__/event-validation.test.ts \
  src/components/admin/events/TimetableBuilder.tsx \
  src/app/api/admin/events/\[id\]/appearances/route.ts \
  src/app/api/admin/events/\[id\]/appearances/\[appId\]/route.ts \
  src/lib/noir-home.ts src/lib/events.ts \
  src/components/events/EventTimetable.tsx \
  src/app/\(public\)/events/\[slug\]/page.tsx prisma/seed.ts
git commit -m "feat(events): rename Appearance.role→category with content categories; drop headliner emphasis

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Server-Datenfunktion `getLineupSlots` (`lib/lineup-data.ts`)

**Files:**
- Create: `src/lib/lineup-data.ts`

**Interfaces:**
- Consumes: `prisma`, `withRetry` from `./prisma`; `getTenant` from `./tenant`; `LineupSlot`, `resolveLineupCategories`, `CATEGORY_LABELS` from `./lineup`.
- Produces: `getLineupSlots(opts: { categories?: string[]; order?: string[] }): Promise<LineupSlot[]>`

- [ ] **Step 1: `src/lib/lineup-data.ts` implementieren**

```ts
import { prisma, withRetry } from './prisma'
import { getTenant } from './tenant'
import { orderSlots, resolveLineupCategories, CATEGORY_LABELS, type LineupSlot } from './lineup'

const TZ = 'Europe/Berlin'
const fmtDayShort = (d: Date) =>
  new Intl.DateTimeFormat('de-DE', { weekday: 'short', timeZone: TZ }).format(d).replace('.', '')
const fmtTime = (d: Date) =>
  new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit', timeZone: TZ }).format(d)

/**
 * Slots of the featured event, filtered by content category and mapped to
 * LineupSlot, sorted by start time then reordered by a saved appearanceId order.
 * Server-only (prisma). Do NOT import from client components.
 */
export async function getLineupSlots(
  opts: { categories?: string[]; order?: string[] } = {},
): Promise<LineupSlot[]> {
  try {
    const tenant = await getTenant()
    if (!tenant) return []
    const categories = resolveLineupCategories(opts.categories)

    const event = await withRetry(() =>
      prisma.event.findFirst({
        where: { tenantId: tenant.id, isPublished: true, isActive: true },
        orderBy: [{ isFeatured: 'desc' }, { startDate: 'asc' }],
        select: { id: true },
      }),
    )
    if (!event) return []

    const appearances = await withRetry(() =>
      prisma.appearance.findMany({
        where: { eventId: event.id, category: { in: categories } },
        include: {
          artist: { select: { slug: true, name: true, heroImage: true, genres: true, origin: true, excerpt: true } },
          stage: { select: { name: true } },
        },
        orderBy: [{ startTime: 'asc' }],
      }),
    )

    const slots: LineupSlot[] = appearances.map((ap) => {
      const meta = [fmtDayShort(ap.startTime), fmtTime(ap.startTime), ap.stage?.name]
        .filter(Boolean).join(' · ')
      return {
        appearanceId: ap.id,
        category: ap.category,
        categoryLabel: CATEGORY_LABELS[ap.category] ?? ap.category,
        name: ap.artist?.name ?? ap.title ?? '—',
        image: ap.artist?.heroImage ?? null,
        slug: ap.artist?.slug ?? null,
        genres: ap.artist?.genres ?? [],
        origin: ap.artist?.origin ?? null,
        excerpt: ap.artist?.excerpt ?? null,
        meta,
      }
    })

    return orderSlots(slots, opts.order ?? [])
  } catch (e) {
    console.error('getLineupSlots failed', e)
    return []
  }
}
```

- [ ] **Step 2: Gates**

Run: `npx tsc --noEmit` → grün.
Run: `npm run build` → grün.

- [ ] **Step 3: Commit**

```bash
git add src/lib/lineup-data.ts
git commit -m "feat(lineup): server getLineupSlots (featured-event slots by category)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Public-Render — `NoirLineupSection` slotbasiert + `NoirElement`-Plumbing

**Files:**
- Modify: `src/components/noir/sections/NoirLineupSection.tsx` (Neuschrieb)
- Modify: `src/components/noir/sections/NoirElement.tsx`

**Interfaces:**
- Consumes: `getLineupSlots` from `@/lib/lineup-data`; `NOIR_LINEUP_DEFAULTS` from `@/lib/noir-home-defaults`.
- Produces: `NoirLineupSection` akzeptiert `content?: { categories?: string[]; order?: string[] } | null`.

- [ ] **Step 1: `NoirLineupSection.tsx` neu schreiben**

```tsx
import Image from 'next/image'
import Link from 'next/link'
import { getLineupSlots } from '@/lib/lineup-data'
import type { LineupSlot } from '@/lib/lineup'
import { NOIR_LINEUP_DEFAULTS } from '@/lib/noir-home-defaults'

export default async function NoirLineupSection({
  title,
  subtitle,
  content,
}: {
  title?: string | null
  subtitle?: string | null
  content?: { categories?: string[]; order?: string[] } | null
}) {
  const slots = await getLineupSlots({ categories: content?.categories, order: content?.order })
  if (slots.length === 0) return null
  const label = title || NOIR_LINEUP_DEFAULTS.label
  const intro = subtitle || NOIR_LINEUP_DEFAULTS.intro

  return (
    <section className="nh-sec" id="lineup">
      <div className="nh-wrap">
        <div className="nh-sec-head">
          <div className="nh-lab">{label}</div>
          <h2>
            {slots.length} Programmpunkte.
            <br />
            Zwei Nächte. Ein Hof.
          </h2>
          <p className="nh-sub">{intro}</p>
        </div>
        <div className="nh-lu">
          {slots.map((s, i) => (
            <LineupCard key={s.appearanceId} slot={s} index={i + 1} />
          ))}
        </div>
      </div>
    </section>
  )
}

function LineupCard({ slot, index }: { slot: LineupSlot; index: number }) {
  const genreLine = [slot.genres?.join(' / '), slot.origin].filter(Boolean).join(' · ')
  const inner = (
    <>
      <div className="nh-ph">
        {slot.image && (
          <Image src={slot.image} alt="" fill sizes="25vw" style={{ objectFit: 'cover' }} />
        )}
        <span className="nh-tagline">{slot.categoryLabel}</span>
        <span className="nh-idx">{String(index).padStart(2, '0')}</span>
        {!slot.image && <span className="nh-ph-tag">Foto folgt</span>}
      </div>
      <div className="nh-act-b">
        {slot.meta && <div className="meta">{slot.meta}</div>}
        <h3>{slot.name}</h3>
        {genreLine && <p>{genreLine}</p>}
      </div>
    </>
  )
  // All cards render equal-size (md). Link only when a slot maps to an artist.
  return slot.slug ? (
    <Link href={`/kuenstler/${slot.slug}`} className="nh-act nh-act-md" aria-label={`${slot.name} – zum Profil`}>
      {inner}
    </Link>
  ) : (
    <div className="nh-act nh-act-md">{inner}</div>
  )
}
```

- [ ] **Step 2: `NoirElement.tsx` — content durchreichen**

Zeile 30–31:
```tsx
    case 'noir_lineup':
      return <NoirLineupSection title={title} subtitle={subtitle} content={content as { categories?: string[]; order?: string[] } | null} />
```

- [ ] **Step 3: Gates**

Run: `npx tsc --noEmit` → grün.
Run: `npm run build` → grün.

- [ ] **Step 4: Manuelle Sichtprüfung**

`npm run dev`, Homepage öffnen: Lineup zeigt gleich große Karten aus den Slots (Default: alle außer break), Kategorie-Tag sichtbar, Künstler-Karten verlinken auf `/kuenstler/…`.

- [ ] **Step 5: Commit**

```bash
git add src/components/noir/sections/NoirLineupSection.tsx src/components/noir/sections/NoirElement.tsx
git commit -m "feat(lineup): render section from timetable slots (equal cards, category tag)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Admin-Vorschau-API `GET /api/admin/lineup/preview`

**Files:**
- Create: `src/app/api/admin/lineup/preview/route.ts`

**Interfaces:**
- Consumes: `getToken` from `next-auth/jwt`; `getLineupSlots` from `@/lib/lineup-data`.
- Produces: `GET ?categories=musik,film` → `{ slots: LineupSlot[] }` in Tag/Uhrzeit-Reihenfolge (ohne manuelle Order).

- [ ] **Step 1: Route implementieren** — Muster wie bestehende `src/app/api/admin/...`-Routen (Auth via `getToken`). Vorher eine bestehende Admin-GET-Route ansehen, um `authOptions`/`secret`-Muster exakt zu übernehmen.

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { getLineupSlots } from '@/lib/lineup-data'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const token = await getToken({ req })
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const raw = req.nextUrl.searchParams.get('categories') || ''
  const categories = raw.split(',').map((c) => c.trim()).filter(Boolean)
  const slots = await getLineupSlots({ categories, order: [] })
  return NextResponse.json({ slots })
}
```

- [ ] **Step 2: Gates**

Run: `npx tsc --noEmit` → grün.
Run: `npm run build` → grün.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/admin/lineup/preview/route.ts
git commit -m "feat(lineup): admin preview API for filtered timetable slots

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Admin-Editor — Kategorie-Filter + Drag&Drop-Reihenfolge

**Files:**
- Modify: `src/app/admin/sections/page.tsx`

**Interfaces:**
- Consumes: `GET /api/admin/lineup/preview`; `orderSlots`, `CATEGORY_LABELS`, `LINEUP_DEFAULT_CATEGORIES`, `type LineupSlot` from `@/lib/lineup` (rein/client-sicher); dnd-kit (bereits in TimetableBuilder genutzt).

Kontext: In `page.tsx` hat jeder Noir-Typ eigene State-Vars + einen Load-Zweig (~700) + Save-Zweig (~850) + Render-Block (~1925). `noir_lineup` wird aus den geteilten Zweigen mit `noir_marquee`/`noir_timetable` herausgelöst.

- [ ] **Step 1: State + dnd-kit-Imports ergänzen**

Oben zu den vorhandenen dnd-kit-Imports (oder neu) hinzufügen (analog `TimetableBuilder.tsx`):
```ts
import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable, sortableKeyboardCoordinates, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { orderSlots, CATEGORY_LABELS, LINEUP_DEFAULT_CATEGORIES, type LineupSlot } from '@/lib/lineup'
```
Neue State-Vars in der Komponente:
```ts
const [noirLineupCategories, setNoirLineupCategories] = useState<string[]>(LINEUP_DEFAULT_CATEGORIES)
const [noirLineupOrder, setNoirLineupOrder] = useState<string[]>([])
const [noirLineupSlots, setNoirLineupSlots] = useState<LineupSlot[]>([])
```

- [ ] **Step 2: Load-Zweig herauslösen** (bei ~723)

Aus `else if (section.type === 'noir_marquee' || section.type === 'noir_lineup' || section.type === 'noir_timetable')` das `noir_lineup` entfernen und davor einen eigenen Zweig ergänzen:
```ts
} else if (section.type === 'noir_lineup') {
  const cats = Array.isArray(content?.categories) ? (content!.categories as string[]) : LINEUP_DEFAULT_CATEGORIES
  setNoirLineupCategories(cats)
  setNoirLineupOrder(Array.isArray(content?.order) ? (content!.order as string[]) : [])
  setFormContent(''); setFormConfig('')
}
```

- [ ] **Step 3: Save-Zweig herauslösen** (bei ~850)

`noir_lineup` aus dem geteilten `parsedContent = null`-Zweig entfernen und davor ergänzen:
```ts
} else if (formType === 'noir_lineup') {
  parsedContent = { categories: noirLineupCategories, order: noirLineupOrder }
}
```

- [ ] **Step 4: Vorschau laden, wenn Kategorien sich ändern**

`useEffect`, der bei geöffnetem `noir_lineup`-Formular + Kategorie-Änderung die Vorschau lädt und die manuelle Order anwendet:
```ts
useEffect(() => {
  if (formType !== 'noir_lineup') return
  const qs = noirLineupCategories.join(',')
  fetch(`/api/admin/lineup/preview?categories=${encodeURIComponent(qs)}`)
    .then((r) => (r.ok ? r.json() : { slots: [] }))
    .then((d) => setNoirLineupSlots(orderSlots(d.slots ?? [], noirLineupOrder)))
    .catch(() => setNoirLineupSlots([]))
}, [formType, noirLineupCategories, noirLineupOrder])
```

- [ ] **Step 5: Render-Block ersetzen** (bei ~1925)

`noir_lineup` aus dem geteilten `(formType === 'noir_lineup' || formType === 'noir_timetable')`-InfoBox-Block entfernen (Bedingung auf nur `noir_timetable` reduzieren) und einen eigenen Block ergänzen:
```tsx
{formType === 'noir_lineup' && (
  <div className="space-y-4">
    <InfoBox>
      Inhalte kommen aus den <a href="/admin/events" className="underline">Timetable-Slots</a> des
      Hauptevents. Wähle die Kategorien und sortiere die Reihenfolge per Drag&nbsp;&amp;&nbsp;Drop.
    </InfoBox>
    <div>
      <label className={labelClass}>Kategorien</label>
      <div className="flex flex-wrap gap-3">
        {(['musik','film','performance','kinder','break'] as const).map((c) => (
          <label key={c} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={noirLineupCategories.includes(c)}
              onChange={(e) => {
                setNoirLineupCategories((prev) =>
                  e.target.checked ? [...prev, c] : prev.filter((x) => x !== c))
              }}
            />
            {CATEGORY_LABELS[c]}
          </label>
        ))}
      </div>
    </div>
    <div>
      <label className={labelClass}>Reihenfolge ({noirLineupSlots.length})</label>
      {noirLineupSlots.length === 0 ? (
        <p className="text-sm text-brand-text-muted">Keine passenden Slots.</p>
      ) : (
        <DndContext
          sensors={lineupSensors}
          collisionDetection={closestCenter}
          onDragEnd={(e: DragEndEvent) => {
            const { active, over } = e
            if (!over || active.id === over.id) return
            const oldI = noirLineupSlots.findIndex((s) => s.appearanceId === active.id)
            const newI = noirLineupSlots.findIndex((s) => s.appearanceId === over.id)
            if (oldI < 0 || newI < 0) return
            const reordered = arrayMove(noirLineupSlots, oldI, newI)
            setNoirLineupSlots(reordered)
            setNoirLineupOrder(reordered.map((s) => s.appearanceId))
          }}
        >
          <SortableContext items={noirLineupSlots.map((s) => s.appearanceId)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {noirLineupSlots.map((s) => <SortableLineupRow key={s.appearanceId} slot={s} />)}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  </div>
)}
```
Sensors (bei den anderen Hooks der Komponente):
```ts
const lineupSensors = useSensors(
  useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
)
```
Sortierbare Zeile (Hilfskomponente in derselben Datei, außerhalb der Haupt-Komponente):
```tsx
function SortableLineupRow({ slot }: { slot: LineupSlot }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: slot.appearanceId })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }
  return (
    <div ref={setNodeRef} style={style} className="glass-card flex items-center gap-3 p-2 text-sm">
      <button type="button" {...attributes} {...listeners}
        aria-label={`${slot.name} verschieben`}
        className="cursor-grab touch-none px-1 text-brand-text-muted select-none active:cursor-grabbing">⠿</button>
      <span className="rounded bg-brand-accent/10 px-2 py-0.5 text-xs">{slot.categoryLabel}</span>
      <span className="flex-1 font-medium">{slot.name}</span>
      <span className="text-xs text-brand-text-muted">{slot.meta}</span>
    </div>
  )
}
```
Hinweis: `labelClass`/`inputClass`/`InfoBox` existieren bereits in der Datei — wiederverwenden. Vor der Umsetzung die Umgebung von Zeile 1925 lesen, um JSX-Einrückung/Wrapper exakt zu treffen.

- [ ] **Step 6: Gates**

Run: `npx tsc --noEmit` → grün.
Run: `npm test` → grün.
Run: `npm run build` → grün.

- [ ] **Step 7: Manuelle Sichtprüfung**

`/admin/sections`: `noir_lineup`-Sektion bearbeiten → Kategorie-Checkboxen togglen (Vorschau aktualisiert sich), Zeilen per Drag&Drop sortieren, speichern; Homepage spiegelt Filter + Reihenfolge.

- [ ] **Step 8: Commit**

```bash
git add src/app/admin/sections/page.tsx
git commit -m "feat(lineup): admin category filter + drag-and-drop order for line-up section

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review (durchgeführt)

- **Spec-Coverage:** Kategorien-Rename (T2) ✓, Builder-Dropdown (T2) ✓, Headliner-Emphase raus (T2) ✓, Migration datenerhaltend (T2) ✓, Lineup aus Slots (T3/T4) ✓, Filter+Order in `content` (T4/T6) ✓, Admin Multi-Select + DnD (T6) ✓, Preview-API (T5) ✓, Tests (T1/T2) ✓.
- **Abweichung von Spec (bewusst):** `getLineupSlots` liegt in `lineup-data.ts` (server-only) statt in `lineup.ts` — verhindert Prisma im Client-Bundle, da der Admin-Client `orderSlots`/`CATEGORY_LABELS` aus `lineup.ts` importiert.
- **Typkonsistenz:** `category` (nicht `role`) durchgängig ab T2; `LineupSlot`-Felder identisch in T1/T3/T4/T6; `content.{categories,order}` identisch in Renderer/Section/Admin.
- **Reihenfolge:** T1 (rein) → T2 (Schema/Rename, nutzt CATEGORY_LABELS aus T1) → T3 (Server-Query, braucht `category`) → T4 (Render, braucht T3) → T5 (API, braucht T3) → T6 (Admin, braucht T5 + T1). Jeder Task endet mit grünen Gates.
