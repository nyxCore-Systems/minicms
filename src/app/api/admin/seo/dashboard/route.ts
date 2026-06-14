import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getToken } from 'next-auth/jwt'
import { prisma, withRetry } from '@/lib/prisma'
import { getTenantOrThrow } from '@/lib/tenant'
import { Prisma } from '@prisma/client'

// ---------------------------------------------------------------------------
// Auth helper (same pattern as pages/[id]/route.ts)
// ---------------------------------------------------------------------------
async function getSessionToken() {
  const cookieStore = await cookies()
  return getToken({
    req: {
      cookies: Object.fromEntries(
        cookieStore.getAll().map((c) => [c.name, c.value])
      ),
    } as any,
    secret: process.env.NEXTAUTH_SECRET,
  })
}

// ---------------------------------------------------------------------------
// In-memory cache (Map with TTL)
// ---------------------------------------------------------------------------
const cache = new Map<string, { data: unknown; expires: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

async function getCachedOrCompute<T>(
  key: string,
  compute: () => Promise<T>
): Promise<T> {
  const cached = cache.get(key)
  if (cached && cached.expires > Date.now()) return cached.data as T
  const data = await compute()
  cache.set(key, { data, expires: Date.now() + CACHE_TTL })
  return data
}

// ---------------------------------------------------------------------------
// Period helpers
// ---------------------------------------------------------------------------
function parsePeriod(param: string | null): { days: number; start: Date; end: Date; prevStart: Date } {
  const days = param === '7d' ? 7 : param === '90d' ? 90 : 30
  const end = new Date()
  const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000)
  const prevStart = new Date(start.getTime() - days * 24 * 60 * 60 * 1000)
  return { days, start, end, prevStart }
}

function computeTrend(current: number, previous: number): number | null {
  if (previous === 0) return null
  return Math.round(((current - previous) / previous) * 1000) / 10
}

// ---------------------------------------------------------------------------
// Referrer categorization
// ---------------------------------------------------------------------------
function categorizeReferrer(referrer: string | null): string {
  if (!referrer || referrer.trim() === '') return 'Direkt'
  const r = referrer.toLowerCase()
  if (/google\./.test(r) || /bing\./.test(r) || /duckduckgo\./.test(r) || /ecosia\./.test(r)) return 'Organisch'
  if (/facebook\./.test(r) || /instagram\./.test(r) || /twitter\./.test(r) || /t\.co/.test(r) || /linkedin\./.test(r) || /youtube\./.test(r)) return 'Social'
  return 'Verweis'
}

// ---------------------------------------------------------------------------
// SEO Health scoring
// ---------------------------------------------------------------------------
interface SeoCheck {
  name: string
  passed: boolean
  maxPoints: number
  hint: string
}

function computeSeoScore(page: {
  metaTitle: string | null
  metaDescription: string | null
  metaKeywords: string | null
  faqSchema: unknown
  ogImage: string | null
  content: string
  isPublished: boolean
  seoData: unknown
  updatedAt: Date
}): { score: number; checks: SeoCheck[] } {
  const checks: SeoCheck[] = []

  const add = (name: string, maxPoints: number, passed: boolean, hint: string) => {
    checks.push({ name, passed, maxPoints, hint })
  }

  add('Meta-Titel vorhanden', 10, !!page.metaTitle?.trim(),
    'Einen einzigartigen Meta-Titel hinzufuegen')
  add('Meta-Titel Laenge (30-60)', 10,
    (page.metaTitle?.length ?? 0) >= 30 && (page.metaTitle?.length ?? 0) <= 60,
    'Meta-Titel sollte zwischen 30 und 60 Zeichen lang sein')
  add('Meta-Beschreibung vorhanden', 10, !!page.metaDescription?.trim(),
    'Eine Meta-Beschreibung hinzufuegen')
  add('Meta-Beschreibung Laenge (120-155)', 10,
    (page.metaDescription?.length ?? 0) >= 120 && (page.metaDescription?.length ?? 0) <= 155,
    'Meta-Beschreibung sollte zwischen 120 und 155 Zeichen lang sein')
  add('Meta-Keywords vorhanden', 5, !!page.metaKeywords?.trim(),
    'Keywords fuer diese Seite festlegen')
  add('FAQ-Schema vorhanden', 15, !!page.faqSchema,
    'FAQ-Schema fuer Rich Snippets hinzufuegen')
  add('OG-Bild vorhanden', 10, !!page.ogImage?.trim(),
    'Ein Open Graph Bild fuer Social Media festlegen')
  add('Inhalt > 300 Woerter', 10,
    (page.content?.split(/\s+/).length ?? 0) > 300,
    'Mindestens 300 Woerter fuer besseres Ranking')
  add('Seite veroeffentlicht', 5, page.isPublished,
    'Seite muss veroeffentlicht sein')
  add('SEO-Daten vorhanden', 10, !!page.seoData,
    'Strukturierte Daten (JSON-LD) hinzufuegen')
  add('Inhalt aktuell (< 90 Tage)', 5,
    (Date.now() - new Date(page.updatedAt).getTime()) < 90 * 24 * 60 * 60 * 1000,
    'Inhalt regelmaessig aktualisieren')

  const score = checks.reduce((sum, c) => sum + (c.passed ? c.maxPoints : 0), 0)
  return { score, checks }
}

