# SEO für Künstler- & Event-Unterseiten

**Datum:** 2026-07-01
**Status:** Design (approval pending)

## Kontext & Problem

Die öffentlichen Detailseiten `/kuenstler/[slug]` und `/events/[slug]` besitzen bereits
`generateMetadata()` inklusive JSON-LD (MusicGroup / MusicEvent), und das
path-basierte Tracking (`TrackPageView` → `/api/tracking`) erfasst sie automatisch.

Drei Lücken bleiben:

1. **Keine AI-Auto-Generierung** für SEO in den Künstler-/Event-Admin-Formularen.
   Der "SEO generieren"-Button existiert nur im Seiten-Editor (`admin/content/[id]`).
2. **Kein Dashboard-Scoring:** `/admin/seo` (`computeSeoHealth`) bewertet ausschließlich
   das `Page`-Modell. Künstler & Events tauchen im SEO-Health-Score nicht auf.
3. **Fehlende SEO-Felder:** `Artist` und `Event` haben nur `metaTitle` + `metaDescription`.
   `Page` hat zusätzlich `metaKeywords` und `ogImage`.

## Ziele

- Volle SEO-Feld-Parität (`metaKeywords`, `ogImage`) für `Artist` und `Event`.
- "SEO generieren"-Button in beiden Admin-Formularen (wie im Seiten-Editor), aber ohne
  FAQ-Generierung (kein `faqSchema`-Feld bei diesen Entitäten).
- Künstler & Events im `/admin/seo` Health-Score sichtbar, mit angepasstem (fairem)
  Scoring und Typ-Tagging in derselben Liste.
- Öffentliche `generateMetadata()` nutzt neue Felder (`ogImage` mit `heroImage`-Fallback,
  `metaKeywords`).

**Kein Ziel (YAGNI):** FAQ-Schema für Artist/Event, eigene Detail-Statistiken pro
Entität, Änderungen am bestehenden Seiten-Editor-Verhalten.

## Entscheidungen (mit User geklärt)

| Frage | Entscheidung |
|-------|--------------|
| Tracking | Automatisch vorhanden — nur im SEO-Dashboard sichtbar machen |
| AI-SEO-Ort | Button im Admin-Formular |
| Dashboard-Scoring | Angepasster Score (nur vorhandene Felder) |
| Neue Felder | Volle SEO-Felder: `metaKeywords` + `ogImage` (Migration) |
| FAQ-Generierung | Optional per `skipFaq`-Flag am Endpoint |
| Dashboard-Darstellung | Dieselbe Liste, mit Typ-Label + Slug-Präfix |

## Architektur & Änderungen

### 1. Datenmodell (`prisma/schema.prisma`)

`Artist` und `Event` je ergänzen:

```prisma
metaKeywords    String?
ogImage         String?
```

Beide nullable → keine Migration von Bestandsdaten nötig. Migration via
`npm run db:migrate` (Prisma CLI liest `.env`, dort muss `DATABASE_URL` gesetzt sein).

### 2. AI-Endpoint (`src/app/api/admin/ai/generate-seo/route.ts`)

- Body um optionales `skipFaq?: boolean` erweitern.
- Wenn `skipFaq === true`: nur der SEO-`chat.completions.create`-Call; der FAQ-Call
  entfällt. Response: `faqItems: []`.
- Default (`skipFaq` fehlt/false): unverändert → Seiten-Editor bleibt kompatibel.

### 3. Update-API-Routen

- `src/app/api/admin/artists/[id]/route.ts` (PUT): `metaKeywords`, `ogImage` akzeptieren,
  Muster: `if (body.x !== undefined) data.x = body.x ? String(body.x) : null`.
- `src/app/api/admin/events/[id]/route.ts` (PUT): identisch.
- Analog die POST/Create-Routen prüfen und gleiche Felder zulassen, falls vorhanden.

### 4. Data-Helpers (`src/lib/artists.ts`, `src/lib/events.ts`)

Sicherstellen, dass `metaKeywords`/`ogImage` in den Rückgaben enthalten sind (bei
explizitem `select` ergänzen; bei `include`/kein-select automatisch dabei).

### 5. Admin-Formulare

**Artist** (`src/app/admin/artists/[id]/page.tsx`),
**Event** (`src/app/admin/events/[id]/page.tsx`):

- Form-State um `metaKeywords: ''` und `ogImage: ''` erweitern; beim Laden aus DB füllen.
- Neue Felder im SEO-Block: `Meta-Keywords` (Input) + `OG-Bild` (URL-Input, optional
  `MediaPickerDialog`). Optional je `AiImproveButton` (bestehende Komponente).
