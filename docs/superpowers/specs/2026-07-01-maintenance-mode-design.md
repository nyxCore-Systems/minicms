# Wartungsmodus (Maintenance Mode) — Design

**Datum:** 2026-07-01
**Ziel:** Eine Wartungsseite im Noir-Stil anzeigen und die restliche öffentliche
Website ausblenden, solange die Inhalte überarbeitet werden.

## Anforderungen (bestätigt)

- **Umschalten:** Admin-Schalter unter `/admin/setup` (kein Deploy nötig).
- **Vorschau:** Eingeloggte Admins sehen weiterhin die echte Seite (Live-Vorschau);
  alle anderen Besucher sehen die Wartungsseite.
- **Inhalt der Wartungsseite:** Logo + kurzer Text im Noir-Look.
  - Überschrift: „Wir sind gleich zurück"
  - Untertext: „Diese Seite wird gerade überarbeitet. Schaut bald wieder vorbei."

## Architektur

### 1. Datenmodell
Neues Feld `maintenanceMode Boolean @default(false)` auf `SiteSettings`
(`prisma/schema.prisma`). Migration:
`prisma/migrations/20260701000000_add_maintenance_mode/migration.sql` — additive
Spalte mit Default `false`, wird beim Deploy vom Migrator-Container
(`prisma migrate deploy`) angewendet.

### 2. Datenhelfer
`src/lib/menu.ts`: `SiteSettingsData`-Typ, `defaultSettings` und die
`getSiteSettings()`-Rückgabe um `maintenanceMode` erweitert.

### 3. Admin-Schalter
`src/app/api/admin/settings/route.ts`: PUT nimmt `maintenanceMode` entgegen
(update + create); GET gibt es via `...settings` bereits mit zurück.
`src/app/admin/setup/page.tsx`: neue Karte „Wartungsmodus" mit Checkbox-Toggle,
State-Verdrahtung im Laden und im Save-Payload.

### 4. Gate im Public-Layout
`src/app/(public)/layout.tsx` ist `async`:
- liest `getSiteSettings()` und prüft die Admin-Session (`getToken` mit Cookies,
  gleiches Muster wie die Settings-Route),
- rendert bei `maintenanceMode === true` und **ohne** Admin-Session ausschließlich
  `<MaintenanceScreen>` statt Header/`<main>`/Footer,
- `generateMetadata()` setzt bei aktiver Wartung `robots: noindex, nofollow`.

Damit sind alle öffentlichen Routen der `(public)`-Gruppe (Home, Katalogseiten,
`kuenstler/*`, `events/*`, `programm-2026`, `rueckschau`) in einem Rutsch
versteckt. Admin-Bereich (`/admin/*`) und API-Routen liegen außerhalb der Gruppe
und bleiben erreichbar.

### 5. Wartungsseite
`src/components/MaintenanceScreen.tsx`: zentrierte Vollbild-Ansicht, erbt
`data-theme="noir"` + CSS-Variablen vom Root-Layout, inkl. `nh-grain`/`nh-scan`.
Logo aus `settings.logoUrl`, Mono-Kicker „WARTUNG", große Sand-Überschrift,
gedämpfter Untertext.

## Bewusst weggelassen (YAGNI)
- 503-Statuscode (aus einem Layout nicht sauber setzbar; für temporäre Wartung
  unkritisch — stattdessen `noindex`).
- Countdown/Datum, Kontakt-/Social-Links.

## Verifikation
- `npm test` grün, `npm run build` (inkl. Typecheck) erfolgreich.
- Migration ist additiv und rückwärtskompatibel.
