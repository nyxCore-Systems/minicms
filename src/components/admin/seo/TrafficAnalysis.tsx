'use client'

interface DeviceData {
  device: string
  count: number
  pct: number
}

interface ReferrerData {
  category: string
  count: number
  pct: number
}

interface CountryData {
  country: string
  count: number
  pct: number
}

interface DailyData {
  date: string
  views: number
}

interface TrafficData {
  devices: DeviceData[]
  referrers: ReferrerData[]
  countries: CountryData[]
  daily: DailyData[]
}

const DEVICE_COLORS: Record<string, string> = {
  desktop: 'bg-blue-500',
  mobile: 'bg-teal-500',
  tablet: 'bg-purple-500',
}

const DEVICE_LABELS: Record<string, string> = {
  desktop: 'Desktop',
  mobile: 'Mobil',
  tablet: 'Tablet',
}

const REFERRER_COLORS: Record<string, string> = {
  'Direkt': 'bg-gray-400',
  'Organisch': 'bg-green-500',
  'Social': 'bg-blue-500',
  'Verweis': 'bg-purple-500',
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
}

export default function TrafficAnalysis({ data }: { data: TrafficData }) {
  const maxDaily = Math.max(...data.daily.map((d) => d.views), 1)
  const maxReferrer = Math.max(...data.referrers.map((r) => r.count), 1)
  const maxCountry = data.countries.length > 0 ? data.countries[0].count : 1

  return (
    <div className="glass-card">
      <h2 className="text-lg font-semibold text-brand-text mb-4">Traffic-Analyse</h2>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Devices */}
        <div>
          <h3 className="text-sm font-medium text-brand-text-muted uppercase tracking-wide mb-3">Geraete</h3>
          {data.devices.length > 0 ? (
            <>
              <div className="flex h-6 rounded-full overflow-hidden text-xs text-white mb-3">
                {data.devices.map((d) => (
                  d.pct > 0 && (
                    <div
                      key={d.device}
                      className={`${DEVICE_COLORS[d.device] || 'bg-gray-400'} flex items-center justify-center transition-all`}
                      style={{ width: `${d.pct}%` }}
                      title={`${DEVICE_LABELS[d.device] || d.device}: ${d.pct.toFixed(0)}%`}
                    >
                      {d.pct >= 15 && `${DEVICE_LABELS[d.device] || d.device} ${d.pct.toFixed(0)}%`}
                    </div>
                  )
                ))}
              </div>
              <div className="flex flex-wrap gap-3 text-xs text-brand-text-muted">
                {data.devices.map((d) => (
                  <div key={d.device} className="flex items-center gap-1.5">
                    <span className={`w-2.5 h-2.5 rounded-full ${DEVICE_COLORS[d.device] || 'bg-gray-400'}`} />
                    {DEVICE_LABELS[d.device] || d.device}: {d.count.toLocaleString('de-DE')}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-brand-text-muted">Keine Daten.</p>
          )}
        </div>

        {/* Referrers */}
        <div>
          <h3 className="text-sm font-medium text-brand-text-muted uppercase tracking-wide mb-3">Quellen</h3>
          {data.referrers.length > 0 ? (
            <div className="space-y-2">
              {data.referrers.map((r) => (
                <div key={r.category}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-brand-text font-medium">{r.category}</span>
                    <span className="text-brand-text-muted">{r.count.toLocaleString('de-DE')} ({r.pct.toFixed(0)}%)</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${REFERRER_COLORS[r.category] || 'bg-brand-accent'} transition-all`}
                      style={{ width: `${(r.count / maxReferrer) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-brand-text-muted">Keine Daten.</p>
          )}
        </div>

        {/* Countries */}
        <div>
          <h3 className="text-sm font-medium text-brand-text-muted uppercase tracking-wide mb-3">Laender</h3>
          {data.countries.length > 0 ? (
            <div className="space-y-2">
              {data.countries.map((c, i) => (
                <div key={c.country} className="flex items-center gap-3">
                  <span className="text-xs text-brand-text-muted w-4">{i + 1}.</span>
                  <span className="text-sm font-medium text-brand-text w-8">{c.country || '??'}</span>
                  <div className="flex-1 h-2 rounded-full bg-gray-200 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-brand-accent/70 transition-all"
                      style={{ width: `${(c.count / maxCountry) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-brand-text-muted w-16 text-right">
                    {c.count.toLocaleString('de-DE')} ({c.pct.toFixed(0)}%)
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-brand-text-muted">Keine Daten.</p>
          )}
        </div>

        {/* Daily trend */}
        <div>
          <h3 className="text-sm font-medium text-brand-text-muted uppercase tracking-wide mb-3">Tagesverlauf</h3>
          {data.daily.length > 0 ? (
            <div>
              <div className="flex items-end gap-px h-32">
                {data.daily.map((day) => (
                  <div
                    key={day.date}
                    className="flex-1 bg-brand-accent/70 rounded-t hover:bg-brand-accent transition-colors cursor-default"
                    style={{ height: `${Math.max((day.views / maxDaily) * 100, 2)}%` }}
                    title={`${formatDate(day.date)}: ${day.views} Aufrufe`}
                  />
                ))}
              </div>
              <div className="flex justify-between mt-2 text-xs text-brand-text-muted">
                <span>{formatDate(data.daily[0].date)}</span>
                {data.daily.length > 2 && (
                  <span>{formatDate(data.daily[Math.floor(data.daily.length / 2)].date)}</span>
                )}
                <span>{formatDate(data.daily[data.daily.length - 1].date)}</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-brand-text-muted">Keine Daten.</p>
          )}
        </div>
      </div>
    </div>
  )
}
