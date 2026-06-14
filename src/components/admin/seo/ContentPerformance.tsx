'use client'

interface ContentItem {
  path: string
  views: number
  avgScroll: number
  avgTime: number
  scroll100Rate: number
  engagementScore: number
  warnings: string[]
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '0s'
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  if (m === 0) return `${s}s`
  return `${m}m ${s}s`
}

function scoreColor(score: number): string {
  if (score >= 80) return 'bg-green-100 text-green-700'
  if (score >= 50) return 'bg-yellow-100 text-yellow-700'
  return 'bg-red-100 text-red-700'
}

function scrollBarColor(pct: number): string {
  if (pct >= 70) return 'bg-green-500'
  if (pct >= 40) return 'bg-yellow-400'
  return 'bg-red-400'
}

export default function ContentPerformance({ data }: { data: ContentItem[] }) {
  if (data.length === 0) {
    return (
      <div className="glass-card">
        <h2 className="text-lg font-semibold text-brand-text mb-4">Content Performance</h2>
        <p className="text-sm text-brand-text-muted">Noch keine Engagement-Daten vorhanden.</p>
      </div>
    )
  }

  const sorted = [...data].sort((a, b) => b.engagementScore - a.engagementScore)

  return (
    <div className="glass-card">
      <h2 className="text-lg font-semibold text-brand-text mb-4">Content Performance</h2>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-brand-border">
              <th className="text-left p-2 text-xs font-medium text-brand-text-muted uppercase">Seite</th>
              <th className="text-right p-2 text-xs font-medium text-brand-text-muted uppercase">Aufrufe</th>
              <th className="p-2 text-xs font-medium text-brand-text-muted uppercase text-left min-w-[120px]">Avg. Scroll</th>
              <th className="text-right p-2 text-xs font-medium text-brand-text-muted uppercase">Avg. Zeit</th>
              <th className="text-right p-2 text-xs font-medium text-brand-text-muted uppercase">Read-Through</th>
              <th className="text-right p-2 text-xs font-medium text-brand-text-muted uppercase">Score</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((item) => (
              <tr key={item.path} className="border-b border-gray-100 hover:bg-brand-bg-dark transition-colors">
                <td className="p-2">
                  <div className="flex flex-col gap-1">
                    <span className="text-brand-text truncate max-w-[200px]" title={item.path}>
                      {item.path}
                    </span>
                    {item.warnings.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {item.warnings.map((w) => (
                          <span key={w} className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-600 whitespace-nowrap">
                            {w}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </td>
                <td className="p-2 text-right font-medium text-brand-text">
                  {item.views.toLocaleString('de-DE')}
                </td>
                <td className="p-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 rounded-full bg-gray-200 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${scrollBarColor(item.avgScroll)} transition-all`}
                        style={{ width: `${Math.min(item.avgScroll, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-brand-text-muted w-10 text-right">
                      {Math.round(item.avgScroll)}%
                    </span>
                  </div>
                </td>
                <td className="p-2 text-right text-brand-text">
                  {formatDuration(item.avgTime)}
                </td>
                <td className="p-2 text-right">
                  <span className="text-brand-text">{Math.round(item.scroll100Rate)}%</span>
                </td>
                <td className="p-2 text-right">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${scoreColor(item.engagementScore)}`}>
                    {Math.round(item.engagementScore)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
