import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { getSiteSettings } from '@/lib/menu'
import { getFeaturedEvent, getFeaturedEventLineup, getPublishedEventBySlug } from '@/lib/events'
import { buildMetadata, websiteJsonLd } from '@/lib/seo'
import JsonLd from '@/components/JsonLd'
import NoirTimetable, { type NoirDay } from '@/components/noir/NoirTimetable'
import HomepageSectionRenderer from '@/components/sections/HomepageSectionRenderer'
import { getHomepageSections } from '@/lib/sections'

export const dynamic = 'force-dynamic'

const TZ = 'Europe/Berlin'
const fmtTime = (d: Date) =>
  new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit', timeZone: TZ }).format(d)
const fmtDayShort = (d: Date) =>
  new Intl.DateTimeFormat('de-DE', { weekday: 'short', timeZone: TZ }).format(d).replace('.', '')
const fmtWeekdayLong = (d: Date) =>
  new Intl.DateTimeFormat('de-DE', { weekday: 'long', timeZone: TZ }).format(d)
const fmtDayNum = (d: Date) => new Intl.DateTimeFormat('de-DE', { day: '2-digit', timeZone: TZ }).format(d)
const fmtMonthNum = (d: Date) => new Intl.DateTimeFormat('de-DE', { month: '2-digit', timeZone: TZ }).format(d)
const fmtMonthShort = (d: Date) =>
  new Intl.DateTimeFormat('de-DE', { month: 'short', timeZone: TZ }).format(d).replace('.', '').toUpperCase()
const dayKey = (d: Date) =>
  new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: TZ }).format(d)

