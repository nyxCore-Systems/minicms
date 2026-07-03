# Timetable-Kategorien + auto-generierte Lineup-Sektion — Design

**Datum:** 2026-07-03
**Status:** Design (zur Review)

## Ziel

Zwei gekoppelte Features:

1. **Timetable-Kategorien:** Die rollenbasierten Slot-Kategorien (`headliner · support · guest · break`) werden durch inhaltsbasierte ersetzt: **`musik · film · performance · kinder · break`**. Damit lassen sich Programmpunkte nach Typ klassifizieren, statt nach Bühnenrolle.
2. **Lineup-Sektion generiert sich aus Timetable-Slots:** Die Homepage-Sektion „Line-up" zieht ihren Inhalt künftig aus den Timetable-Slots des Featured-Events, gefiltert nach den neuen Kategorien (Mehrfachauswahl). Alle Slots werden gleichberechtigt (gleich große Karten) dargestellt; im Sektions-Editor lässt sich die Reihenfolge per Drag & Drop manuell festlegen (Standard: nach Tag + Uhrzeit).

## Hintergrund / Ist-Zustand

- Die Slot-Kategorie ist heute die Spalte **`Appearance.role`** (String, NOT NULL). Erlaubte Werte + Default `support` in `src/lib/event-validation.ts` (`ALLOWED_ROLES`, `sanitizeAppearance`).
- `role` steuert mehr als nur das Label:
  - `src/lib/noir-home.ts`: `ROLE_TYPE`-Map (Anzeige-Label) + `highlight: role === 'headliner'` (Timetable-Hervorhebung).
  - `src/components/events/EventTimetable.tsx`: **★-Headliner**-Markierung + Fußnote.
  - `src/app/(public)/events/[slug]/page.tsx:110`: `isFeatured: a.role === 'headliner'` an `ArtistCard`.
  - `src/lib/events.ts`: `ROLE_RANK` sortiert `getFeaturedEventLineup` (Headliner zuerst).
- Die **aktuelle Lineup-Sektion ist künstlerbasiert, nicht slotbasiert:** `NoirLineupSection` → `getFeaturedEventLineup()` liefert **Artists**, verlinkt auf `/kuenstler/…`, „Headliner"-Tag kommt aus `Artist.isFeatured` (nicht aus `role`). Erste 2 Acts = XL-Karten, Rest = MD-Karten.
- `Appearance` hat **kein Bildfeld** (`artistId`, `title`, `role`, `note`, `startTime`, `stageId`).

## Getroffene Entscheidungen

- **Bildquelle für Nicht-Musik-Slots (Q1):** *Alles als Künstler pflegen.* Filme/Performance/Kinder-Acts werden als `Artist`-Datensätze angelegt; das Lineup-Bild ist `artist.heroImage`. **Kein Slot-Bildfeld, keine Artist-Schema-Änderung.** Slots ohne Künstler rendern eine text-only Karte mit „Foto folgt"-Platzhalter.
- **Headliner-Hervorhebung (Q2):** *Ganz entfernen.* Kein ★/Highlight mehr im Timetable — alle Slots gleichwertig. Betonung im Lineup erfolgt ausschließlich über die manuelle Sortierung.
- **Spalten-Umbenennung:** `Appearance.role` → **`Appearance.category`** (saubere, datenerhaltende `RENAME COLUMN`-Migration, hand-geschrieben, damit Prisma nicht drop+add macht). Alle `ap.role`/`role:`-Queries werden zu `category`.

## Datenmodell

### Prisma / Migration

`prisma/schema.prisma` — im `Appearance`-Model Feld umbenennen:

```prisma
category  String   // slot content category: musik | film | performance | kinder | break
```

Migration `prisma/migrations/20260703120000_rename_appearance_role_to_category/migration.sql` (hand-geschrieben, datenerhaltend):

```sql
-- Rename the slot-category column and remap legacy role values to content categories.
ALTER TABLE "Appearance" RENAME COLUMN "role" TO "category";
UPDATE "Appearance" SET "category" = 'musik' WHERE "category" IN ('headliner', 'support', 'guest');
-- 'break' bleibt unverändert.
```

> Prisma erkennt Renames nicht automatisch (würde drop+add erzeugen und Daten verlieren). Deshalb **Migration von Hand** schreiben und **nicht** `prisma migrate dev` den Diff neu generieren lassen. Auf der Live-DB läuft sie via `prisma migrate deploy` im Deploy-Job. Nach der Schema-Änderung lokal `npx prisma generate` **vor** `tsc`.

### Validierung (`src/lib/event-validation.ts`)

```ts
export const ALLOWED_SLOT_CATEGORIES = ['musik', 'film', 'performance', 'kinder', 'break'] as const
export const DEFAULT_SLOT_CATEGORY = 'musik'
```

`AppearanceInput.role` → `AppearanceInput.category`. `sanitizeAppearance` liest `r.category`, validiert gegen `ALLOWED_SLOT_CATEGORIES`, Fallback `DEFAULT_SLOT_CATEGORY`:

