import Link from 'next/link'

interface InfoCard {
  emoji: string
  label: string
  sublabel: string
}

interface InfoLink {
  label: string
  href: string
}

interface InfoTeaserProps {
  title: string
  description: string
  links: InfoLink[]
  cards: InfoCard[]
}

export default function InfoTeaser({ title, description, links, cards }: InfoTeaserProps) {
  return (
    <section className="py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="glass-card !p-8 sm:!p-12">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="font-display text-2xl md:text-3xl font-bold text-brand-text mb-4">
                {title}
              </h2>
              <p className="text-brand-text-muted leading-relaxed mb-6">
                {description}
              </p>
              <div className="flex flex-wrap gap-3">
                {links.map((link, i) => (
                  <Link key={i} href={link.href} className="btn-secondary text-sm">
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {cards.map((card, i) => (
                <div key={i} className="glass rounded-sm p-4 text-center">
                  <p className="text-3xl mb-2">{card.emoji}</p>
                  <p className="text-sm font-medium text-brand-text">{card.label}</p>
                  <p className="text-xs text-brand-text-muted mt-1">{card.sublabel}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
