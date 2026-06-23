# Handover — e-Ventschau Migration (Vercel → nyxcore.cloud) + offener Menü-Bug

**Datum:** 2026-06-23 · **Branch:** alles auf `main` (gemerged + deployt) · **Repo:** `nyxCore-Systems/minicms`

Diese Datei ist das Übergabedokument für die nächste Claude-Instanz, die in
diesem Repo weiterarbeitet. Sie fasst den **fertigen Migrationsstand**, alle
**Infra-/Zugangsdetails** und den **einen offenen Bug** (Header-Navigation
scheinbar unsichtbar) mit voller Beweislage zusammen.

---

## 1. Was erledigt ist (live & verifiziert)

Die App (`minicms` = e-Ventschau) läuft self-hosted als Docker-Container,
Vercel läuft noch parallel (Phase 1, kein DNS-Wechsel).

- **Live:** https://e-ventschau.nyxcore.cloud (HTTP 200, gültiges Let's-Encrypt-Cert).
- **Server:** `root@46.224.105.254` (`nyxcore.cloud`), Deploy-Pfad `/opt/e-ventschau`.
- **Container:** `e-ventschau` (compose service `eventschau`) im Netz
  `nyxcore_nyxcore-net`, von Traefik veröffentlicht.
- **DB:** dedizierte DB `eventschau` + Rolle `eventschau_app` auf der **shared
  Instanz `nyxcore-postgres-1`** (pgvector/pg16, erreichbar als Host `postgres`
  im Docker-Netz). Superuser der Instanz: `nyxcore`.
- **Daten:** Neon-Dump 1:1 eingespielt; **15/15 Schlüssel-Tabellen
  row-count-identisch** (Page 18, Media 13, MenuItem 32, Appearance 10, User 3, …).
- **Medien:** unverändert auf **Cloudinary** (cloud `dhvvlv8tq`); API-Key+Secret
  in der Server-`.env` gesetzt → Uploads funktionieren.
- **CI/CD:** Push auf `main` → `.github/workflows/deploy.yml`
  (verify: test+build → rsync → `docker compose up -d --build` → Migrator →
  Healthcheck). Mehrfach grün durchgelaufen.
- **Prisma:** Schema war bisher `db push`-verwaltet → Baseline-Migration
  `prisma/migrations/0_init` erzeugt und auf der Server-DB als applied markiert.
  Künftige Migrationen laufen via `migrate deploy` im **`migrator`-Stage**.
- **Vercel-Reste entfernt:** `vercel.json` weg; `@vercel/analytics` +
  `@vercel/speed-insights` aus Layout + `package.json` entfernt (verursachten
  `/_vercel/*` 404 + MIME-Fehler in der Konsole). Konsole ist jetzt sauber.

### Wichtige Dateien (in diesem Repo)
- `Dockerfile` — stages `deps → builder → migrator → runner`.
  - `deps` kopiert `prisma/` VOR `npm ci` (postinstall = `prisma generate`).
  - `runner` = schlankes `next start`-standalone (KEIN Prisma-CLI).
  - `migrator` = volle deps, `CMD ["npx","prisma","migrate","deploy"]`.
- `docker-compose.yml` — service `eventschau` (Traefik-Labels für
  `e-ventschau.nyxcore.cloud`) + `eventschau-migrate` (profile `migrate`).
- `db/provision.sql` — DB + Rolle anlegen (einmalig).
- `next.config.ts` — `output: 'standalone'` + `outputFileTracingRoot`
  (Pin auf Projektwurzel; sonst nistet ein Eltern-Lockfile die Ausgabe unter
  `.next/standalone/<pfad>/`).
- `docs/superpowers/specs/2026-06-23-eventschau-container-migration-design.md`
- `docs/superpowers/plans/2026-06-23-eventschau-container-migration.md`
- `docs/superpowers/runbooks/2026-06-23-eventschau-cutover.md`

## 2. Zugänge / Secrets (wo liegt was)

- **Server-`.env`:** `/opt/e-ventschau/.env` (chmod 600) — **einzige Quelle der
  Laufzeit-Config**, vom rsync ausgeschlossen. Enthält DB-URL (inkl.
  generiertem DB-Passwort, 48 Hex-Zeichen), NEXTAUTH_SECRET, CLOUDINARY_*,
  TENANT_SLUG, NEXTAUTH_URL, NEXT_PUBLIC_*.
- **GitHub-Repo-Secrets** (`nyxCore-Systems/minicms`): `DEPLOY_SSH_KEY`
  (= lokal `~/.ssh/id_ed25519`, authentifiziert an root@46.224.105.254),
  `DEPLOY_HOST=nyxcore.cloud`, `DATABASE_URL`, `DATABASE_URL_UNPOOLED`,
  `NEXTAUTH_SECRET`. (DB-URLs zeigen für CI-Build/Backup noch auf **Neon**.)
