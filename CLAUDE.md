# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev            # Start dev server (port 3000)
npm run build          # prisma generate && next build
npm run lint           # ESLint (next lint)
npm run db:push        # Push Prisma schema to DB (no migration)
npm run db:migrate     # Run Prisma migrations (prisma migrate dev)
npm run db:seed        # Seed DB (npx tsx prisma/seed.ts)
npm run db:studio      # Open Prisma Studio
```

**Tests**: `src/lib/__tests__/*.test.ts` use Node's built-in test runner (`node:test` / `node:assert`), run via `tsx`:

```bash
npm test                                          # all tests
npx tsx --test src/lib/__tests__/slug.test.ts     # single file
```

**CI** (`.github/workflows/ci.yml`) runs `npm test` then `next build` (with `prisma generate`) on push/PR to `main`. It does **not** run lint — verify that locally.

## Architecture

Next.js 15 App Router with TypeScript, React 19, Tailwind 3.4, Prisma 6 (Neon PostgreSQL), NextAuth 4 (JWT strategy), Plate.js WYSIWYG editing, Cloudinary for media, OpenAI for AI content/SEO assist. German-language website for the **e-Ventschau** benefit music festival (built on the reusable "minicms" CMS skeleton).

### Route Groups & Layouts

- **`src/app/(public)/`** — Public pages with Header/Footer layout. The `(public)` group name doesn't appear in URLs. Catch-all `[...slug]` resolves DB pages; dedicated routes exist for `kuenstler/[slug]` (artists), `events/[slug]`, and `programm-2026`.
- **`src/app/admin/`** — Protected admin dashboard (content, media, artists, events, vendors, products, sliders, banners/ads, menu, sections, leads, seo, settings/system, super/tenants).
- **`src/middleware.ts`** (hand-written, **not** a re-export of `next-auth/middleware`): (1) resolves tenant from the request subdomain and forwards it as the `x-tenant-slug` header; (2) guards `/admin/*` (except `/admin/login`) by checking for the next-auth session cookie at the Edge, redirecting to login if absent.
- **Admin layout** (`src/app/admin/layout.tsx`) does the full JWT check via `getToken()`. No token → renders only children (login page). Token → renders sidebar chrome + children. **Never** `redirect()` the login route from here (infinite loop) — rely on the middleware + conditional-render pattern.

### Multi-Tenant System

All data is scoped to a `Tenant`. Resolution order in `getTenant()` (`src/lib/tenant.ts`): `x-tenant-slug` header (set by middleware from subdomain) → `TENANT_SLUG` env → fallback `'e-ventschau'`. The production tenant slug is `e-ventschau` (the only `Tenant` row; matches the `TENANT_SLUG` env). On the self-hosted deploy `NEXT_PUBLIC_ROOT_DOMAIN` equals the full host, so the middleware extracts no subdomain and `getTenant()` relies on `TENANT_SLUG`. Always scope queries by `tenant.id`; most lib helpers already call `getTenant()` internally.

DB access goes through `src/lib/prisma.ts`, which exports a singleton `prisma` client and a `withRetry()` wrapper that retries on Neon serverless cold-start/connection errors — wrap user-facing reads in `withRetry()`.

### Content & Markdown Directive System

Page content (markdown) lives in the DB `Page` model (originally seeded from `src/content/*.md` via gray-matter). Public pages call helpers in `src/lib/markdown.ts` (e.g. `getContent`) — unpublished drafts return `null`, triggering `notFound()`. Pages are versioned via `PageVersion` (history API under `/api/admin/pages/[id]/versions`).

**Directive blocks** are the core authoring primitive. `src/lib/directiveParser.ts` is the single source of truth shared by both the public renderer (`src/components/MarkdownContent.tsx`) and the **Plate.js WYSIWYG editor** (`src/components/admin/editor/`). Directives use `:::name … :::` fenced syntax (nesting supported) and render React components from `src/components/markdown/` — heroes, sliders, callouts (info/warning/tip/danger), columns, boxes, bento grids, plus dynamic `banner-*`, `slider-*`, and `products-*` blocks. When adding a directive, update the `DIRECTIVE_RE` regex and the `Block` union in `directiveParser.ts`, then both the parser-consuming renderer and editor (see below).

### WYSIWYG Editor (Plate.js)

`src/components/admin/MarkdownEditorField.tsx` is the reusable content field. It offers three per-field modes — **Markdown** (raw textarea), **WYSIWYG** (Plate.js), **Vorschau** (live `MarkdownContent` preview). **Markdown is the source of truth**: `src/lib/contentEditor.ts` defines the `ContentEditorValue` triple `{ markdown, contentJson, editorMode }`, where `contentJson` is a lossless mirror of the Plate node tree that rehydrates the WYSIWYG surface (falling back to `markdownToPlate(markdown)` when empty). Every WYSIWYG edit regenerates markdown via `plateToMarkdown`.

The editor lives under `src/components/admin/editor/` (loaded via `next/dynamic`, `ssr: false`):
- `serialization/` — `markdownToPlate` / `plateToMarkdown`, the round-trip between directive markdown and Plate nodes (covered by `editor-roundtrip.test.ts` + `contentEditor.test.ts`).
- `plugins/` — one Plate plugin per directive block (`createCalloutPlugin`, `createBoxPlugin`, `createHeroPlugin`, …; barrel in `plugins/index.ts`).
- `elements/` — the React node components Plate renders for each block.
- `toolbar/` — reusable accessible primitives (`Toolbar`, `ToolbarButton`, `ToolbarToggleButton`, `ToolbarSeparator`) implementing WAI-ARIA roving tabindex; the pure keyboard-nav core is `src/lib/toolbarNav.ts` (tested in `toolbarNav.test.ts`).
- `SlashCommandMenu.tsx` — `/`-triggered block insertion.

Persistence: `Page.contentJson` (`Json?`) + `Page.editorMode` (`String?`, default `"markdown"`) back the triple; `HomepageSection.content` stores the same shape as a JSON blob via `sectionContentToValue` / `valueToSectionContent`.

### Domain Models

Beyond pages/media, the Prisma schema (`prisma/schema.prisma`) covers several content domains, each with admin CRUD pages + API routes + a `src/lib/*.ts` data helper:

- **Artists** (`Artist`, `ArtistMedia`) → `lib/artists.ts`, public `/kuenstler`.
- **Events** (`Event`, `Stage`, `Appearance`, `PriceTier`) → `lib/events.ts`, public `/events`; timetable builder in admin. `Appearance.category` (default `"musik"`, e.g. `vortrag`) classifies timetable slots; `lib/lineup.ts` derives the homepage line-up section from a featured event's slots, filtered and ordered by category.
- **Vendors** (`Vendor`, `VendorDetail`, `VendorClick`, `VendorAd`) → `lib/vendors.ts` / `vendor-detail.ts`, with click/impression tracking.
- **Products** (`Product`, `ProductCategory`) → `lib/products.ts` / `products-db.ts` / `categories.ts`.
- **Sliders/Banners** (`Slider`, `SliderItem`, `SliderImpression`, banner impressions via `VendorAd`/`BannerImpression`) → `lib/sliders.ts` / `banners.ts`.
- **Homepage** (`HomepageSection`) → `lib/sections.ts`, rendered by `components/sections/HomepageSectionRenderer.tsx`.
- **Navigation** (`MenuItem`, `PageParent`) → `lib/menu.ts`.
- **Leads** (`Lead`) — contact/CTA form submissions, public `POST /api/leads`.
- **Analytics/SEO** (`PageView`, `TrackingEvent`, `SeoKeyword`) → `lib/seo.ts`, surfaced in the admin SEO dashboard (`/admin/seo`, components under `components/admin/seo/`).

### AI Features

`src/lib/ai.ts` wraps OpenAI for SEO metadata generation (`/api/admin/ai/generate-seo`) and content improvement (`/api/admin/ai/improve`; `AiImproveButton`). The API key is stored **encrypted per-tenant** in `SiteSettings.openaiApiKeyEncrypted` (crypto in `src/lib/crypto.ts`), falling back to the `OPENAI_API_KEY` env var. Model selection (`SiteSettings.openaiModel`, `'auto'` picks `gpt-4.1-mini`) lives in `ai.ts`. `MiniRagWidget` provides an on-site Q&A widget.

### Auth

NextAuth CredentialsProvider with bcrypt password comparison (`src/lib/auth.ts`). JWT callbacks inject `role`, `tenantId`, `tenantSlug` into token/session; types augmented in `src/types/next-auth.d.ts`. Roles: `ADMIN` (full access), `EDITOR` (content editing). API routes under `src/app/api/admin/` authenticate via `getToken()` from `next-auth/jwt`; admin-only operations check `token.role === 'ADMIN'`.

### Media

Cloudinary uploads via `POST /api/admin/media` (signed uploads via `/api/admin/media/sign`). Metadata stored in the `Media` model. Images served from `res.cloudinary.com` (allowed in `next.config.ts` remote patterns). Media picker dialog (`components/admin/MediaPickerDialog.tsx`) available in the editor. Cloudinary config is fail-fast guarded — missing env surfaces a visible upload error.

`GET /api/admin/media` is cursor-paginated (pure helpers in `src/lib/media-query.ts`, tested in `media-query.test.ts`) and returns `{ items, nextCursor, total }` — **not a bare array**; it accepts `?search=`, `?type=IMAGE|VIDEO`, `?cursor=`, `?limit=` (max 100). Any consumer must read `data.items`.

### Styling & Theming

Liquid-glass morphism design system. Brand colors in `tailwind.config.ts`: forest (#2d5016), sage (#7c9a6c), copper (#b87333), cream (#faf8f0). Custom utilities: `.glass`, `.glass-strong`, `.glass-card`, `.btn-primary`, `.btn-secondary`. Theming is per-tenant via `SiteSettings.themeSlug` — `src/lib/themes.ts` maps a theme to CSS custom properties (`--brand-*`, `--glass-*`, gradients) injected at the layout level, so components read from CSS variables rather than hard-coded colors. Scroll animation/smoothing via Lenis (`components/providers/LenisProvider.tsx`).

### Import Alias

`@/*` maps to `./src/*` (configured in tsconfig.json).

## Key Gotchas

- **Prisma CLI reads `.env`, not `.env.local`** — ensure `.env` has `DATABASE_URL` for migrations/seeding. Next.js reads `.env.local` at runtime.
- **Never use `redirect()` in admin layout** for the login route — causes infinite loop. The middleware matcher + conditional rendering pattern handles this.
- **Next.js 15**: `headers()`, `cookies()`, `params`, `searchParams` are all async.
- **Deploy is push-to-`main`** (Vercel is gone): `.github/workflows/deploy.yml` verifies (test + build), rsyncs the checkout to the self-hosted server, and runs `docker compose up -d --build` plus a `migrate` profile for `prisma migrate deploy`. `ci.yml` runs the same test+build gate on PRs. Schema changes only go live once the migrate step runs — a green CI does not imply the migration applied.
- **`force-dynamic`**: Public content pages use `export const dynamic = 'force-dynamic'` to always fetch fresh DB content.
- **Tenant scoping**: a missing/unknown tenant makes `getTenant()` return `null` — helpers then return `null`/empty rather than throwing. Use `getTenantOrThrow()` where a tenant is required.
- **Directive changes fan out**: keep `directiveParser.ts`, the public renderer (`MarkdownContent.tsx`), and the Plate editor in sync — the editor side means its serializer (`markdownToPlate`/`plateToMarkdown`), a plugin, and an element under `src/components/admin/editor/`.
