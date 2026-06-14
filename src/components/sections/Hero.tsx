import Link from 'next/link'

interface HeroStat {
  label: string
  sublabel: string
}

interface HeroButton {
  label: string
  href: string
  variant?: 'primary' | 'secondary'
}

export interface HeroData {
  badge?: string
  title: string
  titleHighlight?: string
  titleSuffix?: string
  subtitle: string
  buttons?: HeroButton[]
  stats?: HeroStat[]
}

interface HeroProps {
  data?: HeroData
}

const defaultData: HeroData = {
  badge: 'Ihr Marktplatz für Messermanufakturen',
  title: 'Meisterhafte Messer,',
  titleHighlight: 'handverlesen',
  titleSuffix: 'für Sie',
  subtitle:
    'Entdecken Sie handgefertigte Küchenmesser, Outdoormesser und exklusive Kollektionen von den besten Messerschmieden Europas. Qualität, Tradition und Handwerkskunst — vereint auf einer Plattform.',
  buttons: [
    { label: 'Messer entdecken', href: '/messerwissen', variant: 'primary' },
    { label: 'Partnerschaft anfragen', href: '#kontakt', variant: 'secondary' },
  ],
  stats: [
    { label: '100+', sublabel: 'Messermodelle' },
    { label: 'Keine', sublabel: 'Provision' },
    { label: 'Top', sublabel: 'Hersteller' },
  ],
}

export default function Hero({ data }: HeroProps) {
  const d = data || defaultData

  return (
    <section className="relative min-h-[85vh] flex items-center overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="max-w-7xl">
          <div className="rounded-sm bg-brand-surface border border-brand-border shadow-card p-6 sm:p-8 lg:p-10">
            {d.badge && (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-bg-dark border border-brand-border text-sm text-brand-accent font-medium mb-6 animate-fade-in">
                <span className="w-2 h-2 rounded-full bg-brand-accent animate-pulse" />
                {d.badge}
              </div>
            )}

            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-brand-text leading-[1.1] mb-6 animate-slide-up">
              {d.title}{' '}
              {d.titleHighlight && (
                <span className="text-brand-accent">{d.titleHighlight}</span>
              )}
              {d.titleSuffix && ` ${d.titleSuffix}`}
            </h1>

            <p
              className="text-lg sm:text-xl text-brand-text-muted leading-relaxed mb-8 animate-slide-up"
              style={{ animationDelay: '0.1s' }}
            >
              {d.subtitle}
            </p>

            {d.buttons && d.buttons.length > 0 && (
              <div
                className="flex flex-col sm:flex-row gap-4 animate-slide-up"
                style={{ animationDelay: '0.2s' }}
              >
                {d.buttons.map((btn, i) => (
                  <Link
                    key={i}
                    href={btn.href}
                    className={`${btn.variant === 'secondary' ? 'btn-secondary' : 'btn-primary'} text-lg px-8 py-4`}
                  >
                    {btn.label}
                  </Link>
                ))}
              </div>
            )}

            {d.stats && d.stats.length > 0 && (
              <div
                className="flex items-center gap-6 sm:gap-8 mt-10 animate-fade-in"
                style={{ animationDelay: '0.4s' }}
              >
                {d.stats.map((stat, i) => (
                  <div key={i} className="flex items-center gap-6 sm:gap-8">
                    {i > 0 && <div className="w-px h-10 bg-brand-text-muted/20" />}
                    <div>
                      <p className="text-2xl font-bold text-brand-text">{stat.label}</p>
                      <p className="text-xs text-brand-text-muted">{stat.sublabel}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
