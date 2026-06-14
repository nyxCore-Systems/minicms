# Runbook

## Deployment

### Platform

Deployed on **Vercel** with automatic deploys from the `main` branch.

- **Production URL:** https://landingpage-dasmesser.vercel.app/
- **Admin URL:** https://landingpage-dasmesser.vercel.app/admin

### Deploying

1. Merge to `main` — Vercel auto-deploys.
2. Monitor the Vercel dashboard for build status.
3. Verify the deployment at the production URL.

### Setting Vercel Environment Variables

```bash
# Use printf to avoid trailing newline
printf 'value' | vercel env add VAR_NAME production
```

> **Do NOT use `<<<`** — it adds a trailing newline that breaks secrets.

### Database Migrations

```bash
# Create and apply a migration locally
npm run db:migrate

# Push schema directly (skip migration history, use for prototyping)
npm run db:push
```

> Prisma CLI reads `.env`, not `.env.local`. Ensure `.env` has `DATABASE_URL`.

## Monitoring

### Vercel Analytics

- **Web Vitals:** `@vercel/speed-insights` is integrated
- **Analytics:** `@vercel/analytics` is integrated
- Check the Vercel dashboard for performance metrics

### System Info Endpoint

`GET /api/admin/system` (requires admin auth) returns:
- Node environment
- Vercel environment, region, git SHA, branch
- Database connectivity status

## Common Issues and Fixes

### Build Fails with Prisma Error

**Symptom:** `PrismaClientInitializationError` during build.

**Fix:** Ensure `DATABASE_URL` is set in Vercel environment variables. The `build` script runs `prisma generate` before `next build`.

### Admin Login Redirect Loop

**Symptom:** `/admin` keeps redirecting to `/admin/login`.

**Fix:** This is a known gotcha. Never use `redirect()` in the admin layout for the login route. The middleware matcher + conditional rendering pattern handles auth. Check that `NEXTAUTH_SECRET` is set and matches between environments.

### Middleware Not Working

**Symptom:** Admin routes are not protected.

**Fix:** Middleware MUST be at `src/middleware.ts` (not project root). Next.js silently ignores root `middleware.ts` when using `src/` directory. Verify with:
```bash
cat .next/server/middleware-manifest.json
```

### Cloudinary Uploads Failing

**Symptom:** Media upload returns 500 error.

**Fix:** Verify all three Cloudinary env vars are set: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.

### Database Connection Issues

**Symptom:** Pages fail to load with database errors.

**Fix:**
1. Verify `DATABASE_URL` is correct and the Neon database is active
2. Check if the Neon project has been suspended (free tier auto-suspends)
3. Run `npm run db:studio` locally to test connectivity

### Next.js 15 Async API Errors

**Symptom:** `headers()`, `cookies()`, `params`, or `searchParams` errors.

**Fix:** In Next.js 15, these are all async. Use `await` before accessing them:
```typescript
const headersList = await headers()
const { slug } = await params
```

## Rollback Procedures

### Revert a Deployment

1. Go to the Vercel dashboard > Deployments
2. Find the last known good deployment
3. Click the three-dot menu > "Promote to Production"

### Revert a Database Migration

```bash
# Check migration history
npx prisma migrate status

# Reset to a specific migration (DESTRUCTIVE — drops data)
npx prisma migrate reset
```

> For non-destructive rollbacks, create a new migration that reverses the schema changes.

### Emergency: Revert to Previous Git State

```bash
git log --oneline -10          # Find the target commit
git revert <commit-sha>        # Create a revert commit
git push origin main           # Trigger redeploy
```

> Prefer `git revert` over `git reset --hard` to preserve history.
