# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev            # Start dev server (port 3000)
npm run build          # prisma generate && next build
npm run lint           # ESLint
npm run db:push        # Push Prisma schema to DB
npm run db:migrate     # Run Prisma migrations
npm run db:seed        # Seed DB (npx tsx prisma/seed.ts)
npm run db:studio      # Open Prisma Studio
```

No test framework is configured.

## Architecture

Next.js 15 App Router with TypeScript, React 19, Tailwind 3.4, Prisma 6 (Neon PostgreSQL), NextAuth 4 (JWT strategy), Cloudinary for media. German-language website for the **e-Ventschau** benefit music festival (built on the reusable "minicms" CMS skeleton).

### Route Groups & Layouts

- **`src/app/(public)/`** — Public pages with Header/Footer layout. The `(public)` group name doesn't appear in URLs.
- **`src/app/admin/`** — Protected admin dashboard. `middleware.ts` re-exports `next-auth/middleware` and protects `/admin/*` except `/admin/login`.
- **Admin layout** (`src/app/admin/layout.tsx`) checks JWT token via `getToken()`. If no token, renders only children (login page). If token exists, renders sidebar chrome + children.

### Multi-Tenant Content System

All data is scoped to a tenant (resolved via `TENANT_SLUG` env var → `getTenant()` in `src/lib/tenant.ts`). Current tenant: `e-ventschau`.

**Content flow**: Markdown content lives in DB `Page` model (originally seeded from `src/content/*.md` via gray-matter). Public pages call `getPublishedContent(slug)` from `src/lib/markdown.ts` — returns `null` for unpublished drafts, triggering `notFound()`. Admin editor at `/admin/content/[id]` provides live markdown preview, draft/publish toggle, and media picker.

**API routes** under `src/app/api/admin/` (pages, media) require auth via `getToken()` from `next-auth/jwt`. Admin-only operations check `token.role === 'ADMIN'`.

### Auth

NextAuth CredentialsProvider with bcrypt password comparison. JWT callbacks inject `role`, `tenantId`, `tenantSlug` into token/session. Types augmented in `src/types/next-auth.d.ts`. Roles: `ADMIN` (full access), `EDITOR` (content editing).

### Media

Cloudinary uploads via `POST /api/admin/media`. Metadata stored in DB `Media` model. Images served from `res.cloudinary.com` (allowed in `next.config.ts` remote patterns). Media picker dialog available in content editor.

### Styling

Liquid-glass morphism design system. Custom brand colors in `tailwind.config.ts`: forest (#2d5016), sage (#7c9a6c), copper (#b87333), cream (#faf8f0). Custom utilities: `.glass`, `.glass-strong`, `.glass-card`, `.btn-primary`, `.btn-secondary`.

### Import Alias

`@/*` maps to `./src/*` (configured in tsconfig.json).

## Key Gotchas

- **Prisma CLI reads `.env`, not `.env.local`** — ensure `.env` has `DATABASE_URL` for migrations/seeding. Next.js reads `.env.local` at runtime.
- **Never use `redirect()` in admin layout** for the login route — causes infinite loop. The middleware matcher + conditional rendering pattern handles this.
- **Next.js 15**: `headers()`, `cookies()`, `params`, `searchParams` are all async.
- **Vercel env vars**: Use `printf 'val' | vercel env add` (not `<<<` which adds trailing newline).
- **`force-dynamic`**: Public content pages use `export const dynamic = 'force-dynamic'` to always fetch fresh DB content.
