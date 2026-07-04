# Homepage FAQ + Region SEO — Design

**Status:** approved (brainstorm) — 2026-07-04

## Goal

Guarantee a festival FAQ on the homepage — visible **and** emitting exactly one
`FAQPage` JSON-LD — in **both** homepage layouts (the admin-composed DB sections
*and* the code-default Noir layout), fix the existing duplicate `FAQPage`, and
broaden the site's regional terms ("Norddeutschland" / "Niedersachsen") for
generic "Festivals im Norden"-style discovery.

Additionally, wire up **IndexNow** (host the ownership key file and auto-submit
changed URLs to IndexNow — which shares them with Bing and other participating
engines — on admin publish/update).

This is an on-page SEO/AEO improvement. No new dependencies, no schema change.

## Background / current state (verified)

- **Homepage** (`src/app/(public)/page.tsx`): renders `HomepageSectionRenderer`
  when `getHomepageSections()` returns DB sections, otherwise the code default
  (`NOIR_DEFAULT_LAYOUT` of `NoirElement`s). It already emits `websiteJsonLd` +
  `getMusicFestivalJsonLd()`.
- **Title/meta are already strong**: `generateMetadata` sets the date
  ("7. & 8. August 2026"), region ("Ventschau (Landkreis Lüneburg)") and genre
  ("Blues-Rock, Funk und Latin"). Only the explicit *broader* region terms
  ("Norddeutschland" / "Niedersachsen") are missing.
- **FAQ today only appears for DB-composed homepages.** A DB `faq`
  `HomepageSection` renders visibly via `src/components/sections/FAQ.tsx`
  (case `'faq'` in `HomepageSectionRenderer`) and its `FAQPage` JSON-LD comes
  from `SectionStructuredData` (rendered only inside the DB-sections branch).
  The **default Noir layout shows no FAQ at all.**
- **Two latent bugs to fix as part of this work:**
  1. **Duplicate `FAQPage`**: `FAQ.tsx` emits its *own* `FAQPage` JSON-LD
     (lines ~67–91) *and* `SectionStructuredData` emits one for the same
     section → two identical `FAQPage` blocks on a DB-composed homepage.
  2. **Wrong default content**: `FAQ.tsx`'s `defaultData` is knife-shop copy
     left over from the "minicms" skeleton — irrelevant to this festival.

## Approach (chosen: "A — always-on, single JSON-LD source")

A small pure module resolves *the* homepage FAQ (DB section if present, else
data-driven festival defaults). The homepage renders it in both layouts and
emits exactly one `FAQPage`. `FAQ.tsx` becomes presentational (its self-emitted
JSON-LD is removed, killing the duplicate). Region terms ride in the "Wo?"
answer (visible + in JSON-LD) plus the homepage meta.

### Single-`FAQPage` invariant

`hasDbFaq = sections.some(s => s.type === 'faq' && s.isVisible)`

| Case | Visible FAQ | `FAQPage` JSON-LD |
| --- | --- | --- |
| Default layout (no sections) | always-on FAQ (page.tsx) | one, from page.tsx |
| DB-composed, has `faq` section | existing renderer FAQ | one, from `SectionStructuredData` |
| DB-composed, no `faq` section | always-on FAQ (page.tsx) | one, from page.tsx |

The always-on FAQ and its JSON-LD render **only when `!hasDbFaq`**, so the two
sources never both fire. `FAQ.tsx` no longer emits JSON-LD in any case.

## Files

### 1. `src/lib/faq.ts` (NEW — pure, unit-tested)

No React / Prisma imports (keeps it testable, mirrors `media-query.ts`).

```ts
export interface FaqItem {
  question: string
  answer: string
}

/** German long-date label for the festival, e.g. "7. und 8. August 2026".
 *  Same day for start/end collapses to a single date. */
export function formatFestivalDateLabel(start: Date, end: Date | null): string

/** The default festival FAQ, built from event date + location. The "Wo?" answer
 *  carries the broad region terms (Norddeutschland / Niedersachsen). */
export function festivalFaqDefaults(input: {
  dateLabel: string
  location: string
}): FaqItem[]

/** Pick the active homepage FAQ: a non-empty DB faq section wins; otherwise the
 *  data-driven defaults. */
export function resolveHomepageFaq(
  dbItems: FaqItem[] | null,
  defaults: FaqItem[],
): { items: FaqItem[]; fromDb: boolean }
```

