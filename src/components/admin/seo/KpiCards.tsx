'use client'

import TrendBadge from './TrendBadge'

interface KpiData {
  pageViews: { current: number; previous: number; trend: number | null }
  avgTimeOnPage: { current: number; previous: number; trend: number | null }
  engagementRate: { current: number; previous: number; trend: number | null }
  vitalsPassRate: { current: number; previous: number; trend: number | null }
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '0s'
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  if (m === 0) return `${s}s`
  return `${m}m ${s}s`
}

function rateColor(value: number, greenThreshold: number, yellowThreshold: number): string {
  if (value >= greenThreshold) return 'text-green-600'
  if (value >= yellowThreshold) return 'text-yellow-600'
  return 'text-red-500'
}

export default function KpiCards({ data }: { data: KpiData }) {
  const cards = [
    {
      label: 'Seitenaufrufe',
      value: data.pageViews.current.toLocaleString('de-DE'),
      trend: data.pageViews.trend,
      valueColor: 'text-brand-text',
    },
    {
      label: 'Avg. Verweildauer',
      value: formatDuration(data.avgTimeOnPage.current),
      trend: data.avgTimeOnPage.trend,
      valueColor: 'text-brand-text',
    },
    {
      label: 'Engagement-Rate',
      value: `${data.engagementRate.current.toFixed(1)}%`,
      trend: data.engagementRate.trend,
      valueColor: rateColor(data.engagementRate.current, 60, 40),
    },
    {
      label: 'Vitals Pass-Rate',
      value: `${Math.round(data.vitalsPassRate.current)}%`,
      trend: data.vitalsPassRate.trend,
      valueColor: rateColor(data.vitalsPassRate.current, 75, 50),
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div key={card.label} className="glass-card">
          <p className="text-xs text-brand-text-muted uppercase tracking-wide">
            {card.label}
          </p>
          <p className={`text-2xl font-bold mt-1 ${card.valueColor}`}>
            {card.value}
          </p>
          <div className="mt-2">
            <TrendBadge delta={card.trend} />
          </div>
        </div>
      ))}
    </div>
  )
}
