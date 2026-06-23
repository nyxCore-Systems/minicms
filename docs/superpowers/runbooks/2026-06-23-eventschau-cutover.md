# e-Ventschau Cutover Runbook (Vercel → nyxcore.cloud)

Prerequisites: merged `feat/container-migration-nyxcore` to `main`; GitHub
repo secrets set (`DEPLOY_SSH_KEY`, `DATABASE_URL`, `DATABASE_URL_UNPOOLED`,
`NEXTAUTH_SECRET`); SSH access to `root@46.224.105.254`.

Naming used below: compose service `eventschau` (container `e-ventschau`),
one-shot migrator service `eventschau-migrate` (profile `migrate`), DB
`eventschau`, role `eventschau_app`, deploy path `/opt/e-ventschau`.

## 1. Provision the database (on the server)

```bash
# Set a strong password in db/provision.sql first (replace CHANGE_ME_...).
cd /opt/nyxcore
docker compose exec -T postgres psql -U nyxcore -d postgres < /opt/e-ventschau/db/provision.sql
```

## 2. Dump Neon and restore into the eventschau DB

```bash
# From any machine with network access to Neon:
pg_dump --no-owner --no-acl "<NEON_UNPOOLED_URL>" | gzip > eventschau.sql.gz
scp eventschau.sql.gz root@46.224.105.254:/tmp/

# On the server, restore as eventschau_app into the eventschau DB:
gunzip -c /tmp/eventschau.sql.gz | \
  docker compose -f /opt/nyxcore/docker-compose.yml exec -T postgres \
  psql "postgresql://eventschau_app:<password>@localhost:5432/eventschau"
```

## 3. Create the host .env

```bash
cat > /opt/e-ventschau/.env <<'EOF'
DATABASE_URL=postgresql://eventschau_app:<password>@postgres:5432/eventschau
DATABASE_URL_UNPOOLED=postgresql://eventschau_app:<password>@postgres:5432/eventschau
NEXTAUTH_SECRET=<from Vercel>
NEXTAUTH_URL=https://e-ventschau.nyxcore.cloud
TENANT_SLUG=e-ventschau
NEXT_PUBLIC_SITE_URL=https://e-ventschau.de
NEXT_PUBLIC_ROOT_DOMAIN=e-ventschau.nyxcore.cloud
CLOUDINARY_CLOUD_NAME=<from Vercel>
CLOUDINARY_API_KEY=<from Vercel>
CLOUDINARY_API_SECRET=<from Vercel>
OPENAI_API_KEY=<from Vercel>
EOF
chmod 600 /opt/e-ventschau/.env
```

## 4. Baseline the Prisma migration (tables already exist from the dump)

Mark `0_init` as applied so `migrate deploy` doesn't try to re-create tables.
The app container has no Prisma CLI, so run it through the migrator service:

```bash
cd /opt/e-ventschau
docker compose --profile migrate run --rm --build eventschau-migrate \
  npx prisma migrate resolve --applied 0_init
```

## 5. Trigger the deploy

Push to `main` (or run the "Deploy to production" workflow via
`workflow_dispatch`). It rsyncs, builds, runs the migrator
(`docker compose --profile migrate run --rm eventschau-migrate`, a no-op now
that `0_init` is resolved), and health-checks.

## 6. Row-count verification (source vs target)

For each key table compare counts on Neon vs the eventschau DB:

```bash
for t in "Page" "Artist" "Event" "Media" "Vendor" "Product" "Lead" "User"; do
  echo -n "$t neon=";   psql "<NEON_UNPOOLED_URL>" -tAc "SELECT count(*) FROM \"$t\";"
  echo -n "$t target="; docker compose -f /opt/nyxcore/docker-compose.yml exec -T postgres \
    psql "postgresql://eventschau_app:<password>@localhost:5432/eventschau" -tAc "SELECT count(*) FROM \"$t\";"
done
```

Counts must match.

## 7. Smoke test

1. `curl -I https://e-ventschau.nyxcore.cloud/` → 200, valid Let's Encrypt cert.
2. Open the homepage — correct tenant content renders.
3. A Cloudinary image loads (network tab shows `res.cloudinary.com`).
4. Admin login at `/admin/login` works.
5. Submit a lead (`POST /api/leads`) — row appears in the `Lead` table.

## 8. Repoint the daily backup

In the minicms repo, set the `DATABASE_URL_UNPOOLED` secret to the eventschau
URL. The DB is only reachable inside the server's docker network, so the
GitHub-hosted backup runner cannot reach it directly. Choose one:

- **Server-side cron** (recommended): a `pg_dump` cron on the server that pipes
  through the shared `postgres` container and uploads to R2 with `aws s3 cp`
  (reuse the same R2 bucket/keys). Replaces `db-backup.yml`.
- **Keep GitHub Action**: only if the DB is exposed via an SSH tunnel or a
  dedicated published port (adds attack surface — not recommended).

The R2 bucket (`e-ventschau-backups`) and 30-day retention stay as-is.

## Phase 2 (later, by Oliver): point e-ventschau.de here

1. Set the `e-ventschau.de` A-record → `46.224.105.254`.
2. Extend the Traefik router rule in `docker-compose.yml` to:
   `Host(\`e-ventschau.nyxcore.cloud\`) || Host(\`e-ventschau.de\`) || Host(\`www.e-ventschau.de\`)`,
   commit, deploy (Let's Encrypt issues the new certs once DNS resolves).
3. Optionally switch `NEXTAUTH_URL` to `https://e-ventschau.de`.
4. Disable the Vercel project.