`festivalFaqDefaults` returns these five items (content approved in brainstorm;
`{dateLabel}` / `{location}` interpolated):

1. **Wann findet das e-Ventschau-Festival 2026 statt?** — „Am **{dateLabel}**
   (Freitag & Samstag), Open Air auf dem Hof."
2. **Wo findet das Festival statt?** — „Auf **{location}**, Landkreis Lüneburg –
   im Norden **Niedersachsens** (**Norddeutschland**)."
3. **Was kostet der Eintritt?** — „Zahl-was-du-kannst: sozial verträglicher
   Eintritt, 100 % Benefiz."
4. **Welche Musik läuft?** — „Internationale Live-Musik – **Blues-Rock, Funk,
   Latin** u. a., dazu Ausstellungen, Vorträge und Kinderprogramm."
5. **Anreise & Camping?** — „Anfahrt nach Ventschau; Camping frei auf der Wiese."

### 2. `src/components/sections/FAQ.tsx` (MODIFY)

- Remove the self-emitted `<script type="application/ld+json">` block and the
  `faqSchema` const (fixes the duplicate `FAQPage`). Component is now purely
  presentational.
- Replace the knife `defaultData` with a harmless neutral fallback
  (`{ title: 'Häufig gestellte Fragen', subtitle: '', items: [] }`) so stray
  skeleton content can never render. `FAQItem`/`FAQData` types and props are
  unchanged; `HomepageSectionRenderer` always passes `data`.

### 3. `src/app/(public)/page.tsx` (MODIFY)

- Compute `hasDbFaq` from `sections`; extract `dbItems` from the visible `faq`
  section's `content.items` (or `null`).
- Build `defaults = festivalFaqDefaults({ dateLabel, location })` where
  `dateLabel`/`location` come from `getFeaturedEvent()`
  (`formatFestivalDateLabel(startDate, endDate)` / `locationName`) with static
  fallbacks ("7. und 8. August 2026" / "Hof Thiele, Ventschau") when no featured
  event exists.
- After the sections/default block, when `!hasDbFaq`, render both:
  - `<JsonLd data={buildFaqJsonLd(faq.items)} />` (reuse existing
    `buildFaqJsonLd` from `lib/seo.ts` — do **not** hand-roll JSON-LD), and
  - `<FAQ data={{ title: 'Häufig gestellte Fragen', subtitle: 'Alles Wichtige zu Termin, Ort, Anreise und Eintritt.', items: faq.items }} />`.

### 4. `src/app/(public)/page.tsx` — `generateMetadata` (MODIFY)

- Add `'Norddeutschland'` and `'Niedersachsen'` to `keywords`.
- Weave the region into the existing description by changing the location
  clause from "in Ventschau (Landkreis Lüneburg)" to "in Ventschau (Landkreis
  Lüneburg, **Norddeutschland**)". One-word insertion; keeps the sentence
  natural and the meaningful lead well under ~160 chars.

### 5. `src/lib/__tests__/faq.test.ts` (NEW)

- `formatFestivalDateLabel`: two-day range → "7. und 8. August 2026"; single day
  → one date; handles `end === null`.
- `festivalFaqDefaults`: interpolates `dateLabel`/`location`; the "Wo?" answer
  contains both "Niedersachsen" and "Norddeutschland"; returns 5 items.
- `resolveHomepageFaq`: non-empty `dbItems` wins (`fromDb: true`); `null`/empty
  → defaults (`fromDb: false`).

## Testing

- Pure helpers in `lib/faq.ts` covered by `node:test` (`npm test`).
- Wiring verified by `npx tsc --noEmit` + `npm run build`.
- Manual/inspection: exactly one `FAQPage` block in the rendered homepage HTML
  in each of the three cases above.

## IndexNow (chosen: "auto-ping on publish")

Protocol (confirmed from indexnow.org): host `https://e-ventschau.de/{key}.txt`
containing exactly the key; submit changes via `POST https://api.indexnow.org/indexnow`
with `Content-Type: application/json; charset=utf-8` and body
`{ host, key, keyLocation, urlList }` (≤10,000 URLs). A root-level key covers all
paths; submitting to one engine shares with all. Key
`3488822b5c7046ca8b5bcb16286d3d0b` (32 hex chars) is valid.

