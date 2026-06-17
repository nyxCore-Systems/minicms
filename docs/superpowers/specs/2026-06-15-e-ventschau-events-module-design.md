# e-Ventschau — Events Module (Spec 2) — Design

**Date:** 2026-06-15
**Project:** minicms (tenant `e-ventschau`)
**Builds on:** Spec 1 — Artist module (`2026-06-14-e-ventschau-artist-module-design.md`, shipped & live)
**Status:** Design — awaiting user review before plan.

---

## 1. Goal

A first-class, tenant-scoped **Events** entity with a multistage **timetable**, slots that link an `Artist` **or** carry a free-text title, and **display-only** price tiers. The module is wired so the **homepage line-up derives from the main event's appearances** (single source of truth) and the Artist detail page's stubbed "Auftritte" section finally renders.

## 2. Locked decisions (from brainstorming)

| # | Decision | Choice |
|---|----------|--------|
| Core | Event modelling | **Multiple events (list)** — first-class listable entity, like `Artist`/`Vendor` |
| Core | Timetable granularity | **Multistage + real clock times** (Bühne × Zeit grid) |
| Core | Price tiers | **Category + time-window**, display-only (no checkout) |
| Slots | Timetable slot content | **Artist-link OR free title** (`artistId` nullable + `title` fallback) |
| Integration | Homepage | **Couple line-up to the main event's appearances** (single source of truth) |
| Edge model | Headliner/Support | **Role-as-edge** on `Appearance` — `Artist` stays a stable identity, no per-year duplicates |

**Resolved flags (from design review):**
- ① Location = plain text + maps link (`locationName/locationAddress/locationUrl`). No lat/lng, no embedded map.
- ② `Stage` belongs to a single Event (no cross-event reuse). Mirrors `ArtistMedia`: child has no `tenantId`, scoped via parent, cascade-deletes.
- ③ Timetable = responsive: desktop grid (Bühne × Zeit, day-tabs), mobile agenda-list. ASCII mockups in §7.
- ④ `/programm-2026` is a markdown DB page linked from homepage CTAs (×2), header nav, footer. → `/events/[slug]` becomes the canonical program page; repoint all four links; `/programm-2026` becomes a redirect to the festival event (preserves URL/SEO).
- ⑤ Endpoint strategy: price tiers via replace-all-in-`$transaction` (flat, few rows). Stages + appearances via **granular sub-resource endpoints** (per-row add/edit/delete) — a 2-day multistage timetable is too many rows for fat-replace and admins need per-slot editing.
- ⑥ `SliderItemType.EVENT` + slider support = **optional final batch** (parity with ARTIST), trimmable.

## 3. Tech stack & conventions (unchanged from Spec 1)

Next.js 15 App Router · React 19 · TypeScript · Tailwind 3.4 (liquid-glass) · Prisma 6 (Neon Postgres) · NextAuth 4 (JWT). Multi-tenant via `getTenant()`. Plate.js for rich bodies. Cloudinary media. `react-markdown` **without** `rehype-raw`. Build gate: `npx tsc --noEmit` + `npm run build` (no test framework; `next lint` is unusable).

---

## 4. Data model (Prisma)