- **SSH:** `ssh -i ~/.ssh/id_ed25519 root@46.224.105.254`.
- Cloudinary-Creds kamen aus `cloudinary.md` (liegt im Repo-Root, **untracked,
  NICHT gitignored** → bitte löschen, enthält Live-Secret).

## 3. Noch offen (nicht-Bug, geplant)

- **Phase 2 (Oliver):** A-Record `e-ventschau.de` → `46.224.105.254`, dann in
  `docker-compose.yml` die Traefik-Router-Rule um
  ``Host(`e-ventschau.de`) || Host(`www.e-ventschau.de`)`` erweitern, committen,
  deploy (LE stellt Cert aus). Danach Vercel abschalten.
- **Backup umstellen:** `db-backup.yml` sichert via Secret noch Neon. Nach
  Phase 2 auf server-seitiges `pg_dump` der `eventschau`-DB umstellen
  (DB ist von außen nicht erreichbar — GitHub-Runner kommt nicht ran). Siehe
  Runbook §8.
- GitHub-Actions nutzen `actions/checkout@v4`/`setup-node@v4` (Node-20-
  Deprecation-Warnung) — irgendwann auf `@v5` heben.

## 4. OFFENER BUG — Header-Navigation scheinbar unsichtbar

**Symptom (User):** „Menü wird kurz angezeigt und verschwindet dann wieder",
später „Menü immer noch weg". In den Screenshots zeigt der **Top-Header nur das
Logo** — keine Nav-Links, kein „Spenden"-Button, kein Dark-Mode-Toggle.
Vergleich: auf Vercel (e-ventschau.de) war oben eine Navi sichtbar.

**Relevante Dateien:**
- `src/components/layout/Header.tsx` — Server-Component, holt
  `getMenuItems()` (default location `'header'`) + `getSiteSettings()`,
  reicht beides an `HeaderClient` als Props.
- `src/components/layout/HeaderClient.tsx` — `'use client'`. Desktop-Nav ist
  `<div className="hidden lg:flex …">` (also nur ab `lg` = **1024px**
  sichtbar). Mobil: Top-Header zeigt nur Logo + Dark-Toggle; Navigation liegt
  in einer **unteren schwebenden Leiste** (`fixed bottom-0 … lg:hidden`,
  `bottomBarVisible`-State, blendet beim Runterscrollen aus) + Vollbild-Overlay.
- `src/app/layout.tsx` — injiziert Theme-CSS-Variablen via `<style>` aus
  `getTheme(settings.themeSlug || 'eventschau')`; setzt `dark`-Klasse anhand
  `settings.defaultDarkMode || theme.defaultDarkMode` + Inline-Script
  (localStorage `theme`).
- `src/lib/themes.ts` — Theme-Map (`--brand-*`, glass vars). Aktiver Theme-Slug
  ist **`noir`** (dark-first).
- `src/lib/menu.ts` — `getMenuItems(location='header')`, filtert
  `location` + `isVisible`.

**Was schon verifiziert ist (Beweislage):**
- DB hat **19 `header`-MenuItems** + 13 `footer`. `/api/menu` liefert Daten.
  Tenant löst korrekt auf (Fix: `TENANT_SLUG=e-ventschau`, NICHT
  `rd-e-ventschau` — letzteres existiert gar nicht; siehe §5).