```ts
const catRaw = String(r.category || DEFAULT_SLOT_CATEGORY).toLowerCase().trim()
const category = (ALLOWED_SLOT_CATEGORIES as readonly string[]).includes(catRaw) ? catRaw : DEFAULT_SLOT_CATEGORY
```

### Kategorie-Labels (`src/lib/lineup.ts`)

```ts
export const CATEGORY_LABELS: Record<string, string> = {
  musik: 'Musik', film: 'Film', performance: 'Performance', kinder: 'Kinder', break: 'Break',
}
```

## Feature 1 — Timetable-Kategorien

### Admin-Builder (`src/components/admin/events/TimetableBuilder.tsx`)
- `const ROLES = […]` → `const CATEGORIES = ['musik','film','performance','kinder','break']`; Dropdown zeigt `CATEGORY_LABELS[c]`.
- `Row.role` → `Row.category`; `toRow` mappt `a.category`.
- Neuer Slot (`add`) sendet `category: 'musik'` statt `role: 'support'`.
- `persist` sendet `category: row.category`.

### API (`.../appearances/route.ts`, `.../appearances/[appId]/route.ts`)
- `role: clean.role` → `category: clean.category` in `data:`.

### Anzeige-Bereinigung (Headliner raus)
- `src/lib/noir-home.ts`: `ROLE_TYPE` → nutzt `CATEGORY_LABELS` (`ap.category`); `highlight`-Feld entfällt (immer `false`/nicht gesetzt); `ap.role` → `ap.category`.
- `src/components/events/EventTimetable.tsx`: ★-Logik (`isHeadliner`, `star`) + Fußnotentext „★ = Headliner" entfernen.
- `src/app/(public)/events/[slug]/page.tsx:110`: `isFeatured: a.role === 'headliner'` → `isFeatured: a.artist?.isFeatured ?? false` (echtes Künstler-Flag). Dazu in `EventWithRelations`-Include (`src/lib/events.ts`) den Artist-`select` um `isFeatured: true` erweitern.
- `src/lib/events.ts`: `ROLE_RANK` + der `.sort((a,b)=>ROLE_RANK…)`-Schritt in `getFeaturedEventLineup` entfallen; stattdessen Sortierung nach `startTime` (bereits durch `orderBy`), Dedup bleibt.

### Seed (`prisma/seed.ts`)
- `role:`-Felder der `eventAppearances` → `category:` mit neuen Werten (`headliner`/`support` → `musik`, `guest` → `musik`).

## Feature 2 — Lineup-Sektion aus Slots

### Datenschicht (`src/lib/lineup.ts`, neu)

```ts
export interface LineupSlot {
  appearanceId: string
  category: string
  categoryLabel: string
  name: string           // artist.name ?? title ?? '—'
  image: string | null   // artist.heroImage
  slug: string | null    // artist.slug (Link-Ziel) oder null
  genres: string[]
  origin: string | null
  excerpt: string | null
  meta: string           // "Fr · 22:00 · Hauptbühne"
}

export const LINEUP_DEFAULT_CATEGORIES = ['musik', 'film', 'performance', 'kinder'] // alle außer break
```

**Reine, testbare Funktionen:**

```ts
// Validiert rohe Kategorien gegen ALLOWED_SLOT_CATEGORIES; leer/ungültig → LINEUP_DEFAULT_CATEGORIES.
export function resolveLineupCategories(raw: unknown): string[]

// slots kommen in (Tag, Uhrzeit)-Reihenfolge. savedOrder = appearanceIds.
// Ergebnis: zuerst die Slots, deren id in savedOrder steht (in savedOrder-Reihenfolge),
// danach die restlichen Slots in ihrer Eingangsreihenfolge. Nicht mehr existierende
// ids in savedOrder werden ignoriert.
export function orderSlots(slots: LineupSlot[], savedOrder: string[]): LineupSlot[]
```

**Server-Funktion:**

```ts
export async function getLineupSlots(opts: { categories?: string[]; order?: string[] }): Promise<LineupSlot[]>
```
- Featured-Event ermitteln (wie `getFeaturedEventLineup`: `isPublished && isActive`, `orderBy isFeatured desc, startDate asc`).
- Appearances des Events laden, `category IN resolveLineupCategories(opts.categories)`, inkl. `artist` (`slug,name,heroImage,genres,origin,excerpt`) + `stage`, `orderBy startTime asc`.
- Auf `LineupSlot[]` mappen, `meta` bauen (`Wochentag · Uhrzeit · Bühne`, Europe/Berlin).
- `orderSlots(slots, opts.order ?? [])` anwenden.
- **Keine Dedup nach Künstler** — ein Künstler mit zwei Slots erscheint zweimal (slotbasiert).