const ROLE_TYPE: Record<string, string> = {
  headliner: 'Headliner',
  support: 'Musik',
  guest: 'Gast',
  break: 'Pause',
}

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings()
  const metadata = buildMetadata(null, '/', {
    title: 'Das 11. Benefiz-Festival am 7. & 8. August 2026',
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

export default async function HomePage() {
  const featured = await getFeaturedEvent()
  const [lineup, event, sections] = await Promise.all([
    getFeaturedEventLineup(),
    featured ? getPublishedEventBySlug(featured.slug) : Promise.resolve(null),
    getHomepageSections(),
  ])

  // Map artist slug → richer summary (origin/genres) for subtitles + card meta
  const lineupBySlug = new Map(lineup.map((a) => [a.slug, a]))

  // Per-artist appearance meta (earliest slot) for the line-up cards: "Fr · 22:00 · Hauptbühne"
  const apMetaBySlug = new Map<string, string>()
  if (event) {
    for (const ap of event.appearances) {
      if (!ap.artist || apMetaBySlug.has(ap.artist.slug)) continue
      const parts = [fmtDayShort(ap.startTime), fmtTime(ap.startTime)]
      if (ap.stage?.name) parts.push(ap.stage.name)
      apMetaBySlug.set(ap.artist.slug, parts.join(' · '))
    }
  }

  // Timetable days grouped by calendar day (Europe/Berlin)
  const days: NoirDay[] = []
  if (event) {
    const byDay = new Map<string, typeof event.appearances>()
    for (const ap of event.appearances) {
      const k = dayKey(ap.startTime)
      if (!byDay.has(k)) byDay.set(k, [])
      byDay.get(k)!.push(ap)
    }
    for (const [, aps] of [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b))) {
      const first = aps[0].startTime
      days.push({
        id: dayKey(first).replace(/-/g, ''),
        label: `${fmtWeekdayLong(first)} · ${fmtDayNum(first)}.${fmtMonthNum(first)}.`,
        rows: aps.map((ap) => {
          const sum = ap.artist ? lineupBySlug.get(ap.artist.slug) : undefined
          const subParts: string[] = []
          if (sum?.genres?.length) subParts.push(sum.genres.join(' / '))
          if (sum?.origin) subParts.push(sum.origin)
          if (ap.note) subParts.push(ap.note)
          if (ap.stage?.name) subParts.push(ap.stage.name)
          return {
            time: fmtTime(ap.startTime),
            title: ap.artist?.name ?? ap.title ?? '—',
            subtitle: subParts.join(' · '),
            type: ROLE_TYPE[ap.role] ?? 'Programm',
            highlight: ap.role === 'headliner',
          }
        }),
      })
    }
  }

  const features = lineup.slice(0, 2)
  const regulars = lineup.slice(2, 6)
  const stageCount = event?.stages.length ?? 0

  const start = featured?.startDate
  const end = featured?.endDate ?? start
  const location = featured?.locationName ?? 'Hof Thiele, Ventschau'
  const year = start
    ? new Intl.DateTimeFormat('de-DE', { year: 'numeric', timeZone: TZ }).format(start)
    : ''
  const kicker = start
    ? `11. Ausgabe // ${fmtDayNum(start)}–${fmtDayNum(end!)} ${fmtMonthShort(start)} ${year} // ${location.toUpperCase()}`
    : '11. Ausgabe // Benefiz-Festival'
  const dateMeta = start
    ? `${fmtDayShort(start)}–${fmtDayShort(end!)}, ${fmtDayNum(start)}.–${fmtDayNum(end!)}. ${fmtMonthShort(start)}`
    : '7.–8. Aug'

  return (
    <div className="nh">
      <JsonLd data={websiteJsonLd} />

      {/* HERO */}
      <section className="nh-hero">
        <div className="nh-hero-bg" aria-hidden="true" />
        <div className="nh-fog" aria-hidden="true" />
        <div className="nh-logo" aria-hidden="true">
          <Image
            src="/e-ventschau-logo.png"
            alt=""
            fill
            sizes="(max-width: 700px) 70vw, 600px"
            style={{ objectFit: 'contain' }}
            priority
          />
        </div>
        <div className="nh-wrap">
          <div className="nh-kick">
            {kicker.split(' // ').map((part, i, arr) => (
              <span key={i}>
                {i === 0 ? part : <span style={{ color: 'var(--gold, #FAB90C)' }}>{part}</span>}
                {i < arr.length - 1 && <span> // </span>}
              </span>
            ))}
          </div>
          <h1>
            e-Ventschau
            <span className="nh-sub">
              <b>Benefiz</b> · Kultur · <i>Widerstand</i> — zwei Nächte auf dem Hof
            </span>
          </h1>
          <div className="nh-cta">
            <Link className="btn-primary" href="#programm">
              Programm ansehen
            </Link>
            <Link className="btn-secondary" href="#spenden">
              Tickets &amp; Spenden
            </Link>
          </div>
          <div className="nh-meta">
            <div className="nh-hm">
              <div className="k">Acts</div>
              <div className="v">
                {lineup.length} Bands{stageCount > 0 ? ` · ${stageCount} Bühnen` : ''}
              </div>
            </div>
            <div className="nh-hm">
              <div className="k">Datum</div>
              <div className="v">{dateMeta}</div>
            </div>
            <div className="nh-hm">
              <div className="k">Camping</div>
              <div className="v">Frei auf der Wiese</div>
            </div>
            <div className="nh-hm">
              <div className="k">Zweck</div>
              <div className="v">100% Benefiz</div>
            </div>
          </div>
        </div>
      </section>

      {/* MARQUEE */}
      {lineup.length > 0 && (
        <div className="nh-marq">
          <div className="nh-marq-track">
            <MarqueeRun names={lineup.map((a) => a.name)} />
            <MarqueeRun names={lineup.map((a) => a.name)} ariaHidden />
          </div>
        </div>
      )}

      {/* LINE-UP */}
      {lineup.length > 0 && (
        <section className="nh-sec" id="lineup">
          <div className="nh-wrap">
            <div className="nh-sec-head">
              <div className="nh-lab">Line-up 2026</div>
              <h2>
                {lineup.length} Acts.
                <br />
                Zwei Nächte. Ein Hof.
              </h2>
              <p className="nh-sub">
                Von skandinavischem Blues-Rock bis kolumbianischem Club-Beat – kuratiert für die Nacht,
                gespielt unter freiem Himmel.
              </p>
            </div>
            <div className="nh-lu">
              {features.map((a, i) => (
                <LineupCard
                  key={a.slug}
                  artist={a}
                  meta={apMetaBySlug.get(a.slug)}
                  index={i + 1}
                  size="xl"
                  headliner={i === 0 ? 'gold' : 'clay'}
                />
              ))}
              {regulars.map((a, i) => (
                <LineupCard key={a.slug} artist={a} meta={apMetaBySlug.get(a.slug)} index={i + 3} size="md" />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* PROGRAMM / TIMETABLE */}
      {days.length > 0 && (
        <section className="nh-sec nh-sec-coal" id="programm">
          <div className="nh-wrap">
            <div className="nh-sec-head">
              <div className="nh-lab">Timetable</div>
              <h2>Der Ablauf</h2>
              <p className="nh-sub">
                Musik, Vorträge, Ausstellung und Kinderprogramm – zwei Tage durchgetaktet.
              </p>
            </div>
            <NoirTimetable days={days} />
          </div>
        </section>
      )}

      {/* CUSTOM SECTIONS — frei zusammenstellbar & sortierbar über /admin/sections */}
      {sections.length > 0 && (
        <div className="nh-sections">
          <HomepageSectionRenderer sections={sections} />
        </div>
      )}

      {/* MANIFEST */}
      <section className="nh-manifest" id="manifest">
        <div className="nh-wrap">
          <h2>
            Wir machen <em>Lärm gegen das Vergessen.</em>
          </h2>
          <p>
            Seit 2013 erinnert e-Ventschau an Tschernobyl und Fukushima – mit Musik, Kunst und Haltung.
            Ehrenamtlich organisiert, solidarisch finanziert, 100% Benefiz. Ein Hof, zwei Nächte, eine
            klare Botschaft: Kultur ist Widerstand.
          </p>
          <div className="nh-mstats">
            <div className="nh-ms">
              <div className="v">11.</div>
              <div className="k">Ausgabe</div>
            </div>
            <div className="nh-ms">
              <div className="v">20</div>
              <div className="k">Ehrenamtliche</div>
            </div>
            <div className="nh-ms">
              <div className="v">2013</div>
              <div className="k">seit</div>
            </div>
            <div className="nh-ms">
              <div className="v">100%</div>
              <div className="k">Benefiz</div>
            </div>
          </div>
        </div>
      </section>

      {/* DONATE */}
      <section className="nh-sec nh-sec-coal" id="spenden">
        <div className="nh-wrap">
          <div className="nh-don">
            <div>
              <div className="nh-sec-head" style={{ marginBottom: 0 }}>
                <div className="nh-lab">Tickets &amp; Spenden</div>
                <h2>Zahl, was du kannst.</h2>
                <p className="nh-sub">
                  Der Eintritt bleibt sozial verträglich – wer mehr gibt, sichert das Festival. Jeder Euro
                  fließt in den Benefiz-Zweck.
                </p>
              </div>
              <div className="nh-chips">
                {['10 €', '25 €', '50 €', 'Frei'].map((c) => (
                  <Link key={c} className="nh-chip" href="/unterstuetzung">
                    {c}
                  </Link>
                ))}
              </div>
              <Link className="btn-primary" href="/unterstuetzung">
                Jetzt spenden
              </Link>
            </div>
            <div className="nh-dcard">
              <h3>Spendenziel 2026</h3>
              <p style={{ color: 'var(--muted, #8AA0B4)', fontSize: 14 }}>
                Für Technik, Bühne &amp; Künstler:innen.
              </p>
              <div
                className="nh-pbar"
                role="progressbar"
                aria-valuenow={70}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Spendenziel 2026: 70 % erreicht"
              >
                <i style={{ width: '70%' }} />
              </div>
              <div className="nh-drow">
                <span>
                  <b>8.420 €</b> gesammelt
                </span>
                <span>Ziel 12.000 €</span>
              </div>
              <div
                className="nh-drow"
                style={{ marginTop: 20, paddingTop: 18, borderTop: '1px solid var(--b2, #123E63)' }}
              >
                <span>70% erreicht</span>
                <span>noch 3.580 €</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

function MarqueeRun({ names, ariaHidden }: { names: string[]; ariaHidden?: boolean }) {
  return (
    <span aria-hidden={ariaHidden}>
      {names.map((n) => (
        <span key={n}>
          {n.toUpperCase()}
          <span className="d"> // </span>
        </span>
      ))}
    </span>
  )
}

type LineupArtist = {
  slug: string
  name: string
  origin?: string | null
  genres?: string[]
  heroImage?: string | null
  excerpt?: string | null
}

function LineupCard({
  artist,
  meta,
  index,
  size,
  headliner,
}: {
  artist: LineupArtist
  meta?: string
  index: number
  size: 'xl' | 'md'
  headliner?: 'gold' | 'clay'
}) {
  const genreLine = [artist.genres?.join(' / '), artist.origin].filter(Boolean).join(' · ')
  return (
    <Link
      href={`/kuenstler/${artist.slug}`}
      className={`nh-act ${size === 'xl' ? 'nh-act-xl' : 'nh-act-md'}`}
      aria-label={`${artist.name} – zum Künstlerprofil`}
    >
      <div className="nh-ph">
        {artist.heroImage && (
          <Image
            src={artist.heroImage}
            alt=""
            fill
            sizes={size === 'xl' ? '50vw' : '25vw'}
            style={{ objectFit: 'cover' }}
          />
        )}
        {headliner && <span className={`nh-tagline${headliner === 'gold' ? ' l' : ''}`}>Headliner</span>}
        <span className="nh-idx">{String(index).padStart(2, '0')}</span>
        {!artist.heroImage && <span className="nh-ph-tag">Foto folgt</span>}
      </div>
      <div className="nh-act-b">
        {meta && <div className="meta">{meta}</div>}
        <h3>{artist.name}</h3>
        {size === 'xl' ? (
          <>
            {artist.excerpt && <p>{artist.excerpt}</p>}
            {genreLine && (
              <div className="nh-gens">
                {artist.genres?.map((g) => (
                  <span key={g} className="nh-gen">
                    {g}
                  </span>
                ))}
                {artist.origin && <span className="nh-gen">{artist.origin}</span>}
              </div>
            )}
          </>
        ) : (
          genreLine && <p>{genreLine}</p>
        )}
      </div>
    </Link>
  )
}