- SSR-HTML enthält die Nav (`aria-label="Hauptnavigation"`, Labels „Festival",
  „Programm 2026", „Über uns", „Spenden").
- **Headless-Chromium (Playwright, 1366px breit) rendert die Nav KORREKT:**
  - `nav[aria-label="Hauptnavigation"]` existiert, 11 `<a>`, opacity 1, visible.
  - Theme `noir`, `dark`-Klasse aktiv (bleibt aktiv auch mit
    `localStorage.theme='light'`).
  - Nav-Link-Farbe `#FBF7EF @0.8` (helles Cream), Header-BG `rgb(8,40,67)`
    (dunkelblau), Spenden-BG `rgb(250,185,12)` (gelb) → **sollte sichtbar sein**.
  - Über 3,5 s stabil, **kein** Hydration-Fehler, **keine** failing requests
    (nach Vercel-Removal).

**→ Headless lässt sich der Bug NICHT reproduzieren.** Die Nav ist da und müsste
sichtbar sein. Der Unterschied liegt im echten Browser des Users.

**Stärkste Hypothese (zuerst prüfen): Responsive-Breakpoint.**
Der User-Screenshot ist Retina-2x (≈2000px Bild ≈ 1000 logische px). Mit
rechts angedockten DevTools (~580px Bild ≈ ~290 logische pt) bleibt das
**Seiten-Viewport bei ~700 logischen px → unter `lg` (1024px)** → die
Desktop-Top-Nav (`hidden lg:flex`) ist **per Design ausgeblendet**, die
Navigation liegt dann in der **unteren Mobile-Leiste**. Der User sieht oben
korrekterweise nur das Logo.

**Nächste Schritte für dich:**
1. **Mit dem User am echten Browser reproduzieren:** DevTools schließen / Fenster
   auf volle Breite → erscheint die Top-Nav? Falls ja: kein Bug, nur
   Breakpoint-Wahrnehmung (ggf. mit User klären, ob die Top-Nav früher schon
   bei dieser Breite kam — Vercel-Vergleich bei identischer Breite).
2. **Untere Mobile-Leiste prüfen:** Ist bei schmaler Breite die schwebende
   Bottom-Bar (Start/Programm/Events/Rückschau/Kontakt/Menü) sichtbar? Falls
   NEIN, ist DAS der eigentliche Bug → `bottomBarVisible`/`LenisProvider`/
   z-index/`env(safe-area-inset)` untersuchen. (Headless iPhone-13-Probe zeigte
   die Bottom-Bar sichtbar bei scrollY 0.)
3. **Erst wenn Top-Nav auch bei ≥1024px fehlt:** computed color erneut prüfen
   (evtl. theme-/dark-Edgecase im echten Browser, Extensions/Content-Blocker
   ausschließen, harten Reload erzwingen).
4. Repro am besten mit Playwright bei der EXAKTEN logischen Viewport-Breite des
   Users (DevTools docked rechts mitbedenken) statt 1366px.

**Repro-Tooling:** Playwright lief headless via Docker
(`mcr.microsoft.com/playwright:v1.49.0-jammy`, Skript `probe-*.mjs`), da im
Repo kein Playwright als Dependency ist. Live-URL direkt testbar.

## 5. Stolperfallen, die in dieser Migration auftraten (nicht wiederholen)

- **Tenant-Slug:** Der echte (einzige) Tenant hat slug **`e-ventschau`**.
  `rd-e-ventschau` (in altem CLAUDE.md/CI/Code-Fallbacks) existiert NICHT →
  `getTenant()` fand nichts → leere Seiten. Behoben: `TENANT_SLUG=e-ventschau`
  überall (Server-`.env`, `.env.example`, Dockerfile/CI build-env, hartkodierte
  Fallbacks in `src/app/api/{leads,tracking,tracking/vendor-click}/route.ts`,
  CLAUDE.md). `getTenant()` Auflösung: `x-tenant-slug`-Header
  (Middleware aus Subdomain) → `TENANT_SLUG` → Fallback `'e-ventschau'`. Da
  `NEXT_PUBLIC_ROOT_DOMAIN` = voller Host ist, extrahiert die Middleware KEINE
  Subdomain → es zählt `TENANT_SLUG`.
- **Next standalone:** ein verirrtes Eltern-Lockfile (`~/package-lock.json`)
  ließ `outputFileTracingRoot` zu hoch wählen → `server.js` landete unter
  `.next/standalone/Projects/minicms/`. Fix: `outputFileTracingRoot` pinnen.
- **Prisma-CLI fehlt im standalone-Image** → eigener `migrator`-Stage statt
  CLI-Kopie (selektives Kopieren riss die Dependency-Closure auf:
  „Cannot find module @prisma/debug").
- **Vercel `env pull`** liefert „Sensitive" Vars LEER (CLOUDINARY_* kamen leer;
  Cloud-Name stattdessen aus einer Media-URL in der DB geholt).
- **PG17-Dump → PG16-Restore:** einziger Fehler `unrecognized configuration
  parameter "transaction_timeout"` (PG17-Header-SET) — harmlos.
- **`public`-Schema-Ownership:** in PG15+ besitzt der DB-Owner das `public`-
  Schema NICHT automatisch → vor Restore `ALTER SCHEMA public OWNER TO
  eventschau_app` (sonst kann die App-Rolle keine Tabellen anlegen/ändern).

## 6. Nützliche Befehle

```bash
# SSH + Container
ssh -i ~/.ssh/id_ed25519 root@46.224.105.254
docker compose -f /opt/e-ventschau/docker-compose.yml logs -f eventschau
docker inspect -f '{{.State.Health.Status}}' e-ventschau

# DB (auf dem Server, als Superuser)
docker exec -it nyxcore-postgres-1 psql -U nyxcore -d eventschau

# Manueller Deploy (sonst via push auf main)
cd /opt/e-ventschau && docker compose up -d --build eventschau
docker compose --profile migrate run --rm eventschau-migrate   # migrate deploy
```