### Public-Render (`src/components/noir/sections/NoirLineupSection.tsx`)
- Signatur: `{ title?, subtitle?, content? }` mit `content = { categories?: string[]; order?: string[] } | null`.
- `const slots = await getLineupSlots({ categories: content?.categories, order: content?.order })`.
- Bei `slots.length === 0` → `null`.
- Flaches Grid **gleich großer** Karten (kein XL/MD-Split). Pro Karte: Bild (`slot.image`, sonst „Foto folgt"), Name, Kategorie-Tag (`slot.categoryLabel`), Meta-Zeile. Link auf `/kuenstler/${slot.slug}` nur wenn `slot.slug` gesetzt, sonst nicht-verlinkte Karte.
- Heading bleibt editierbar (`title`/`subtitle` mit Defaults).

### Section-Plumbing (`src/components/noir/sections/NoirElement.tsx`)
- `case 'noir_lineup': return <NoirLineupSection title={title} subtitle={subtitle} content={content} />` (content durchreichen).

### Admin — Filter + Drag & Drop (`src/app/admin/sections/page.tsx`)
Für `formType === 'noir_lineup'`:
- **Kategorie-Checkboxen** (Musik/Film/Performance/Kinder/Break) → `content.categories: string[]`.
- **Sortierbare Vorschau** der gefilterten Slots (dnd-kit, bereits Dependency): lädt Slots über die neue API, rendert `orderSlots(apiSlots, content.order)`, Drag & Drop aktualisiert `content.order` (Array der appearanceIds). Speichern schreibt `content = { categories, order }` in die Sektion.

### Admin-API (`src/app/api/admin/lineup/preview/route.ts`, neu)
- `GET ?categories=musik,film` — Auth via `getToken` (eingeloggt genügt).
- Antwort `{ slots: LineupSlot[] }` in (Tag, Uhrzeit)-Reihenfolge (ohne manuelle Order; der Client wendet `orderSlots` mit seinem State-`order` an).
- Nutzt `getLineupSlots({ categories, order: [] })` bzw. eine geteilte interne Query.

## Tests

- `src/lib/__tests__/event-validation.test.ts` — anpassen: Import `ALLOWED_SLOT_CATEGORIES`; Test-Inputs `role:` → `category:`; Assertions auf neue Kategorien; Default → `musik`; ungültig → `musik`.
- `src/lib/__tests__/lineup.test.ts` (neu):
  - `resolveLineupCategories`: leer/undefined → `LINEUP_DEFAULT_CATEGORIES`; nur gültige Werte durchgelassen; unbekannte gefiltert.
  - `orderSlots`: gespeicherte Order wird angewendet; neue Slots (nicht in Order) hinten in Eingangsreihenfolge; gelöschte ids in Order ignoriert; leere Order → Eingangsreihenfolge unverändert.

## Betroffene Dateien

**Ändern:**
- `prisma/schema.prisma` (Feld `role`→`category`)
- `src/lib/event-validation.ts` (Konstanten, `sanitizeAppearance`, Typ)
- `src/components/admin/events/TimetableBuilder.tsx`
- `src/app/api/admin/events/[id]/appearances/route.ts`
- `src/app/api/admin/events/[id]/appearances/[appId]/route.ts`
- `src/lib/noir-home.ts`
- `src/components/events/EventTimetable.tsx`
- `src/app/(public)/events/[slug]/page.tsx`
- `src/lib/events.ts` (`ROLE_RANK` raus, Include um `isFeatured` erweitern)
- `src/components/noir/sections/NoirLineupSection.tsx`
- `src/components/noir/sections/NoirElement.tsx`
- `src/app/admin/sections/page.tsx`
- `prisma/seed.ts`
- `src/lib/__tests__/event-validation.test.ts`

**Neu:**
- `prisma/migrations/20260703120000_rename_appearance_role_to_category/migration.sql`
- `src/lib/lineup.ts`
- `src/app/api/admin/lineup/preview/route.ts`
- `src/lib/__tests__/lineup.test.ts`

## Global Constraints

- **Gates:** `npx prisma generate` (nach Schema-Änderung) → `npx tsc --noEmit` → `npm test` → `npm run build`. CI führt **kein** Lint aus.
- **UI-Copy:** Deutsch.
- **Migration:** datenerhaltend (`RENAME COLUMN`), hand-geschrieben; läuft live via `prisma migrate deploy`.
- **Git:** Dateien einzeln nach Namen stagen (kein `git add -A`); `.codex/`, `.memory/…`, `AGENTS.md` unangetastet lassen. Commit-Messages enden mit `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`. Deploy = push nach `main`.
- **Lokale `.env` DATABASE_URL ist veraltet** — keine Skripte lokal gegen die Live-DB laufen lassen.

## Out of Scope

- Kein Slot-Bildfeld / keine Artist-Schema-Änderung (Q1: Pflege als Artist).
- Kein Umbau des Timetable-Layouts über das Entfernen der Headliner-Emphase hinaus.
- Hero-„Acts"-Zähler bleibt künstlerbasiert (`getFeaturedEventLineup`).
- Keine Dedup der Lineup-Karten nach Künstler.
