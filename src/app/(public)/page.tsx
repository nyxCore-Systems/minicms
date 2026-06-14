import type { Metadata } from 'next'
import Link from 'next/link'
import { getSiteSettings } from '@/lib/menu'
import { buildMetadata, websiteJsonLd } from '@/lib/seo'
import JsonLd from '@/components/JsonLd'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings()
  const metadata = buildMetadata(null, '/', {
    title: 'e-Ventschau – Das 11. Benefiz-Festival am 7. & 8. August 2026',
    description:
      'Internationale Live-Musik für den guten Zweck: Das e-Ventschau-Benefiz-Festival in Ventschau (Landkreis Lüneburg) vereint Blues-Rock, Funk und Latin mit Ausstellungen und Vorträgen – zugunsten von Opfern nuklearer Katastrophen in Tschernobyl und Fukushima.',
    keywords: [
      'e-Ventschau',
      'Benefiz-Festival',
      'Musikfestival Lüneburg',
      'Ventschau',
      'Open Air',
      'Blues Rock',
      'Funk',
      'Tschernobyl',
      'Fukushima',
      'Anti-Atom',
    ],
  })

  if (settings.backgroundImage) {
    return {
      ...metadata,
      openGraph: { ...metadata.openGraph, images: [{ url: settings.backgroundImage }] },
    }
  }
  return metadata
}

const lineup2026 = [
  { name: 'Thorbjørn Risager & The Black Tornado', origin: 'Dänemark', genre: 'Blues Rock / Soul' },
  { name: 'Lebron Johnson', origin: 'Italien', genre: 'Rock / Funk' },
  { name: 'Killabeatmaker', origin: 'Kolumbien', genre: 'Latin / Electronic' },
  { name: 'Jed Thomas Band', origin: 'Großbritannien', genre: 'Heavy Blues Rock' },
  { name: 'ROVAR', origin: 'Münster', genre: 'Stoner / 70s Rock' },
  { name: 'Nanny Goats', origin: 'Lüneburg', genre: 'Semi-Acoustic' },
  { name: 'The Klaxon', origin: 'Kolumbien', genre: 'Ska / Latin' },
]

export default function HomePage() {
  return (
    <div className="relative">
      <JsonLd data={websiteJsonLd} />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-brand-primary/10 via-transparent to-transparent" />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 sm:pt-28 sm:pb-24 text-center">
          <span className="inline-block glass-card px-4 py-1.5 rounded-pill text-sm font-medium text-brand-accent mb-6 animate-fade-in">
            11. e-Ventschau-Benefiz-Festival
          </span>
          <h1 className="font-display text-4xl sm:text-6xl font-bold text-brand-text leading-tight animate-slide-up">
            Musik, die <span className="text-brand-primary">bewegt</span>.
            <br className="hidden sm:block" /> Spenden, die <span className="text-brand-accent">helfen</span>.
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-brand-text-muted max-w-2xl mx-auto leading-relaxed">
            Am <strong className="text-brand-text">7. &amp; 8. August 2026</strong> verwandelt sich der
            Resthof Thiele in Ventschau wieder in eine Festival-Bühne für internationale Live-Musik –
            für den guten Zweck.
          </p>
          <div className="mt-9 flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/programm-2026" className="btn-primary text-base px-7 py-3">
              Programm 2026 ansehen
            </Link>
            <Link href="/unterstuetzung" className="btn-secondary text-base px-7 py-3">
              Jetzt unterstützen
            </Link>
          </div>
        </div>
      </section>

      {/* Line-up */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="text-center mb-10">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-brand-text">Line-up 2026</h2>
          <p className="mt-3 text-brand-text-muted">Sieben Bands aus aller Welt – Blues-Rock, Funk, Latin und mehr.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {lineup2026.map((band) => (
            <div key={band.name} className="glass-card rounded-section p-6 transition-all hover:shadow-card-hover">
              <p className="text-xs uppercase tracking-wider text-brand-accent font-semibold">{band.origin}</p>
              <h3 className="mt-2 font-display text-xl font-bold text-brand-text leading-snug">{band.name}</h3>
              <p className="mt-1 text-sm text-brand-text-muted">{band.genre}</p>
            </div>
          ))}
        </div>
        <div className="text-center mt-10">
          <Link href="/programm-2026" className="btn-primary text-base px-7 py-3">
            Zum vollständigen Programm
          </Link>
        </div>
      </section>

      {/* Benefiz teaser */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="glass-strong rounded-section p-8 sm:p-12 text-center">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-brand-text">Ein Festival mit Haltung</h2>
          <p className="mt-4 text-brand-text-muted max-w-3xl mx-auto leading-relaxed">
            Seit 2013 weist die e-Ventschau auf die Risiken der Atomenergie hin und sammelt Spenden für
            Menschen in den Regionen Tschernobyl und Fukushima. Rund 20 Ehrenamtliche bringen das Fest jedes
            Jahr auf die Beine – mit Live-Musik, Ausstellungen und Vorträgen.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/informationen" className="btn-secondary text-base px-7 py-3">
              Über uns
            </Link>
            <Link href="/unterstuetzung" className="btn-primary text-base px-7 py-3">
              Spendenkonto
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