- **"SEO generieren"-Button**: `POST /api/admin/ai/generate-seo` mit
  - `content`: Artist → `bio || excerpt`; Event → `description || excerpt`
  - `slug`, `title` (Artist: `name`, Event: `title`)
  - `currentMeta`: aktuelle Meta-Werte
  - `skipFaq: true`
  - Ergebnis-Vorschau; "Übernehmen" setzt `metaTitle`, `metaDescription`,
    `metaKeywords` (Join `, `).

### 6. SEO-Dashboard (`src/app/api/admin/seo/dashboard/route.ts`)

- `computeSeoHealth()`: zusätzlich `Artist` + `Event` laden
  (`select`: slug, name/title, metaTitle, metaDescription, metaKeywords, ogImage,
  heroImage, excerpt/bio/description, isPublished, updatedAt).
- Neue Funktion `computeEntityScore()` (0–100, normiert) ohne FAQ/Keywords-Pflichtstrafe:
  - Meta-Titel vorhanden / Länge 30–60
  - Meta-Beschreibung vorhanden / Länge 120–155
  - Bild vorhanden (`ogImage || heroImage`)
  - Keywords vorhanden (kleiner Bonus, kein großer Abzug)
  - Veröffentlicht
  - Aktualität < 90 Tage
  - Punkte werden auf 0–100 skaliert, damit Vergleich mit Pages fair bleibt.
- Ergebnis-Einträge erhalten `type: 'page' | 'artist' | 'event'` und Slug-Präfix
  (`/kuenstler/<slug>`, `/events/<slug>`). Alle in dieselbe `pages`-Liste;
  `siteAverage` über alle veröffentlichten Einträge.

**Frontend** (`src/components/admin/seo/SeoHealthScore.tsx`): Typ-Label je Eintrag
rendern (z. B. Badge "Seite"/"Künstler"/"Event"). Response bleibt strukturell
kompatibel (zusätzliches optionales `type`-Feld).

### 7. Öffentliche Metadaten

`src/app/(public)/kuenstler/[slug]/page.tsx` &
`src/app/(public)/events/[slug]/page.tsx` — `generateMetadata()`:

- `ogImage`: `entity.ogImage || entity.heroImage`
- `keywords`: `entity.metaKeywords?.split(', ')`
- an `buildMetadata(...)` durchreichen (Signatur unterstützt bereits `keywords`/`ogImage`).

## Datenfluss

```
Admin-Formular ──"SEO generieren"──▶ /api/admin/ai/generate-seo (skipFaq:true)
      │                                        │
      │◀────── metaTitle/desc/keywords ────────┘
      ▼
   Übernehmen ──PUT──▶ /api/admin/{artists|events}/[id] ──▶ DB (metaKeywords, ogImage)
                                                                │
Public generateMetadata() ◀── lib/{artists|events}.ts ◀────────┘
Dashboard /admin/seo  ◀── computeSeoHealth() (Page + Artist + Event) ◀── DB
```

## Fehlerbehandlung

- AI-Endpoint: bestehende Fehlerpfade (fehlender API-Key, 502 bei leerer Antwort).
- `skipFaq` rein additiv → kein Bruch bestehender Aufrufer.
- Neue Felder nullable → keine Pflicht, kein Fallback-Zwang.

## Testing

- **Unit** (`node:test` via tsx, `src/lib/__tests__/`): `computeEntityScore()` mit
  Fixtures (leer / voll / Grenzlängen) → erwartete 0–100-Scores.
- **Manuell**: Migration ausführen; Künstler/Event bearbeiten → "SEO generieren" →
  Übernehmen → Speichern; öffentliche Seite `<head>`/OG prüfen; `/admin/seo` zeigt
  Künstler/Events mit Score & Label.
- **CI**: `npm test` + `next build` müssen grün sein; `npm run lint` lokal.

## Betroffene Dateien

- `prisma/schema.prisma` (+ Migration)
- `src/app/api/admin/ai/generate-seo/route.ts`
- `src/app/api/admin/artists/[id]/route.ts` (+ ggf. create-Route)
- `src/app/api/admin/events/[id]/route.ts` (+ ggf. create-Route)
- `src/lib/artists.ts`, `src/lib/events.ts`
- `src/app/admin/artists/[id]/page.tsx`, `src/app/admin/events/[id]/page.tsx`
- `src/app/api/admin/seo/dashboard/route.ts`
- `src/components/admin/seo/SeoHealthScore.tsx`
- `src/app/(public)/kuenstler/[slug]/page.tsx`, `src/app/(public)/events/[slug]/page.tsx`
- `src/lib/__tests__/seo-entity-score.test.ts` (neu)
