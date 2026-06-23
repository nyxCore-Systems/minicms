# e-Ventschau: Migration von Vercel → Container auf nyxcore.cloud

**Datum:** 2026-06-23
**Status:** Approved (Design)
**Repo:** `nyxCore-Systems/minicms` (App-Codename `e-ventschau`)

## Ziel

Die e-Ventschau-App (Next.js 15 / Prisma / NextAuth / Cloudinary / OpenAI),
aktuell auf Vercel + Neon Postgres, zieht 1:1 als Container auf den
nyxCore-Server (`root@46.224.105.254`, `nyxcore.cloud`) um und wird unter
`https://e-ventschau.nyxcore.cloud` veröffentlicht. Später wird der
DNS-A-Record von `e-ventschau.de` auf diese Maschine gezeigt.

Vorlage ist die bereits dort laufende `nyxcore-landingpage` (Traefik +
Let's Encrypt, shared `nyxcore_nyxcore-net`, shared Postgres, rsync→compose
Deploy).

## Architektur-Entscheidungen

| Thema | Entscheidung | Begründung |
|-------|--------------|------------|
| Medien | **Cloudinary behalten** | Assets liegen durabel in der Cloud, von jedem Server erreichbar; DB speichert Cloudinary-URLs. Kein Code-Umbau, keine Migration nötig. |
| Datenbank | **Shared Postgres, eigene DB `eventschau`** | Wie landingpage (`landing`-DB). Weniger Container, einheitlicher Betrieb. |
| DB-Backup | **R2-Backup behalten** | Bestehender Workflow, nur DB-URL umgebogen. Bewährt, externer Speicherort. |
| Migrationen | **`prisma migrate deploy`** im Container | minicms nutzt Prisma Migrate (nicht das rohe SQL-Script der landingpage). |
| `NEXTAUTH_URL` Phase 1 | `https://e-ventschau.nyxcore.cloud` | Admin-Login sofort nutzbar, vor DNS-Umzug. |

## Zielzustand

- Container `e-ventschau` im Netz `nyxcore_nyxcore-net`.
- Traefik-Router (eigener, nicht der landingpage-Router) auf
  `Host(\`e-ventschau.nyxcore.cloud\`)`, websecure, certresolver letsencrypt,
  Middlewares `security-headers@file,gzip-compress@file`, Backend-Port 3000.
- Daten in DB `eventschau` auf der shared Postgres-Instanz (`postgres:5432`).
- Medien unverändert bei Cloudinary.
- Deploy: Push auf `main` → GitHub Action → rsync nach `/opt/e-ventschau` →
  `docker compose up -d --build` → `prisma migrate deploy` → Healthcheck.
- Alle Änderungen im `minicms`-Repo.

## Komponenten / Dateien (im minicms-Repo)

### Neu
- **`Dockerfile`** — multi-stage `deps → builder → runner` (node:20-alpine).
  `npm run build` (enthält `prisma generate`) im builder. Runner kopiert
  `.next/standalone`, `.next/static`, `public`, **`prisma/`** (Schema +
  Migrations) und das **Prisma-CLI** (für `migrate deploy`). Healthcheck per
  `wget` auf `http://127.0.0.1:3000/`. `CMD ["node","server.js"]`.
- **`docker-compose.yml`** — Service `eventschau`, `image: e-ventschau:latest`,
  `restart: unless-stopped`, `networks: [nyxcore-net]` (external
  `nyxcore_nyxcore-net`), Traefik-Labels (Router `eventschau`,
  Service `eventschau-service`, Port 3000), Env aus Host-`.env`,
  json-file-Logging (10m/3), Ressourcen-Limits (cpus 1.0 / mem 512M,
  reservations 0.1 / 128M). Kein lokales Volume (Daten in DB + Cloudinary).
- **`.dockerignore`** — `.git`, `node_modules`, `.next`, `.env*`, `.vercel`,
  `.DS_Store`, `tsconfig.tsbuildinfo`, `drafts`, `docs`.
- **`.github/workflows/deploy.yml`** — Klon des landingpage-Deploys:
  - `env`: `APP_DIR=/opt/e-ventschau`, `COMPOSE_SERVICE=eventschau`,
    `CONTAINER=e-ventschau`.
  - `verify`-Job: `npm ci` → `npx prisma generate` → `npm test` →
    `npx next build` (mit Build-Env wie ci.yml).
  - `deploy`-Job: SSH konfigurieren (Secret `DEPLOY_SSH_KEY`), rsync (additiv,
    `--exclude=.env --exclude=node_modules --exclude=.next --exclude=.git
    --exclude=.vercel --exclude=.DS_Store --exclude=tsconfig.tsbuildinfo`),
    dann remote `docker compose up -d --build --remove-orphans`,
    `docker compose exec -T eventschau npx prisma migrate deploy`,
    `docker image prune -f`, Healthcheck-Loop (20×6s auf
    `.State.Health.Status == healthy`), bei Fehler `docker logs --tail 50`.