// ---------------------------------------------------------------------------
// Web Vitals thresholds for rating per-page p75 values
// ---------------------------------------------------------------------------
function rateVital(metric: string, p75: number): string {
  const thresholds: Record<string, { good: number; poor: number }> = {
    LCP: { good: 2500, poor: 4000 },
    FCP: { good: 1800, poor: 3000 },
    INP: { good: 200, poor: 500 },
    CLS: { good: 0.1, poor: 0.25 },
    TTFB: { good: 800, poor: 1800 },
  }
  const t = thresholds[metric]
  if (!t) return 'unknown'
  if (p75 <= t.good) return 'good'
  if (p75 <= t.poor) return 'needs-improvement'
  return 'poor'
}

// ---------------------------------------------------------------------------
// Main GET handler
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  const token = await getSessionToken()
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const periodParam = request.nextUrl.searchParams.get('period')
  const { days, start, end, prevStart } = parsePeriod(periodParam)
  const cacheKey = `seo-dashboard-${days}`

  try {
    const data = await getCachedOrCompute(cacheKey, () =>
      withRetry(() => computeDashboard(days, start, end, prevStart))
    )
    return NextResponse.json(data)
  } catch (error) {
    console.error('SEO dashboard error:', error)
    return NextResponse.json(
      { error: 'Failed to compute dashboard data' },
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------------------------
// Dashboard computation — all queries in parallel
// ---------------------------------------------------------------------------
async function computeDashboard(
  days: number,
  periodStart: Date,
  periodEnd: Date,
  prevPeriodStart: Date
) {
  const tenant = await getTenantOrThrow()
  const tenantId = tenant.id

  // Run all major query groups in parallel
  const [
    kpiData,
    contentPerformance,
    webVitalsSummary,
    webVitalsPerPage,
    trafficData,
    seoHealthData,
  ] = await Promise.all([
    computeKpis(tenantId, periodStart, prevPeriodStart),
    computeContentPerformance(tenantId, periodStart),
    computeWebVitalsSummary(tenantId, periodStart),
    computeWebVitalsPerPage(tenantId, periodStart),
    computeTraffic(tenantId, periodStart, days),
    computeSeoHealth(tenantId),
  ])

  return {
    period: {
      start: periodStart.toISOString(),
      end: periodEnd.toISOString(),
      days,
    },
    kpi: kpiData,
    contentPerformance,
    webVitals: {
      summary: webVitalsSummary,
      perPage: webVitalsPerPage,
    },
    traffic: trafficData,
    seoHealth: seoHealthData,
  }
}

// ---------------------------------------------------------------------------
// KPI computations
// ---------------------------------------------------------------------------
async function computeKpis(
  tenantId: string,
  periodStart: Date,
  prevPeriodStart: Date
) {
  const [
    currentViews,
    previousViews,
    currentAvgTime,
    previousAvgTime,
    currentEngagement,
    previousEngagement,
    currentVitals,
    previousVitals,
  ] = await Promise.all([
    // Page views — current
    prisma.pageView.count({
      where: { tenantId, createdAt: { gte: periodStart } },
    }),
    // Page views — previous
    prisma.pageView.count({
      where: { tenantId, createdAt: { gte: prevPeriodStart, lt: periodStart } },
    }),
    // Avg time on page — current
    prisma.$queryRaw<[{ avg_duration: number | null }]>`
      SELECT AVG(("eventData"->>'duration')::numeric) as avg_duration
      FROM "TrackingEvent"
      WHERE "tenantId" = ${tenantId}
        AND "eventType" = 'time_on_page'
        AND "createdAt" >= ${periodStart}
    `,
    // Avg time on page — previous
    prisma.$queryRaw<[{ avg_duration: number | null }]>`
      SELECT AVG(("eventData"->>'duration')::numeric) as avg_duration
      FROM "TrackingEvent"
      WHERE "tenantId" = ${tenantId}
        AND "eventType" = 'time_on_page'
        AND "createdAt" >= ${prevPeriodStart}
        AND "createdAt" < ${periodStart}
    `,
    // Engagement — current
    computeEngagementRate(tenantId, periodStart, undefined),
    // Engagement — previous
    computeEngagementRate(tenantId, prevPeriodStart, periodStart),
    // Vitals pass rate — current
    computeVitalsPassRate(tenantId, periodStart, undefined),
    // Vitals pass rate — previous
    computeVitalsPassRate(tenantId, prevPeriodStart, periodStart),
  ])

  const currentAvgTimeVal = Number(currentAvgTime[0]?.avg_duration) || 0
  const previousAvgTimeVal = Number(previousAvgTime[0]?.avg_duration) || 0

  return {
    pageViews: {
      current: currentViews,
      previous: previousViews,
      trend: computeTrend(currentViews, previousViews),
    },
    avgTimeOnPage: {
      current: Math.round(currentAvgTimeVal * 10) / 10,
      previous: Math.round(previousAvgTimeVal * 10) / 10,
      trend: computeTrend(currentAvgTimeVal, previousAvgTimeVal),
    },
    engagementRate: {
      current: currentEngagement,
      previous: previousEngagement,
      trend: computeTrend(currentEngagement, previousEngagement),
    },
    vitalsPassRate: {
      current: currentVitals,
      previous: previousVitals,
      trend: computeTrend(currentVitals, previousVitals),
    },
  }
}

async function computeEngagementRate(
  tenantId: string,
  from: Date,
  to: Date | undefined
): Promise<number> {
  const dateFilter = to
    ? Prisma.sql`AND "createdAt" >= ${from} AND "createdAt" < ${to}`
    : Prisma.sql`AND "createdAt" >= ${from}`

  const [totalResult, engagedResult] = await Promise.all([
    prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(DISTINCT "sessionId") as count
      FROM "TrackingEvent"
      WHERE "tenantId" = ${tenantId}
        AND "eventType" = 'pageview'
        AND "sessionId" IS NOT NULL
        ${dateFilter}
    `,
    prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(DISTINCT "sessionId") as count
      FROM "TrackingEvent"
      WHERE "tenantId" = ${tenantId}
        AND "sessionId" IS NOT NULL
        ${dateFilter}
        AND (
          ("eventType" = 'scroll_depth' AND ("eventData"->>'depth')::int >= 25)
          OR
          ("eventType" = 'time_on_page' AND ("eventData"->>'duration')::numeric > 10)
        )
    `,
  ])

  const total = Number(totalResult[0]?.count) || 0
  const engaged = Number(engagedResult[0]?.count) || 0
  if (total === 0) return 0
  return Math.round((engaged / total) * 1000) / 10
}

async function computeVitalsPassRate(
  tenantId: string,
  from: Date,
  to: Date | undefined
): Promise<number> {
  const dateFilter = to
    ? Prisma.sql`AND "createdAt" >= ${from} AND "createdAt" < ${to}`
    : Prisma.sql`AND "createdAt" >= ${from}`

  const [goodResult, totalResult] = await Promise.all([
    prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count
      FROM "TrackingEvent"
      WHERE "tenantId" = ${tenantId}
        AND "eventType" = 'web_vital'
        AND "eventData"->>'rating' = 'good'
        ${dateFilter}
    `,
    prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count
      FROM "TrackingEvent"
      WHERE "tenantId" = ${tenantId}
        AND "eventType" = 'web_vital'
        ${dateFilter}
    `,
  ])

  const good = Number(goodResult[0]?.count) || 0
  const total = Number(totalResult[0]?.count) || 0
  if (total === 0) return 0
  return Math.round((good / total) * 1000) / 10
}

// ---------------------------------------------------------------------------
// Content Performance
// ---------------------------------------------------------------------------
async function computeContentPerformance(tenantId: string, periodStart: Date) {
  const rows = await prisma.$queryRaw<
    Array<{
      path: string
      views: bigint
      avg_scroll_depth: number | null
      avg_time_on_page: number | null
      scroll_100_rate: number | null
    }>
  >`
    WITH page_stats AS (
      SELECT
        path,
        COUNT(DISTINCT "sessionId") FILTER (WHERE "eventType" = 'pageview') as views,
        AVG(("eventData"->>'depth')::numeric) FILTER (WHERE "eventType" = 'scroll_depth') as avg_scroll,
        AVG(("eventData"->>'duration')::numeric) FILTER (WHERE "eventType" = 'time_on_page') as avg_time,
        COUNT(DISTINCT "sessionId") FILTER (
          WHERE "eventType" = 'scroll_depth' AND ("eventData"->>'depth')::int = 100
        ) as scroll_100_sessions,
        COUNT(DISTINCT "sessionId") FILTER (WHERE "eventType" = 'scroll_depth') as scroll_sessions
      FROM "TrackingEvent"
      WHERE "tenantId" = ${tenantId}
        AND "createdAt" >= ${periodStart}
        AND "eventType" IN ('pageview', 'scroll_depth', 'time_on_page')
      GROUP BY path
    )
    SELECT
      path,
      views,
      COALESCE(avg_scroll, 0) as avg_scroll_depth,
      COALESCE(avg_time, 0) as avg_time_on_page,
      CASE WHEN scroll_sessions > 0
        THEN scroll_100_sessions::float / scroll_sessions
        ELSE 0
      END as scroll_100_rate
    FROM page_stats
    ORDER BY views DESC
    LIMIT 20
  `

  if (rows.length === 0) return []

  const maxViews = Math.max(...rows.map((r) => Number(r.views)), 1)

  return rows.map((row) => {
    const views = Number(row.views) || 0
    const avgScroll = Number(row.avg_scroll_depth) || 0
    const avgTime = Number(row.avg_time_on_page) || 0
    const scroll100Rate = Number(row.scroll_100_rate) || 0
    const viewsNormalized = views / maxViews

    const engagementScore =
      Math.round(
        ((avgScroll / 100) * 0.35 +
          Math.min(avgTime / 180, 1) * 0.35 +
          scroll100Rate * 0.15 +
          viewsNormalized * 0.15) *
          10000
      ) / 100

    // Compute median views for warning calculation
    const medianViews = Number(rows[Math.floor(rows.length / 2)]?.views) || 0
    const warnings: string[] = []
    if (views > medianViews && avgScroll < 40) {
      warnings.push('Niedriges Engagement')
    }
    if (avgTime < 15 && avgScroll > 75) {
      warnings.push('Wird ueberflogen')
    }
    if (avgScroll === 0 && views > 0) {
      warnings.push('Sofortige Abspruenge')
    }

    return {
      path: row.path,
      views,
      avgScroll: Math.round(avgScroll * 10) / 10,
      avgTime: Math.round(avgTime * 10) / 10,
      scroll100Rate: Math.round(scroll100Rate * 1000) / 10,
      engagementScore,
      warnings,
    }
  })
}

// ---------------------------------------------------------------------------
// Web Vitals
// ---------------------------------------------------------------------------
async function computeWebVitalsSummary(tenantId: string, periodStart: Date) {
  const rows = await prisma.$queryRaw<
    Array<{
      metric: string
      p75: number | null
      good_pct: number | null
      needs_pct: number | null
      poor_pct: number | null
      sample_count: bigint
    }>
  >`
    SELECT
      "eventData"->>'metric' as metric,
      PERCENTILE_CONT(0.75) WITHIN GROUP (
        ORDER BY ("eventData"->>'value')::numeric
      ) as p75,
      COUNT(*) FILTER (WHERE "eventData"->>'rating' = 'good')::float / NULLIF(COUNT(*), 0) as good_pct,
      COUNT(*) FILTER (WHERE "eventData"->>'rating' = 'needs-improvement')::float / NULLIF(COUNT(*), 0) as needs_pct,
      COUNT(*) FILTER (WHERE "eventData"->>'rating' = 'poor')::float / NULLIF(COUNT(*), 0) as poor_pct,
      COUNT(*) as sample_count
    FROM "TrackingEvent"
    WHERE "tenantId" = ${tenantId}
      AND "eventType" = 'web_vital'
      AND "createdAt" >= ${periodStart}
    GROUP BY "eventData"->>'metric'
  `

  return rows.map((row) => ({
    metric: row.metric,
    p75: Math.round((Number(row.p75) || 0) * 100) / 100,
    goodPct: Math.round((Number(row.good_pct) || 0) * 1000) / 10,
    needsPct: Math.round((Number(row.needs_pct) || 0) * 1000) / 10,
    poorPct: Math.round((Number(row.poor_pct) || 0) * 1000) / 10,
    sampleCount: Number(row.sample_count) || 0,
  }))
}

async function computeWebVitalsPerPage(tenantId: string, periodStart: Date) {
  const rows = await prisma.$queryRaw<
    Array<{
      path: string
      metric: string
      p75: number | null
      samples: bigint
    }>
  >`
    SELECT
      path,
      "eventData"->>'metric' as metric,
      PERCENTILE_CONT(0.75) WITHIN GROUP (
        ORDER BY ("eventData"->>'value')::numeric
      ) as p75,
      COUNT(*) as samples
    FROM "TrackingEvent"
    WHERE "tenantId" = ${tenantId}
      AND "eventType" = 'web_vital'
      AND "createdAt" >= ${periodStart}
    GROUP BY path, "eventData"->>'metric'
    ORDER BY path
  `

  // Group by path
  const byPath = new Map<string, Record<string, { p75: number; rating: string }>>()
  for (const row of rows) {
    const p75 = Math.round((Number(row.p75) || 0) * 100) / 100
    if (!byPath.has(row.path)) {
      byPath.set(row.path, {})
    }
    byPath.get(row.path)![row.metric] = {
      p75,
      rating: rateVital(row.metric, p75),
    }
  }

  return Array.from(byPath.entries()).map(([path, metrics]) => ({
    path,
    metrics,
  }))
}

// ---------------------------------------------------------------------------
// Traffic Analysis
// ---------------------------------------------------------------------------
async function computeTraffic(tenantId: string, periodStart: Date, days: number) {
  const [deviceRows, referrerRows, countryRows, dailyRows] = await Promise.all([
    // Devices
    prisma.pageView.groupBy({
      by: ['device'],
      where: { tenantId, createdAt: { gte: periodStart } },
      _count: true,
      orderBy: { _count: { device: 'desc' } },
    }),
    // Referrers (raw for categorization)
    prisma.pageView.groupBy({
      by: ['referrer'],
      where: { tenantId, createdAt: { gte: periodStart } },
      _count: true,
      orderBy: { _count: { referrer: 'desc' } },
      take: 50,
    }),
    // Countries
    prisma.pageView.groupBy({
      by: ['country'],
      where: { tenantId, createdAt: { gte: periodStart } },
      _count: true,
      orderBy: { _count: { country: 'desc' } },
      take: 10,
    }),
    // Daily views
    prisma.$queryRaw<Array<{ day: Date; views: bigint }>>`
      SELECT DATE("createdAt") as day, COUNT(*) as views
      FROM "PageView"
      WHERE "tenantId" = ${tenantId}
        AND "createdAt" >= ${periodStart}
      GROUP BY DATE("createdAt")
      ORDER BY day
    `,
  ])

  // Process devices
  const totalDeviceViews = deviceRows.reduce((sum, r) => sum + r._count, 0) || 1
  const devices = deviceRows.map((r) => ({
    device: r.device || 'unknown',
    count: r._count,
    pct: Math.round((r._count / totalDeviceViews) * 1000) / 10,
  }))

  // Process referrers — categorize and aggregate
  const categoryMap = new Map<string, number>()
  for (const row of referrerRows) {
    const category = categorizeReferrer(row.referrer)
    categoryMap.set(category, (categoryMap.get(category) || 0) + row._count)
  }
  const totalReferrerViews = Array.from(categoryMap.values()).reduce((a, b) => a + b, 0) || 1
  const referrers = Array.from(categoryMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([category, count]) => ({
      category,
      count,
      pct: Math.round((count / totalReferrerViews) * 1000) / 10,
    }))

  // Process countries
  const totalCountryViews = countryRows.reduce((sum, r) => sum + r._count, 0) || 1
  const countries = countryRows.map((r) => ({
    country: r.country || 'Unbekannt',
    count: r._count,
    pct: Math.round((r._count / totalCountryViews) * 1000) / 10,
  }))

  // Process daily views
  const daily = dailyRows.map((r) => ({
    date: new Date(r.day).toISOString().split('T')[0],
    views: Number(r.views) || 0,
  }))

  return { devices, referrers, countries, daily }
}

// ---------------------------------------------------------------------------
// SEO Health
// ---------------------------------------------------------------------------
async function computeSeoHealth(tenantId: string) {
  const [pages, homepageFaq] = await Promise.all([
    prisma.page.findMany({
      where: { tenantId },
      select: {
        slug: true,
        title: true,
        metaTitle: true,
        metaDescription: true,
        metaKeywords: true,
        faqSchema: true,
        ogImage: true,
        content: true,
        isPublished: true,
        seoData: true,
        updatedAt: true,
      },
    }),
    prisma.homepageSection.findFirst({
      where: { tenantId, type: 'faq' },
      select: { content: true, updatedAt: true },
    }),
  ])

  const pageResults = pages.map((page) => {
    const { score, checks } = computeSeoScore(page)
    return {
      slug: page.slug,
      title: page.title,
      score,
      checks,
    }
  })

  // Synthetic homepage entry — metadata is hardcoded in generateMetadata()
  const homepageEntry = computeSeoScore({
    metaTitle: 'Das Messer – Ihr Marktplatz für hochwertige Messer aus Meisterhand',
    metaDescription:
      'Entdecken Sie handgefertigte Küchenmesser, Outdoormesser und Damastmesser von ausgewählten Herstellern. Qualität, Tradition und Handwerkskunst — direkt vom Hersteller, ohne Provision.',
    metaKeywords:
      'Messer kaufen, Küchenmesser, Damastmesser, Outdoormesser, Messer Marktplatz, Kochmesser, Jagdmesser, handgefertigte Messer, Messer Hersteller, Solingen Messer',
    faqSchema: (homepageFaq?.content as Record<string, unknown>)?.items ?? null,
    ogImage: null,
    content: '',
    isPublished: true,
    seoData: { '@type': 'WebSite' },
    updatedAt: homepageFaq?.updatedAt ?? new Date(),
  })
  pageResults.unshift({
    slug: '/',
    title: 'Startseite',
    score: homepageEntry.score,
    checks: homepageEntry.checks,
  })

  const publishedScores = pageResults.filter((p) =>
    pages.find((pg) => pg.slug === p.slug)?.isPublished
  )
  const siteAverage =
    publishedScores.length > 0
      ? Math.round(
          publishedScores.reduce((sum, p) => sum + p.score, 0) /
            publishedScores.length
        )
      : 0

  return {
    siteAverage,
    pages: pageResults,
  }
}
