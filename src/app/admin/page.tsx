import { prisma } from '@/lib/prisma'
import { getTenant } from '@/lib/tenant'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

async function getStats() {
  const tenant = await getTenant()
  if (!tenant) return null

  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const [
    totalLeads,
    newLeads,
    totalVendors,
    activeVendors,
    totalPageViews,
    recentPageViews,
    topPages,
    recentLeads,
    bannerImpressions,
    bannerClicks,
    topBanners,
  ] = await Promise.all([
    prisma.lead.count({ where: { tenantId: tenant.id } }),
    prisma.lead.count({
      where: { tenantId: tenant.id, status: 'new' },
    }),
    prisma.vendor.count({ where: { tenantId: tenant.id } }),
    prisma.vendor.count({
      where: { tenantId: tenant.id, isActive: true },
    }),
    prisma.pageView.count({
      where: { tenantId: tenant.id, createdAt: { gte: thirtyDaysAgo } },
    }),
    prisma.pageView.count({
      where: { tenantId: tenant.id, createdAt: { gte: sevenDaysAgo } },
    }),
    prisma.pageView.groupBy({
      by: ['path'],
      where: { tenantId: tenant.id, createdAt: { gte: sevenDaysAgo } },
      _count: true,
      orderBy: { _count: { path: 'desc' } },
      take: 10,
    }),
    prisma.lead.findMany({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.bannerImpression.count({
      where: { tenantId: tenant.id, eventType: 'view', createdAt: { gte: thirtyDaysAgo } },
    }),
    prisma.bannerImpression.count({
      where: { tenantId: tenant.id, eventType: 'click', createdAt: { gte: thirtyDaysAgo } },
    }),
    prisma.vendorAd.findMany({
      where: { vendor: { tenantId: tenant.id }, isActive: true },
      select: { id: true, title: true, views: true, clicks: true, costPerMille: true },
      orderBy: { views: 'desc' },
      take: 5,
    }),
  ])

  return {
    totalLeads,
    newLeads,
    totalVendors,
    activeVendors,
    totalPageViews,
    recentPageViews,
    topPages,
    recentLeads,
    bannerImpressions,
    bannerClicks,
    topBanners,
  }
}

export default async function AdminDashboard() {
  const stats = await getStats()

  if (!stats) {
    return (
      <div className="text-center py-20">
        <p className="text-brand-text-muted">
          Tenant nicht konfiguriert. Bitte führen Sie das Seeding aus.
        </p>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-display font-bold text-brand-text mb-6">
        Dashboard
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="glass-card">
          <p className="text-sm text-brand-text-muted mb-1">Leads gesamt</p>
          <p className="text-3xl font-bold text-brand-text">{stats.totalLeads}</p>
          <p className="text-xs text-brand-accent mt-1">
            {stats.newLeads} neue
          </p>
        </div>
        <div className="glass-card">
          <p className="text-sm text-brand-text-muted mb-1">Händler</p>
          <p className="text-3xl font-bold text-brand-text">
            {stats.totalVendors}
          </p>
          <p className="text-xs text-brand-accent mt-1">
            {stats.activeVendors} aktiv
          </p>
        </div>
        <div className="glass-card">
          <p className="text-sm text-brand-text-muted mb-1">
            Seitenaufrufe (30 Tage)
          </p>
          <p className="text-3xl font-bold text-brand-text">
            {stats.totalPageViews}
          </p>
        </div>
        <div className="glass-card">
          <p className="text-sm text-brand-text-muted mb-1">
            Seitenaufrufe (7 Tage)
          </p>
          <p className="text-3xl font-bold text-brand-text">
            {stats.recentPageViews}
          </p>
        </div>
      </div>

      {/* Banner Performance */}
      {(stats.bannerImpressions > 0 || stats.topBanners.length > 0) && (
        <div className="glass-card mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-brand-text">
              Banner-Performance (30 Tage)
            </h2>
            <Link
              href="/admin/ads"
              className="text-sm text-brand-accent hover:underline"
            >
              Alle Anzeigen
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <p className="text-xs text-brand-text-muted">Impressionen</p>
              <p className="text-2xl font-bold text-brand-text">{stats.bannerImpressions.toLocaleString('de-DE')}</p>
            </div>
            <div>
              <p className="text-xs text-brand-text-muted">Klicks</p>
              <p className="text-2xl font-bold text-brand-text">{stats.bannerClicks.toLocaleString('de-DE')}</p>
            </div>
            <div>
              <p className="text-xs text-brand-text-muted">CTR</p>
              <p className="text-2xl font-bold text-brand-text">
                {stats.bannerImpressions > 0
                  ? `${((stats.bannerClicks / stats.bannerImpressions) * 100).toFixed(2)}%`
                  : '--'}
              </p>
            </div>
          </div>
          {stats.topBanners.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-brand-text-muted font-medium uppercase tracking-wider">Top Banner</p>
              {stats.topBanners.map((banner, i) => (
                <div key={banner.id} className="flex items-center justify-between p-2 rounded-lg bg-brand-bg-dark">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-brand-text-muted w-5">{i + 1}.</span>
                    <span className="text-sm text-brand-text truncate max-w-[200px]">{banner.title}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-brand-text-muted">
                    <span>{banner.views} Views</span>
                    <span>{banner.clicks} Klicks</span>
                    {banner.costPerMille && banner.views > 0 && (
                      <span className="font-medium text-brand-text">
                        {'\u20AC'}{((banner.views / 1000) * banner.costPerMille).toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="glass-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-brand-text">
              Neueste Leads
            </h2>
            <Link
              href="/admin/leads"
              className="text-sm text-brand-accent hover:underline"
            >
              Alle ansehen
            </Link>
          </div>
          {stats.recentLeads.length === 0 ? (
            <p className="text-sm text-brand-text-muted">Noch keine Leads.</p>
          ) : (
            <div className="space-y-3">
              {stats.recentLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-brand-bg-dark"
                >
                  <div>
                    <p className="text-sm font-medium text-brand-text">
                      {lead.name}
                    </p>
                    <p className="text-xs text-brand-text-muted">{lead.email}</p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-block px-2 py-0.5 text-xs rounded-full ${
                        lead.status === 'new'
                          ? 'bg-brand-accent/10 text-brand-accent'
                          : 'bg-brand-bg-dark text-brand-text-muted'
                      }`}
                    >
                      {lead.status}
                    </span>
                    <p className="text-xs text-brand-text-muted-light mt-0.5">
                      {lead.createdAt.toLocaleDateString('de-DE')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass-card">
          <h2 className="text-lg font-semibold text-brand-text mb-4">
            Top Seiten (7 Tage)
          </h2>
          {stats.topPages.length === 0 ? (
            <p className="text-sm text-brand-text-muted">
              Noch keine Seitenaufrufe.
            </p>
          ) : (
            <div className="space-y-2">
              {stats.topPages.map((page, i) => (
                <div
                  key={page.path}
                  className="flex items-center justify-between p-2 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-brand-text-muted w-5">
                      {i + 1}.
                    </span>
                    <span className="text-sm text-brand-text truncate max-w-[250px]">
                      {page.path}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-brand-text">
                    {page._count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