### 6. `public/3488822b5c7046ca8b5bcb16286d3d0b.txt` (NEW)

Static file, content = the key verbatim (`3488822b5c7046ca8b5bcb16286d3d0b`, no
trailing newline). Served by Next.js at
`https://e-ventschau.de/3488822b5c7046ca8b5bcb16286d3d0b.txt`.

### 7. `src/lib/indexnow.ts` (NEW — pure builders unit-tested; `submitUrls` is the thin side effect)

```ts
export const INDEXNOW_KEY: string           // process.env.INDEXNOW_KEY || the key above

/** True only for the real prod host over https (never localhost/dev). */
export function indexNowEnabled(siteUrl?: string): boolean

/** Dedupe + map paths to absolute prod URLs, dropping off-host/invalid ones. */
export function toAbsoluteUrls(paths: string[], siteUrl?: string): string[]

/** The POST body: { host, key, keyLocation, urlList }. */
export function buildIndexNowBody(urls: string[], siteUrl?: string, key?: string): {
  host: string; key: string; keyLocation: string; urlList: string[]
}

/** Best-effort, never throws. No-ops unless indexNowEnabled() and NODE_ENV==='production'. */
export async function submitUrls(paths: string[]): Promise<void>
```

`SITE_URL` = `process.env.NEXT_PUBLIC_SITE_URL || 'https://e-ventschau.de'`
(same as `sitemap.ts`/`seo.ts`). `keyLocation = ${SITE_URL}/${INDEXNOW_KEY}.txt`.

### 8. Admin route hooks (MODIFY — fire-and-forget `void submitUrls(paths)` after a successful mutation)

The routes run on the Node runtime and already do post-mutation side effects
(`revalidatePath`), so a non-blocking ping fits. URL mapping mirrors `sitemap.ts`:

| Route | When | Paths submitted |
| --- | --- | --- |
| `pages/route.ts` POST, `pages/[id]/route.ts` PUT | page is `isPublished` | `[page.path || '/'+page.slug]` |
| `artists/route.ts` POST, `artists/[id]/route.ts` PUT | artist `isPublished && isActive` | `['/kuenstler/'+slug, '/kuenstler']` |
| `events/route.ts` POST, `events/[id]/route.ts` PUT | event `isPublished && isActive` | `['/events/'+slug, '/events']` |
| `sections/route.ts` POST/PUT/DELETE, `sections/reorder`, `sections/import-homepage` | any | `['/']` |

A tiny local call (`void submitUrls([...])`) at each site; no `await` (best-effort,
must not add latency or fail the save). `submitUrls` swallows all errors.

### 9. `src/lib/__tests__/indexnow.test.ts` (NEW)

- `indexNowEnabled`: `https://e-ventschau.de` → true; `http://…` and
  `http://localhost:3000` → false.
- `toAbsoluteUrls`: prefixes SITE_URL, dedupes, drops off-host/empty.
- `buildIndexNowBody`: correct `host`, `keyLocation` (`…/{key}.txt`), `urlList`,
  and `key` echoes `INDEXNOW_KEY`.
- Key format guard: `INDEXNOW_KEY` matches `/^[A-Za-z0-9-]{8,128}$/`, and
  `public/${INDEXNOW_KEY}.txt` exists and its trimmed content equals the key
  (catches filename/constant drift).

## Out of scope (declined in brainstorm)

- Re-adding a hero date/location tile (`dateMeta`).
- A featured-event-missing hero-kicker fallback.
- A full editable `noir_faq` element type (Approach B).
- Off-page work (Bing Webmaster / GSC / backlinks) — manual, tracked in memory.

## Global Constraints

- German UI copy. No new dependencies. No Prisma schema change.
- Reuse `buildFaqJsonLd` (`lib/seo.ts`) for JSON-LD; never emit more than one
  `FAQPage` on the homepage.
- `lib/faq.ts` and `lib/indexnow.ts` keep their pure builders import-free of
  React/Prisma (unit-testable); only `submitUrls` does I/O.
- IndexNow submission is **best-effort and never blocks or fails an admin save**;
  it no-ops outside production / the prod host. The key is public (hosted), so it
  is not a secret — a hardcoded default is acceptable, `INDEXNOW_KEY` env overrides.
- Deploy is push-to-`main`; ship as a PR (no direct main writes).
