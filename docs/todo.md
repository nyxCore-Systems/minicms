# TODO

## High Priority

### Infrastructure
- [ ] **Add `DATABASE_URL` secret to GitHub repo** — CI builds succeed but can't validate DB-dependent static pages
- [ ] **Add `ANTHROPIC_API_KEY` secret to GitHub repo** — Vibe Publisher workflow needs it for blog generation
- [ ] **Configure Vercel build caching** — Build logs warn: "No build cache found"
- [ ] **Remove duplicate root lockfile** — `/Users/oliverbaer/package-lock.json` causes Next.js workspace inference warning

### SEO
- [ ] **Verify `ueber-uns` hero layout** — Was centered `max-w-4xl`, now left-aligned `max-w-7xl` (may need design review)
- [ ] **Populate `SeoKeyword` model** — Model exists but no data; add keyword tracking for core terms
- [ ] **Add Organization JSON-LD** — `organizationJsonLd` is defined in `src/lib/seo.ts` but not rendered on any page
- [ ] **Validate FAQ schema** — Ensure all 10 pages have FAQ items generated (check via admin SEO dashboard)

### Content
- [ ] **Review generated blog drafts** — 16 drafts in `drafts/` folder need editorial review before publishing
- [ ] **Add :::hero blocks to admin content docs** — Update any internal documentation about the new hero block syntax
- [ ] **Verify `so-funktioniert-es` AGB link** — Was a styled `<Link>` component, now a `:::box` with markdown link (verify appearance)

---

## Medium Priority

### Features
- [ ] **Add test framework** — No tests exist; set up Vitest + React Testing Library
- [ ] **Add error boundaries** — Public pages should gracefully handle rendering errors
- [ ] **Add loading states** — Admin pages fetch data client-side without skeleton UI
- [ ] **Add pagination to admin pages** — Leads, content, media pages show all records at once
- [ ] **Add search/filter to content list** — Admin content page has no filtering
- [ ] **Implement EDITOR role restrictions** — Currently only ADMIN-gated deletes; EDITOR can still access all admin features

### Performance
- [ ] **Deduplicate DB calls in page components** — `generateMetadata()` and page body both call `getPublishedContent()` separately
- [ ] **Add ISR to content pages** — Replace `force-dynamic` with `revalidate: 60` for caching + freshness
- [ ] **Optimize tracking endpoint** — Batch client-side events before sending (reduce request count)
- [ ] **Add image optimization** — Use `next/image` with Cloudinary loader instead of raw `<img>` tags

### Code Quality
- [ ] **Type-safe env vars** — Use `@t3-oss/env-nextjs` or Zod schema for environment variable validation
- [ ] **Extract common page layout** — 10 content pages share identical JSON-LD + background + breadcrumbs pattern
- [ ] **Add API input validation** — Some admin APIs lack Zod schema validation on PUT requests
- [ ] **Clean up unused imports** — Run ESLint with `no-unused-vars` strict mode

---

## Low Priority

### Enhancements
- [ ] **Add dark mode toggle for visitors** — `SiteSettings.darkMode` exists but is admin-only
- [ ] **Add RSS feed** — Auto-generate from published pages
- [ ] **Add print stylesheet** — Knowledge articles should print cleanly
- [ ] **Add breadcrumb visual on mobile** — Currently breadcrumbs may overflow on small screens
- [ ] **Add `:::cta` directive** — Allow embedding CTA forms directly in markdown content
- [ ] **Add vendor admin CRUD** — Vendor page is read-only; needs create/edit/delete forms
- [ ] **Add ad management UI** — VendorAd model exists but `/admin/ads` may be minimal

### DevOps
- [ ] **Add preview deployments** — Configure Vercel preview for PRs
- [ ] **Add database backups** — Scheduled Neon DB snapshots
- [ ] **Add monitoring** — Error tracking (Sentry) + uptime monitoring
- [ ] **Add CI lint step** — GitHub Actions only runs build, not lint

### Documentation
- [ ] **API documentation** — Document all public + admin API endpoints with request/response examples
- [ ] **Component library** — Document glass morphism components with visual examples
- [ ] **Deployment guide** — Step-by-step Vercel + Neon setup for new tenants
