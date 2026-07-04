# Homepage FAQ + Region SEO + IndexNow — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Guarantee a festival FAQ (visible + one `FAQPage`) on the homepage in both layouts, broaden region terms, and wire IndexNow (key file + auto-ping on publish).

**Architecture:** Two pure, unit-tested libs (`lib/faq.ts`, `lib/indexnow.ts`) hold the logic; the homepage (`page.tsx`) renders an always-on FAQ + single `FAQPage` when no DB `faq` section exists; `FAQ.tsx` becomes presentational (its self-emitted JSON-LD removed → fixes the current duplicate); admin mutation routes fire-and-forget `submitUrls(...)`.

**Tech Stack:** Next.js 15 App Router (RSC), React 19, TypeScript, Prisma 6, `node:test`/`node:assert` via `tsx`.

## Global Constraints

- German UI copy. No new dependencies. No Prisma schema change.
- Reuse `buildFaqJsonLd` (`lib/seo.ts`) for JSON-LD; **never emit more than one `FAQPage`** on the homepage.
- `lib/faq.ts` and `lib/indexnow.ts` keep pure builders import-free of React/Prisma; only `submitUrls` does I/O.
- IndexNow submission is **best-effort, never blocks/fails an admin save**, and no-ops outside production / the prod host. The key is public (hosted) — not a secret; hardcoded default with `INDEXNOW_KEY` env override.
- `FaqItem` = `{ question: string; answer: string }`, imported from `@/lib/markdown` (same type `buildFaqJsonLd` consumes).
- Deploy is push-to-`main`; ship as a PR. Tests run via `npm test`; gates are `npx tsc --noEmit` + `npm run build`.
- Branch: `feat/homepage-faq-region-seo` (already checked out).

---

### Task 1: `lib/faq.ts` — festival FAQ defaults + date label (pure, TDD)

**Files:**
- Create: `src/lib/faq.ts`
- Test: `src/lib/__tests__/faq.test.ts`

**Interfaces:**
- Consumes: `import type { FaqItem } from '@/lib/markdown'` (`{ question: string; answer: string }`).
- Produces:
  - `formatFestivalDateLabel(start: Date, end: Date | null): string`
  - `festivalFaqDefaults(input: { dateLabel: string; location: string }): FaqItem[]`

- [ ] **Step 1: Write the failing test** — `src/lib/__tests__/faq.test.ts`

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { formatFestivalDateLabel, festivalFaqDefaults } from '../faq'

test('two-day range in one month → "7. und 8. August 2026"', () => {
  const start = new Date('2026-08-07T10:00:00+02:00')
  const end = new Date('2026-08-08T10:00:00+02:00')
  assert.equal(formatFestivalDateLabel(start, end), '7. und 8. August 2026')
})

test('single day (end null) → "7. August 2026"', () => {
  const start = new Date('2026-08-07T10:00:00+02:00')
  assert.equal(formatFestivalDateLabel(start, null), '7. August 2026')
})

test('same start/end day collapses to one date', () => {
  const d = new Date('2026-08-07T10:00:00+02:00')
  assert.equal(formatFestivalDateLabel(d, d), '7. August 2026')
})

test('range across months keeps both month names', () => {
  const start = new Date('2026-07-31T10:00:00+02:00')
  const end = new Date('2026-08-01T10:00:00+02:00')
  assert.equal(formatFestivalDateLabel(start, end), '31. Juli und 1. August 2026')
})

test('festivalFaqDefaults interpolates date + location and carries region terms', () => {
  const items = festivalFaqDefaults({ dateLabel: '7. und 8. August 2026', location: 'Hof Thiele, Ventschau' })
  assert.equal(items.length, 5)
  assert.match(items[0].answer, /7\. und 8\. August 2026/)
  const wo = items[1].answer
  assert.match(wo, /Hof Thiele, Ventschau/)
  assert.match(wo, /Niedersachsen/)
  assert.match(wo, /Norddeutschland/)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/lib/__tests__/faq.test.ts`
Expected: FAIL — `Cannot find module '../faq'`.

- [ ] **Step 3: Write minimal implementation** — `src/lib/faq.ts`

```ts
// Pure helpers for the homepage festival FAQ. No React/Prisma imports so the
// logic stays unit-testable (see __tests__/faq.test.ts). FaqItem is the same
// shape lib/seo.ts's buildFaqJsonLd consumes.
import type { FaqItem } from '@/lib/markdown'

const TZ = 'Europe/Berlin'
const day = (d: Date) => new Intl.DateTimeFormat('de-DE', { day: 'numeric', timeZone: TZ }).format(d)
const month = (d: Date) => new Intl.DateTimeFormat('de-DE', { month: 'long', timeZone: TZ }).format(d)
const year = (d: Date) => new Intl.DateTimeFormat('de-DE', { year: 'numeric', timeZone: TZ }).format(d)
const dayKey = (d: Date) =>
  new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: TZ }).format(d)