All new models follow the Artist conventions: `@@unique([tenantId, slug])` (scoped — **never** Vendor's global `@unique`), `isPublished @default(false)`, `createdById/updatedById`, markdown body + `*Json` Plate mirror.

```prisma
enum SliderItemType {
  PAGE
  PRODUCT
  VENDOR
  MEDIA
  ARTIST
  EVENT        // ← added (optional batch ⑥)
}

model Event {
  id              String   @id @default(cuid())
  tenantId        String
  slug            String
  title           String
  subtitle        String?
  eventType       String   @default("festival")   // festival | concert | workshop | other — stored as String (no Prisma enum, YAGNI), validated against an allowlist in event-validation
  startDate       DateTime
  endDate         DateTime?
  locationName    String?
  locationAddress String?
  locationUrl     String?                          // maps link (validated https)
  heroImage       String?                          // Cloudinary
  excerpt         String?  @db.Text
  description     String?  @db.Text                // markdown
  descriptionJson Json?                            // Plate mirror
  editorMode      String?  @default("markdown")
  ticketUrl       String?                          // external ticket shop (https)
  metaTitle       String?
  metaDescription String?  @db.Text
  isPublished     Boolean  @default(false)
  isFeatured      Boolean  @default(false)         // marks the homepage main event
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
  sliderItems SliderItem[]                         // optional batch ⑥

  @@unique([tenantId, slug])
  @@index([tenantId])
  @@index([startDate])
}

model Stage {
  id        String @id @default(cuid())
  eventId   String
  name      String
  color     String?                                // optional grid-column accent (hex)
  sortOrder Int    @default(0)

  event       Event        @relation(fields: [eventId], references: [id], onDelete: Cascade)
  appearances Appearance[]

  @@index([eventId])
}

model Appearance {
  id        String   @id @default(cuid())
  eventId   String
  stageId   String
  artistId  String?                                // nullable — free-text slots have title instead
  title     String?                                // fallback for non-artist slots ("Opening Act", "Umbaupause")
  role      String   @default("support")           // headliner | support | guest | break
  startTime DateTime
  endTime   DateTime?
  note      String?
  sortOrder Int      @default(0)

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
  price       Float?                               // null = "auf Anfrage"
  currency    String    @default("EUR")
  validFrom   DateTime?                            // early-bird window start
  validUntil  DateTime?                            // early-bird window end
  isSoldOut   Boolean   @default(false)
  isActive    Boolean   @default(true)
  buyUrl      String?                              // external buy link (https)
  sortOrder   Int       @default(0)

  event Event @relation(fields: [eventId], references: [id], onDelete: Cascade)

  @@index([eventId])
}
```

**Back-relations to add:** `Tenant.events Event[]`; `Artist.appearances Appearance[]`; `SliderItem.eventId String?` + `event Event? @relation(...)` (optional batch ⑥).

**Application-level invariants (DB can't express cleanly):**
- An `Appearance` must have **either** `artistId` **or** a non-empty `title`.
- `endTime` (when set) must be `> startTime`.
- A linked `artistId` must belong to the **same tenant** as the event (IDOR guard).

## 5. Validation — `src/lib/event-validation.ts`

**Shared-validator extraction (DRY, zero breakage):** move `SLUG_RE`, `normalizeSlug`, `isValidSlug`, `safeHttpsUrl`, `safeCloudinaryUrl` from `artist-validation.ts` into a new `src/lib/slug.ts`, and **re-export them from `artist-validation.ts`** so all existing artist imports keep working unchanged. The umlaut-before-NFKD order (`ä→ae` … then `.normalize('NFKD')`) **must be preserved verbatim** — it is a fixed bug (`Motörhead → motoerhead`).

`event-validation.ts` then imports the shared primitives and adds event-specific helpers:
- `sanitizeEventInput` — slug via `normalizeSlug`/`isValidSlug`; `ticketUrl`/`locationUrl` via `safeHttpsUrl`; `heroImage` via `safeCloudinaryUrl`; `eventType` ∈ allowlist; `endDate ≥ startDate`.
- `ALLOWED_ROLES = ['headliner','support','guest','break']`.
- `sanitizeAppearance(raw)` — enforces artistId-XOR-title, role allowlist, `endTime > startTime`, string length caps on `title`/`note`. Returns `null` to drop invalid rows.
- `sanitizePriceTier(raw)` — `price ≥ 0` (or null), `currency` ∈ `['EUR','USD','CHF','GBP']`, `buyUrl` via `safeHttpsUrl`, `validUntil ≥ validFrom`.

## 6. Library — `src/lib/events.ts` (mirrors `src/lib/artists.ts`)

All getters tenant-scoped via `getTenant()`, wrapped in try/catch returning `[]`/`null` on error (same defensive pattern as `artists.ts`).

```
getPublishedEvents()              // list: where isPublished+isActive, order startDate asc
getPublishedEventBySlug(slug)     // detail: include stages(order sortOrder), priceTiers(order sortOrder),
                                  //   appearances(include artist; order startTime, sortOrder). null for drafts.
getEventsForAdmin()               // all tenant events + _count of appearances/stages
getFeaturedEvent()                // published, prefer isFeatured, then earliest upcoming startDate
getFeaturedEventLineup()          // featured event → distinct artist-linked appearances → ArtistSummary[]
                                  //   (headliners first); [] if none
getArtistAppearances(artistId)    // published events only: appearances + event + stage, order startTime
                                  //   → feeds Artist "Auftritte" section
```

`getFeaturedEventLineup()` returns the existing `ArtistSummary` shape (`src/components/artists/ArtistCard.tsx`) so the homepage can reuse artist styling; cards link to `/kuenstler/[slug]` and pull `origin`/`genres` from the `Artist` record.

## 7. Public pages

### `/events` — `src/app/(public)/events/page.tsx`
`force-dynamic`. Lists `getPublishedEvents()` as cards (heroImage, title, date range, venue, excerpt). Empty-state when none.

### `/events/[slug]` — `src/app/(public)/events/[slug]/page.tsx`
`React.cache(getPublishedEventBySlug)`, `notFound()` on null. Sections in order:
1. **Hero** — heroImage, title, subtitle, date range, venue (link to `locationUrl`).
2. **Beschreibung** — `MarkdownContent` (no `rehype-raw`).
3. **Timetable** — see mockups below.
4. **Line-up** — artist-linked appearances → `ArtistCard` grid → `/kuenstler/[slug]`.
5. **Preise** — `PriceTier` cards: name, price+currency, early-bird window, sold-out badge, `buyUrl` button (external, `rel="noopener noreferrer nofollow"`). Display-only.
6. **Ticket-CTA** — `ticketUrl` button.
7. `buildEventJsonLd` → `MusicEvent` (performers + offers), via `safeJsonLd`.

### Timetable rendering (③)

**Desktop — grid (Bühne × Zeit), day-tabs when multi-day:**
```
┌───────────────────────────────────────────────────┐
│  [ Fr 07.08. ]  [ Sa 08.08. ]        ← Tag-Tabs     │
├──────────┬───────────────────┬────────────────────┤
│  Zeit    │ Hauptbühne        │ Zeltbühne          │
├──────────┼───────────────────┼────────────────────┤
│ 18:00    │ Nanny Goats       │                    │
│ 19:00    │ ROVAR             │ The Klaxon         │
│ 20:30    │ Jed Thomas Band   │ Killabeatmaker     │
│ 22:00    │ ★ Thorbjørn R.    │                    │
└──────────┴───────────────────┴────────────────────┘
   ★ = Headliner · klickbare Artist-Slots → /kuenstler/[slug]
```

**Mobile — agenda list (grouped day → time):**
```
── Fr 07.08. ───────────────────
18:00   Nanny Goats        · Hauptbühne
19:00   ROVAR              · Hauptbühne
19:00   The Klaxon         · Zeltbühne
20:30   Jed Thomas Band    · Hauptbühne
22:00  ★Thorbjørn Risager  · Hauptbühne
── Sa 08.08. ───────────────────
…
```

Free-text slots (`title`, no `artistId`) render as non-clickable muted rows. Days derived from distinct `startTime` dates; single-day events skip the tabs. Grid time-rows derived from the sorted distinct start times (not a fixed 24h axis).

### Artist "Auftritte" (wire up the Spec 1 stub)
`src/app/(public)/kuenstler/[slug]/page.tsx` line ~78 currently has the placeholder comment. Render `getArtistAppearances(artist.id)`: each row = event title + date + stage + time, linking to `/events/[slug]`. Hidden when empty.

## 8. Homepage coupling (decision #5) + `/programm-2026` (④)

- `(public)/page.tsx`: delete the hardcoded `lineup2026` array; render `getFeaturedEventLineup()`. Keep the existing card markup but source `name`/`origin`/`genres`/`slug` from the result. Graceful fallback (render nothing / generic message) when no featured event.
- Make `/events/e-ventschau-2026` the canonical program page. Repoint the four "Programm" links: `(public)/page.tsx` ×2, `components/layout/HeaderClient.tsx:94`, `components/layout/Footer.tsx:26`.
- `/programm-2026`: convert to a redirect to the festival event detail (`src/app/(public)/programm-2026/page.tsx` → `redirect()` ), preserving the public URL. The old markdown `Page` row can stay unpublished as archive.

## 9. SEO & sitemap
- `buildEventJsonLd(event)` in `src/lib/seo.ts` → schema.org `MusicEvent`: `name`, `startDate`, `endDate`, `location` (Place w/ name+address), `performer` (artist appearances), `offers` (price tiers: price, priceCurrency, availability, url, validFrom). Escaped via existing `safeJsonLd`.
- `src/app/sitemap.ts`: add published events as `/events/<slug>`.

## 10. Admin

- `AdminNav.tsx` — add "Events" entry (`CalendarIcon`), route `/admin/events`.
- `/admin/events/page.tsx` — list with publish/feature toggles + delete-with-confirm + "Neu" link. Toggles check HTTP status before optimistic update (Spec 1 lesson).
- `/admin/events/new/page.tsx` — minimal create (title + slug) → POST → redirect to edit.
- `/admin/events/[id]/page.tsx` — `useParams()` (not `use(params)`); core fields, Plate description (dynamic import `.then(m => ({ default: m.PlateEditor }))`, `TElement` from `@udecode/plate`, serialization from `@/components/admin/editor/serialization/{markdownToPlate,plateToMarkdown}`), SEO fields, MediaPicker for hero; **Stage manager**, **Timetable builder** (appearances: stage select + artist select/free-title + start/end time + role), **Price-tier editor**. All inputs labelled (a11y lesson).

## 11. API routes

Role-gated `['ADMIN','SUPER_ADMIN'].includes(token.role)` via `getSessionToken()` (copied from the artists route). Every `[id]`/sub-resource handler does `findUnique` then rejects if `tenantId !== tenant.id` (IDOR). PUT uses an explicit field-allowlist.

- `api/admin/events/route.ts` — `GET` (list), `POST` (create; scoped slug uniqueness).
- `api/admin/events/[id]/route.ts` — `GET`, `PUT` (core fields + price-tier replace-all in `$transaction`), `DELETE`.
- `api/admin/events/[id]/stages/route.ts` (`POST`) + `stages/[stageId]/route.ts` (`PUT`,`DELETE`).
- `api/admin/events/[id]/appearances/route.ts` (`POST`) + `appearances/[appId]/route.ts` (`PUT`,`DELETE`). Validates artistId-XOR-title, role, time order, and artist-tenant ownership.

## 12. Seed (`prisma/seed.ts`)

Seed the **e-Ventschau 2026** festival: `slug: e-ventschau-2026`, 7.–8. Aug 2026, Resthof Thiele / Ventschau, `isFeatured + isPublished`. Two stages (`Hauptbühne`, `Zeltbühne`). Appearances linking the 7 existing artists (`thorbjorn-risager, lebron-johnson, killabeatmaker, jed-thomas-band, rovar, nanny-goats, the-klaxon`) across both days with roles + plausible times (Thorbjørn Risager = `headliner`). A few price tiers (Festival 2-Tage, Tagesticket, Early-Bird window, VIP). Add an "Events" menu item. Idempotent upsert by `[tenantId, slug]`, like the artist seed.

## 13. Optional batch ⑥ — Slider EVENT parity
Extend `SliderItemType` with `EVENT`, add `SliderItem.eventId`, and add the auto/manual `EVENT` branch in `api/sliders/route.ts` + `src/lib/sliders.ts` + admin sliders — mirroring the ARTIST branch with a `select` (id, title, slug, heroImage, startDate). **Trimmable**: the module is fully functional without it.

## 14. Security & accessibility carry-overs (apply every Spec 1 lesson)
- Bodies render via `react-markdown` **without** `rehype-raw`; JSON-LD via `safeJsonLd`.
- `safeHttpsUrl` for `ticketUrl`/`buyUrl`/`locationUrl`; `safeCloudinaryUrl` for `heroImage`.
- Role-gated APIs, IDOR checks on every event + sub-resource, PUT field-allowlists, scoped slug uniqueness, artist-tenant ownership on linking.
- All admin form inputs labelled; toggles expose state; motion-safe guards on hover transitions; external links `rel="noopener noreferrer nofollow"`.

## 15. Build order (the plan will expand each into TDD-style tasks)
1. **Schema** — models + enum + back-relations; `db:push`; regenerate client.
2. **Shared slug extraction** — `slug.ts` + re-export; verify artist build green.
3. **Validation + lib** — `event-validation.ts`, `events.ts`.
4. **API** — events CRUD + stage/appearance sub-resources + tier replace-all.
5. **Public** — `/events`, `/events/[slug]` (timetable, lineup, prices, JSON-LD), Artist "Auftritte" wire-up, sitemap.
6. **Admin** — list/new/edit (stage manager + timetable builder + tier editor), nav.
7. **Homepage coupling** — `getFeaturedEventLineup`, repoint "Programm" links, `/programm-2026` redirect.
8. **Seed** — festival 2026 + appearances + tiers + menu item.
9. **(Optional) Slider EVENT parity.**

## 16. Out of scope (backlog, unchanged)
Ticketing/checkout, payment, seat/capacity management, newsletter, analytics dashboards, social-sync, recurring-event automation, multi-language.