- **`db/provision.sql`** — legt Rolle `eventschau_app` (mit Passwort-Platzhalter)
  und DB `eventschau` an, `GRANT`s nur auf diese DB. Einmalig auf dem Server
  ausgeführt.

### Geändert
- **`next.config.ts`** — `output: 'standalone'` ergänzen.
- **`.github/workflows/db-backup.yml`** — unverändert; nur die Repo-Secrets
  `DATABASE_URL_UNPOOLED` (und ggf. R2) zeigen nach Cutover auf die neue DB.

### Entfernt / stillgelegt
- `vercel.json`, `.vercel/` (aus Repo entfernen bzw. ignorieren).
- Optional später: `@vercel/analytics`, `@vercel/speed-insights` aus
  `package.json` (nicht Teil dieses Umzugs, separat).

## Konfiguration (Host `/opt/e-ventschau/.env`, NICHT im Repo, chmod 600)

```
DATABASE_URL=postgresql://eventschau_app:***@postgres:5432/eventschau
DATABASE_URL_UNPOOLED=postgresql://eventschau_app:***@postgres:5432/eventschau
NEXTAUTH_SECRET=<aus Vercel übernehmen>
NEXTAUTH_URL=https://e-ventschau.nyxcore.cloud
TENANT_SLUG=rd-e-ventschau
NEXT_PUBLIC_SITE_URL=https://e-ventschau.de
NEXT_PUBLIC_ROOT_DOMAIN=e-ventschau.nyxcore.cloud
CLOUDINARY_CLOUD_NAME=<aus Vercel>
CLOUDINARY_API_KEY=<aus Vercel>
CLOUDINARY_API_SECRET=<aus Vercel>
OPENAI_API_KEY=<aus Vercel>
```

Hinweise:
- `TENANT_SLUG=rd-e-ventschau` überschreibt die Subdomain-Auflösung in
  `getTenant()` — notwendig, da der Tenant-Slug (`rd-e-ventschau`) nicht der
  Subdomain (`e-ventschau`) entspricht.
- Pooled/Unpooled-URL sind identisch (kein Pooler); das Neon-`withRetry()`
  bleibt funktional unschädlich.

## Datenmigration (einmalig, manuell beim Cutover)

1. `pg_dump --no-owner --no-acl <NEON_UNPOOLED_URL> | gzip > eventschau.sql.gz`.
2. Server: `db/provision.sql` einspielen (DB + User anlegen).
3. Dump einspielen: `gunzip -c eventschau.sql.gz | psql <eventschau-DB>`.
4. Verifikation: Row-Counts der Schlüssel-Tabellen (`Page`, `Artist`, `Event`,
   `Media`, `Vendor`, `Product`, `Lead`, `User`) Quelle vs. Ziel vergleichen.
5. Medien: keine Aktion — Cloudinary-URLs in der DB bleiben gültig.

## DNS / Cutover-Phasen

- **Phase 1 (dieser Task):** Container live unter
  `e-ventschau.nyxcore.cloud`; Vercel läuft parallel weiter (kein Risiko).
- **Phase 2 (durch Nutzer):** A-Record `e-ventschau.de` →
  `46.224.105.254`. Danach Traefik-Router um
  `Host(\`e-ventschau.de\`) || Host(\`www.e-ventschau.de\`)` erweitern
  (Cert wird dann ausgestellt), `NEXTAUTH_URL` ggf. auf `e-ventschau.de`
  umstellen, Vercel-Projekt abschalten.

## Sicherheit (Nemesis-Lens)

- `.env` nur auf Host, von rsync ausgeschlossen, chmod 600.
- DB-User `eventschau_app` hat Rechte ausschließlich auf DB `eventschau`.
- Postgres nicht nach außen exponiert (nur im Docker-Netz erreichbar).
- Traefik `security-headers@file` Middleware aktiv.
- Secrets als GitHub Repo-Secrets (`DEPLOY_SSH_KEY`, `DATABASE_URL*`,
  R2-Keys).

## Test / Verifikation

- **CI:** `npm test` + `next build` grün (bestehende ci.yml + verify-Job).
- **Deploy:** Healthcheck muss „healthy" werden, sonst Log-Ausgabe + Fehlexit.
- **Smoke nach Deploy:**
  1. Public-Startseite lädt (HTTP 200, korrekter Tenant-Inhalt).
  2. Ein Cloudinary-Bild lädt.
  3. Admin-Login funktioniert.
  4. Ein DB-Schreibvorgang (z.B. Lead via `POST /api/leads`) persistiert.

## Out of Scope

- Self-Hosting der Medien (Cloudinary bleibt).
- Migration auf shared Redis (App nutzt kein Redis).
- Entfernen der Vercel-Analytics-Pakete (separate Aufgabe).
- DNS-Umstellung von `e-ventschau.de` (erfolgt durch Nutzer in Phase 2).