/** German long-date label, e.g. "7. und 8. August 2026". Same-day / null end
 *  collapses to a single date; a cross-month range keeps both month names. */
export function formatFestivalDateLabel(start: Date, end: Date | null): string {
  if (!end || dayKey(start) === dayKey(end)) {
    return `${day(start)}. ${month(start)} ${year(start)}`
  }
  if (month(start) === month(end) && year(start) === year(end)) {
    return `${day(start)}. und ${day(end)}. ${month(end)} ${year(end)}`
  }
  return `${day(start)}. ${month(start)} und ${day(end)}. ${month(end)} ${year(end)}`
}

/** The default festival FAQ. The "Wo?" answer carries the broad region terms. */
export function festivalFaqDefaults(input: { dateLabel: string; location: string }): FaqItem[] {
  const { dateLabel, location } = input
  return [
    {
      question: 'Wann findet das e-Ventschau-Festival 2026 statt?',
      answer: `Am ${dateLabel} (Freitag & Samstag), Open Air auf dem Hof.`,
    },
    {
      question: 'Wo findet das Festival statt?',
      answer: `Auf ${location}, Landkreis Lüneburg – im Norden Niedersachsens (Norddeutschland).`,
    },
    {
      question: 'Was kostet der Eintritt?',
      answer: 'Zahl-was-du-kannst: sozial verträglicher Eintritt, 100 % Benefiz.',
    },
    {
      question: 'Welche Musik läuft?',
      answer:
        'Internationale Live-Musik – Blues-Rock, Funk, Latin u. a., dazu Ausstellungen, Vorträge und Kinderprogramm.',
    },
    {
      question: 'Anreise & Camping?',
      answer: 'Anfahrt nach Ventschau; Camping frei auf der Wiese.',
    },
  ]
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test src/lib/__tests__/faq.test.ts`
Expected: PASS (5/5).

- [ ] **Step 5: Commit**

```bash
git add src/lib/faq.ts src/lib/__tests__/faq.test.ts
git commit -m "feat(seo): pure festival FAQ defaults + German date label"
```

---

### Task 2: Homepage FAQ (both layouts, single FAQPage) + region meta

**Files:**
- Modify: `src/components/sections/FAQ.tsx` (remove self-emitted JSON-LD; neutral defaults)
- Modify: `src/app/(public)/page.tsx` (always-on FAQ + one `FAQPage`; region in meta)

**Interfaces:**
- Consumes: `festivalFaqDefaults`, `formatFestivalDateLabel` (Task 1); `buildFaqJsonLd` (`@/lib/seo`); `getFeaturedEvent` (`@/lib/events`, returns the full `Event` incl. `startDate: Date`, `endDate: Date | null`, `locationName: string | null`, or `null`); `FAQ` + `FAQData` (`@/components/sections/FAQ`).
- Produces: no exports; behavior only.

- [ ] **Step 1: Make `FAQ.tsx` presentational — remove its JSON-LD + knife defaults**

In `src/components/sections/FAQ.tsx`:

Replace the knife `defaultData` (the `const defaultData: FAQData = { … 7 knife items … }` block) with:

```ts
const defaultData: FAQData = {
  title: 'Häufig gestellte Fragen',
  subtitle: '',
  items: [],
}
```

Delete the `faqSchema` const (the `const faqSchema = { '@context': …, '@type': 'FAQPage', mainEntity: … }` block) **and** the `<script type="application/ld+json" … />` element that renders it (the first child inside `<div className="max-w-4xl …">`). Leave everything else (the accordion markup) unchanged.

- [ ] **Step 2: Verify no `FAQPage` is emitted by `FAQ.tsx` anymore**

Run: `grep -n "FAQPage" src/components/sections/FAQ.tsx`
Expected: no matches.

- [ ] **Step 3: Wire the always-on FAQ + single JSON-LD into `page.tsx`**

In `src/app/(public)/page.tsx`:

Add imports (alongside existing ones):

```tsx
import FAQ from '@/components/sections/FAQ'
import { getFeaturedEvent } from '@/lib/events'
import { festivalFaqDefaults, formatFestivalDateLabel } from '@/lib/faq'
```

Add `buildFaqJsonLd` to the existing `@/lib/seo` import (which already pulls `buildMetadata, websiteJsonLd, getMusicFestivalJsonLd`):

```tsx
import { buildMetadata, websiteJsonLd, getMusicFestivalJsonLd, buildFaqJsonLd } from '@/lib/seo'
```

Replace the body of `HomePage()` with:

```tsx
export default async function HomePage() {
  const [sections, festivalJsonLd, featured] = await Promise.all([
    getHomepageSections(),
    getMusicFestivalJsonLd(),
    getFeaturedEvent(),
  ])

  // The default festival FAQ appears whenever the homepage does NOT already
  // carry an admin-authored `faq` section (which HomepageSectionRenderer +
  // SectionStructuredData render + emit on their own). This guarantees exactly
  // one visible FAQ and one FAQPage in every layout.
  const hasDbFaq = sections.some((s) => s.type === 'faq' && s.isVisible)
  const dateLabel = featured
    ? formatFestivalDateLabel(featured.startDate, featured.endDate)
    : '7. und 8. August 2026'
  const location = featured?.locationName || 'Hof Thiele, Ventschau'
  const faqItems = festivalFaqDefaults({ dateLabel, location })

  return (
    <div className="nh">
      <JsonLd data={websiteJsonLd} />
      {festivalJsonLd && <JsonLd data={festivalJsonLd} />}
      {!hasDbFaq && <JsonLd data={buildFaqJsonLd(faqItems)} />}
      {sections.length > 0 ? (
        <HomepageSectionRenderer sections={sections} />
      ) : (
        NOIR_DEFAULT_LAYOUT.map((type) => <NoirElement key={type} type={type} />)
      )}
      {!hasDbFaq && (
        <FAQ
          data={{
            title: 'Häufig gestellte Fragen',
            subtitle: 'Alles Wichtige zu Termin, Ort, Anreise und Eintritt.',
            items: faqItems,
          }}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 4: Add region terms to the homepage metadata**

In `src/app/(public)/page.tsx` `generateMetadata`, change the description's location clause from `in Ventschau (Landkreis Lüneburg)` to `in Ventschau (Landkreis Lüneburg, Norddeutschland)`, and add two keywords. The `keywords` array gains, after `'Ventschau',`:

```tsx
      'Norddeutschland',
      'Niedersachsen',
```

- [ ] **Step 5: Type-check and build**

Run: `npx tsc --noEmit && npm run build`
Expected: tsc clean; build "Compiled successfully".

- [ ] **Step 6: Verify exactly one FAQPage source path**

Run: `grep -rn "'FAQPage'" src/components/sections src/lib/seo.ts src/app/\(public\)/page.tsx`
Expected: matches only in `src/lib/seo.ts` (`buildFaqJsonLd`) and `src/components/sections/SectionStructuredData.tsx` — NOT in `FAQ.tsx`. (page.tsx uses `buildFaqJsonLd`; SectionStructuredData covers the DB-faq case; the two never both fire because page.tsx gates on `!hasDbFaq`.)

- [ ] **Step 7: Commit**

```bash
git add src/components/sections/FAQ.tsx "src/app/(public)/page.tsx"
git commit -m "feat(seo): always-on homepage FAQ (single FAQPage, both layouts) + region terms"
```

---

### Task 3: IndexNow key file + `lib/indexnow.ts` (pure builders, TDD)

**Files:**
- Create: `public/3488822b5c7046ca8b5bcb16286d3d0b.txt`
- Create: `src/lib/indexnow.ts`
- Test: `src/lib/__tests__/indexnow.test.ts`

**Interfaces:**
- Produces:
  - `INDEXNOW_KEY: string`
  - `indexNowEnabled(siteUrl?: string): boolean`
  - `toAbsoluteUrls(paths: string[], siteUrl?: string): string[]`
  - `buildIndexNowBody(urls: string[], siteUrl?: string, key?: string): { host: string; key: string; keyLocation: string; urlList: string[] }`
  - `submitUrls(paths: string[]): Promise<void>` (best-effort side effect)

- [ ] **Step 1: Create the key file** — `public/3488822b5c7046ca8b5bcb16286d3d0b.txt`

Content (exactly the key, no trailing newline):

```
3488822b5c7046ca8b5bcb16286d3d0b
```

- [ ] **Step 2: Write the failing test** — `src/lib/__tests__/indexnow.test.ts`

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  INDEXNOW_KEY,
  indexNowEnabled,
  toAbsoluteUrls,
  buildIndexNowBody,
} from '../indexnow'

test('indexNowEnabled: prod https host only', () => {
  assert.equal(indexNowEnabled('https://e-ventschau.de'), true)
  assert.equal(indexNowEnabled('http://e-ventschau.de'), false)
  assert.equal(indexNowEnabled('http://localhost:3000'), false)
  assert.equal(indexNowEnabled('https://localhost'), false)
})

test('toAbsoluteUrls: prefixes site, dedupes, drops off-host', () => {
  const out = toAbsoluteUrls(
    ['/events/x', '/events/x', '/kuenstler', '', 'https://evil.com/x'],
    'https://e-ventschau.de',
  )
  assert.deepEqual(out, [
    'https://e-ventschau.de/events/x',
    'https://e-ventschau.de/kuenstler',
  ])
})

test('buildIndexNowBody: host, key, keyLocation, urlList', () => {
  const body = buildIndexNowBody(['https://e-ventschau.de/'], 'https://e-ventschau.de', 'ABCkey123')
  assert.equal(body.host, 'e-ventschau.de')
  assert.equal(body.key, 'ABCkey123')
  assert.equal(body.keyLocation, 'https://e-ventschau.de/ABCkey123.txt')
  assert.deepEqual(body.urlList, ['https://e-ventschau.de/'])
})

test('key is valid and the hosted file matches it', () => {
  assert.match(INDEXNOW_KEY, /^[A-Za-z0-9-]{8,128}$/)
  const file = readFileSync(join(process.cwd(), 'public', `${INDEXNOW_KEY}.txt`), 'utf8')
  assert.equal(file.trim(), INDEXNOW_KEY)
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx tsx --test src/lib/__tests__/indexnow.test.ts`
Expected: FAIL — `Cannot find module '../indexnow'`.

- [ ] **Step 4: Write minimal implementation** — `src/lib/indexnow.ts`

```ts
// IndexNow client. Pure builders are unit-tested; submitUrls is the thin,
// non-throwing side effect the admin routes fire-and-forget. The key is public
// (hosted at public/<key>.txt), so a hardcoded default is fine; INDEXNOW_KEY
// env overrides. Endpoint shares submissions with Bing and all participants.
const DEFAULT_KEY = '3488822b5c7046ca8b5bcb16286d3d0b'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://e-ventschau.de'
const ENDPOINT = 'https://api.indexnow.org/indexnow'

export const INDEXNOW_KEY = process.env.INDEXNOW_KEY || DEFAULT_KEY

/** True only for a real https host (never http / localhost / 127.*). */
export function indexNowEnabled(siteUrl: string = SITE_URL): boolean {
  try {
    const u = new URL(siteUrl)
    return u.protocol === 'https:' && u.hostname !== 'localhost' && !u.hostname.startsWith('127.')
  } catch {
    return false
  }
}

/** Map paths to absolute prod URLs; dedupe; drop empty/off-host/invalid. */
export function toAbsoluteUrls(paths: string[], siteUrl: string = SITE_URL): string[] {
  const base = siteUrl.replace(/\/$/, '')
  let host = ''
  try {
    host = new URL(siteUrl).hostname
  } catch {
    return []
  }
  const out = new Set<string>()
  for (const p of paths) {
    if (!p) continue
    const abs = p.startsWith('http') ? p : `${base}${p.startsWith('/') ? p : `/${p}`}`
    try {
      if (new URL(abs).hostname === host) out.add(abs)
    } catch {
      /* skip invalid */
    }
  }
  return [...out]
}

/** The IndexNow POST body. */
export function buildIndexNowBody(
  urls: string[],
  siteUrl: string = SITE_URL,
  key: string = INDEXNOW_KEY,
): { host: string; key: string; keyLocation: string; urlList: string[] } {
  const host = new URL(siteUrl).hostname
  return { host, key, keyLocation: `${siteUrl.replace(/\/$/, '')}/${key}.txt`, urlList: urls }
}

/** Best-effort submit. No-ops outside production / the prod host; never throws. */
export async function submitUrls(paths: string[]): Promise<void> {
  if (process.env.NODE_ENV !== 'production') return
  if (!indexNowEnabled()) return
  const urls = toAbsoluteUrls(paths)
  if (urls.length === 0) return
  try {
    await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(buildIndexNowBody(urls)),
    })
  } catch {
    /* best-effort: never break the caller */
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx tsx --test src/lib/__tests__/indexnow.test.ts`
Expected: PASS (4/4).

- [ ] **Step 6: Commit**

```bash
git add public/3488822b5c7046ca8b5bcb16286d3d0b.txt src/lib/indexnow.ts src/lib/__tests__/indexnow.test.ts
git commit -m "feat(seo): IndexNow key file + best-effort submit client"
```

---

### Task 4: Auto-ping IndexNow from admin mutation routes

**Files:**
- Modify: `src/app/api/admin/pages/[id]/route.ts` (PUT)
- Modify: `src/app/api/admin/artists/[id]/route.ts` (PUT)
- Modify: `src/app/api/admin/events/[id]/route.ts` (PUT)
- Modify: `src/app/api/admin/sections/route.ts` (POST, PUT, DELETE)
- Modify: `src/app/api/admin/sections/reorder/route.ts`
- Modify: `src/app/api/admin/sections/import-homepage/route.ts`

**Interfaces:**
- Consumes: `submitUrls` (Task 3).

Each hook is `void submitUrls([...])` (no `await` — fire-and-forget; `submitUrls` already swallows all errors and no-ops off-prod) placed **immediately before the success `return NextResponse.json(...)`** of the handler, after the DB mutation. Add `import { submitUrls } from '@/lib/indexnow'` to each file.

- [ ] **Step 1: Pages PUT** — `src/app/api/admin/pages/[id]/route.ts`

After the page is updated (the `const updated = await prisma.page.update(...)`), before the PUT handler's success `return`, add:

```ts
    if (updated.isPublished) {
      void submitUrls([updated.path || `/${updated.slug}`])
    }
```

- [ ] **Step 2: Artists PUT** — `src/app/api/admin/artists/[id]/route.ts`

The PUT updates the artist (via `prisma.artist.update`). Capture the updated record if not already (`const updated = await prisma.artist.update(...)`), and before the success `return`, add:

```ts
    if (updated.isPublished && updated.isActive) {
      void submitUrls([`/kuenstler/${updated.slug}`, '/kuenstler'])
    }
```

If the existing code doesn't bind the update result to `updated`, bind it (change `await prisma.artist.update({ where: { id }, data })` → `const updated = await prisma.artist.update({ where: { id }, data })`). If the update runs inside a `$transaction`, read `isPublished`/`isActive`/`slug` from the returned artist element.

- [ ] **Step 3: Events PUT** — `src/app/api/admin/events/[id]/route.ts`

Same pattern; before the success `return`, add:

```ts
    if (updated.isPublished && updated.isActive) {
      void submitUrls([`/events/${updated.slug}`, '/events'])
    }
```

Bind the update result to `updated` if it isn't already (mirroring Step 2).

- [ ] **Step 4: Sections POST/PUT/DELETE** — `src/app/api/admin/sections/route.ts`

Homepage sections drive `/`. In **each** of the POST, PUT, and DELETE handlers, before the success `return NextResponse.json(...)`, add:

```ts
    void submitUrls(['/'])
```

- [ ] **Step 5: Sections reorder + import-homepage**

In `src/app/api/admin/sections/reorder/route.ts` and `src/app/api/admin/sections/import-homepage/route.ts`, add the import and, before each success `return`, add:

```ts
    void submitUrls(['/'])
```

- [ ] **Step 6: Type-check, test, build**

Run: `npx tsc --noEmit && npm test && npm run build`
Expected: tsc clean; all tests pass; build "Compiled successfully".

- [ ] **Step 7: Commit**

```bash
git add src/app/api/admin/pages/\[id\]/route.ts src/app/api/admin/artists/\[id\]/route.ts src/app/api/admin/events/\[id\]/route.ts src/app/api/admin/sections/route.ts src/app/api/admin/sections/reorder/route.ts src/app/api/admin/sections/import-homepage/route.ts
git commit -m "feat(seo): auto-ping IndexNow on content publish/update"
```

---

## Final verification

- [ ] `npx tsc --noEmit` clean
- [ ] `npm test` — all green (faq + indexnow suites included)
- [ ] `npm run build` — "Compiled successfully"
- [ ] `grep -rn "'FAQPage'" src/components/sections/FAQ.tsx` → no matches (duplicate removed)
