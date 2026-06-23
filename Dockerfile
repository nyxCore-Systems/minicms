# syntax=docker/dockerfile:1.7
# e-Ventschau — Next.js 15 standalone build, served from node:20-alpine.
# Stages: deps -> builder -> runner (slim app), plus a `migrator` stage with the
# full deps so `prisma migrate deploy` runs reliably (the standalone trace keeps
# @prisma/client but NOT the Prisma CLI and its dependency closure).

# 1. deps — install node_modules once, cache until package-lock changes.
FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json* ./
# Prisma schema is needed here because `npm ci` runs the `postinstall`
# (`prisma generate`) hook.
COPY prisma ./prisma
RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefer-offline --no-audit --fund=false

# 2. builder — produce .next/standalone + .next/static
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Pages are force-dynamic, so the build does not touch the DB. Placeholders keep
# any module that reads these at import time from throwing during `next build`.
ENV NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production \
    DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder \
    DATABASE_URL_UNPOOLED=postgresql://placeholder:placeholder@localhost:5432/placeholder \
    NEXTAUTH_SECRET=placeholder-build-secret \
    NEXTAUTH_URL=https://e-ventschau.nyxcore.cloud \
    TENANT_SLUG=e-ventschau

RUN npm run build

# 3. migrator — full deps + schema + migrations; one-shot `prisma migrate deploy`.
#    Run as a separate compose service during deploy, NOT the app runtime.
FROM node:20-alpine AS migrator
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY prisma ./prisma
CMD ["npx", "prisma", "migrate", "deploy"]

# 4. runner — minimal production image (slim standalone, no Prisma CLI).
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD wget -qO- http://127.0.0.1:3000/ > /dev/null || exit 1

CMD ["node", "server.js"]
