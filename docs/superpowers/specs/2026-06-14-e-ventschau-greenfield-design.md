# Design: minicms → e-ventschau (Greenfield Rebrand)

**Datum:** 2026-06-14
**Status:** Approved (Brainstorming)
**Personas/Lenses:** Athena (Architektur), Metis (Shipping-Cadence)

## Ziel

Das wiederverwendbare CMS-Codegerüst (intern „minicms", aktuell als e-ventschau-Messermarktplatz
ausgeprägt) zu **e-ventschau** umbauen — der Website eines Benefiz-Musikfestivals (11. Ausgabe,
7.–8. August 2026). Inhalte werden von der Live-Seite https://e-ventschau.de/ importiert.
Neues GitHub-Repo mit frischer Git-History, neue Neon-Datenbank, Vercel-Deploy unter
`e-ventschau.vercel.app`. Der bestehende nyxCore-Projekteintrag „minicms" wird auf das neue Repo
umgehängt.

## Entscheidungen (vom User bestätigt)

- **Repo-Strategie:** Neues GitHub-Repo, frische History (echtes Greenfield).
- **Content:** Echte Inhalte von e-ventschau.de importieren (keine leeren Platzhalter).
- **Provisioning:** Per CLI (vercel/neon). User loggt sich interaktiv ein, Claude führt aus.
- **nyxCore:** Bestehenden „minicms"-Eintrag auf das neue Repo umwidmen.
- **Design:** Liquid-Glass-Designsystem behalten, Palette durch aus e-ventschau.de extrahierte
  Festival-Farben ersetzen.
- **Archiv:** Alle Rückschau-Jahre (2016, 2017, 2018, 2019, 2022, 2023, 2024) voll importieren.

## Was bleibt (CMS-Skelett)

- Admin-Dashboard (`src/app/admin/`), NextAuth (JWT, Credentials), Rollen ADMIN/EDITOR
- Markdown-CMS: `Page`-Modell, `getPublishedContent()`, `[...slug]`-Renderer, Admin-Editor mit Live-Preview
- Cloudinary-Media-Upload + Media-Picker
- Multi-Tenant-System (`getTenant()`, `TENANT_SLUG`)
- Liquid-Glass-Designsystem (`.glass`, `.glass-card`, `.btn-primary` etc.)
- Next.js 15 App Router, Prisma 6, force-dynamic Content-Pages

## Was entfernt/umgebaut wird

**Löschen:**
- `src/app/(public)/haendler/`, `src/app/(public)/produkte/` (e-ventschau-spezifisch)
- `src/content/*.md` (Messer-Inhalte: agb, herstellung, material, schleifen, so-funktioniert-es)
- e-ventschau-Seed-Daten

**Rebrand:**
- `package.json` → name `e-ventschau`
- Tenant-Slug `rd-e-ventschau` → `e-ventschau` (DB-Tenant + `TENANT_SLUG`)
- Header/Footer-Navigation auf neue Seitenstruktur
- `layout.tsx` Metadata (Titel, Description, OG), `sitemap.ts`, `robots.ts`
- Logo/Tagline → e-Ventschau / „11. e-Ventschau-Benefiz-Festival"
- `tailwind.config.ts` Brand-Farben → aus e-ventschau.de extrahierte Festival-Palette
- `CLAUDE.md` + `MEMORY.md` an neues Projekt anpassen

## Seitenstruktur (CMS Page-Records / Routen)

| Route                       | Quelle (e-ventschau.de)                  |
|-----------------------------|------------------------------------------|
| `/` (Start)                 | Homepage: Ankündigung, Termine, Line-up  |
| `/informationen`            | /informationen (Über uns)                |
| `/programm-2026`            | /programm-2024 (aktuelles Programm)      |
| `/rueckschau`               | /rueckschau (Übersicht)                  |
| `/rueckschau/programm-2024` | /rueckschau/programm-2024-2              |
| `/rueckschau/programm-2023` | /rueckschau/programm-2023                |
| `/rueckschau/programm-2022` | /rueckschau/programm-2022                |
| `/rueckschau/programm-2019` | /rueckschau/programm-2019                |
| `/rueckschau/programm-2018` | /rueckschau/programm-2018                |
| `/rueckschau/programm-2017` | /rueckschau/programm-2017                |
| `/rueckschau/programm-2016` | /rueckschau/programm-2016                |
| `/festival-filme`           | /festival-filme                          |
| `/presse`                   | /presse                                  |
| `/unterstuetzung`           | /unterstuetzung                          |
| `/unterstuetzung/spende`    | /unterstuetzung-2 (Ihre Spende)          |
| `/foerderer`                | /sponsoren-unterstuetzer-foerderer       |
| `/kontakt`                  | /kontakt                                  |
| `/impressum`                | /impressum                               |
| `/datenschutz`              | /datenschutz (Datenschutz und AGB)       |

**Ausgelassen:** `/warenkorb` (Shop/WooCommerce — das CMS hat kein E-Commerce; Ticketing
später ggf. als externer Link).

## Ausführung — 3 Phasen

### Phase 1 — Code-Rebrand (Hauptagent, sequenziell)
e-ventschau-Seiten löschen, umbenennen (package, tenant, metadata), Header/Footer-Nav auf neue
Struktur, Palette in `tailwind.config.ts` tauschen, CLAUDE.md/MEMORY.md anpassen.

### Phase 2 — Content-Import (parallel, günstige Models)
~18 Seiten parallel via Subagenten (Haiku-Tier) fetchen → zu Markdown konvertieren →
in eine Prisma-Seed-Datei (`prisma/seed.ts`) schreiben (Page-Records, tenant `e-ventschau`,
published). Bilder optional zu Cloudinary; im ersten Schritt direkte Bild-URLs / Platzhalter.

### Phase 3 — Provisioning & Deploy (CLI, interaktiv)
1. Neues lokales Git-Init (frische History) → neues GitHub-Repo `e-ventschau`
2. Neon-DB anlegen → `DATABASE_URL` in `.env` + `.env.local`
3. `npm run db:push` + Seed
4. Vercel-Projekt anlegen, Env-Vars (`printf 'val' | vercel env add`), Domain `e-ventschau.vercel.app`
5. Deploy
6. nyxCore: „minicms"-Eintrag auf `mrwind-up-bird/e-ventschau` umhängen

## Risiken / Offene Punkte

- **Bilder:** Live-Seite hat Band-Fotos/Sponsorenlogos. Erststand: Bild-URLs referenzieren oder
  weglassen; Cloudinary-Migration als Folge-Task.
- **Provisioning-Zugang:** Erfordert interaktiven Login (`vercel login`, `neonctl auth`). Claude
  kann nicht ohne User-Session deployen.
- **Inhaltstreue:** Importierte Texte = bestmögliche Markdown-Konvertierung des HTML; ggf.
  manuelle Nacharbeit im Admin.
- **Datenschutz/Impressum:** Rechtstexte 1:1 übernehmen, vom User auf Aktualität prüfen lassen.

## Erfolgskriterien

- `npm run dev` zeigt e-ventschau-Branding, keine e-ventschau-Reste (grep-clean).
- Alle Seiten aus der Tabelle als veröffentlichte CMS-Inhalte erreichbar.
- `npm run build` grün.
- Live unter `e-ventschau.vercel.app` mit funktionierendem Admin-Login.
- nyxCore-Eintrag zeigt auf neues Repo.
