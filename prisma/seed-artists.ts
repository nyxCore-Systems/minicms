/**
 * One-off, idempotent artist-content seed. Runs in the migrator container on the
 * server (live DATABASE_URL from compose env_file). Self-contained — no imports
 * from src/ (the migrator image only copies prisma/ + node_modules).
 *
 *   docker compose --profile migrate run --rm --build eventschau-migrate \
 *     npx tsx prisma/seed-artists.ts
 *
 * Safety: scalar text fields are filled ONLY when empty; genres + socials are
 * MERGED (never removed); videos are added only when the videoId is new. Set
 * DRY_RUN=1 to log planned changes without writing.
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const DRY = process.env.DRY_RUN === '1'
const TENANT_SLUG = process.env.TENANT_SLUG || 'e-ventschau'

type Social = { platform: string; url: string }
type Video = { videoId: string; title: string }
type ArtistSeed = {
  slug: string
  genres?: string[]
  website?: string
  excerpt?: string
  bio?: string
  metaTitle?: string
  metaDescription?: string
  socials?: Social[]
  videos?: Video[]
}

const DATA: ArtistSeed[] = [
  {
    slug: 'thorbjorn-risager',
    genres: ['Blues Rock', 'Soul', 'Blues'],
    website: 'https://risager.info/',
    excerpt:
      'Dänemarks hart arbeitende Blues-Rock-Dynamo aus Kopenhagen – eine achtköpfige Band um Sänger Thorbjørn Risager mit kraftvoller Soul- und Blueswucht.',
    metaTitle: 'Thorbjørn Risager & The Black Tornado – e-Ventschau 2026',
    metaDescription:
      'Achtköpfige dänische Blues-Rock- und Soul-Band um Sänger Thorbjørn Risager – live beim e-Ventschau Benefiz-Festival.',
    socials: [
      { platform: 'facebook', url: 'https://www.facebook.com/ThorbjornRisagerAndTheBlackTornado/' },
      { platform: 'instagram', url: 'https://www.instagram.com/thorbjornrisager_blacktornado/' },
      { platform: 'youtube', url: 'https://www.youtube.com/channel/UCrwtDBJYfqZ0hvDGfZxagGg' },
      { platform: 'spotify', url: 'https://open.spotify.com/artist/1ZH4VWLaW65KivEJmbhhiT' },
    ],
    videos: [
      { videoId: 'BB37zZWZEXE', title: 'Navigation Blues (Official Music Video)' },
      { videoId: 'wQk4bSSVReQ', title: 'House Of Sticks (Official Music Video)' },
      { videoId: 'ZBxUabvIHfA', title: 'Watch The Sun Go Down (Official Music Video)' },
    ],
  },
  {
    slug: 'lebron-johnson',
    genres: ['Soul', 'Funk', 'Blues'],
    excerpt:
      'Der in Nigeria geborene, in Italien lebende Soul- und Funk-Sänger LeBron Johnson verbindet warme Gospel-Stimme mit afrikanischen Rhythmen.',
    bio: `LeBron Johnson (geboren 1998 in Nigeria) kam 2017 nach Italien, wo er zunächst im Gospelchor der Evangelischen Kirche in Ravenna sang. Aus diesen Wurzeln entwickelte er einen eigenen Stil zwischen Soul, Funk, Blues und R&B.

2021 gründete er mit dem Gitarristen Andrea „Andy Pitt" Pititto seine eigene Band. 2023 erschien das Debütalbum „Anonymous", das Soul, Funk und Blues mit traditionellen nigerianischen Rhythmen verbindet; 2025 folgte „Strong Man Still Human".

Mit warmer, charismatischer Stimme und intensiver Bühnenpräsenz gilt er als eine der vielversprechenden Soul- und Funk-Stimmen der italienischen Live-Szene.`,
    metaTitle: 'LeBron Johnson – e-Ventschau 2026',
    metaDescription:
      'Nigerianisch-italienischer Soul- und Funk-Sänger mit Gospel-Wurzeln – live beim e-Ventschau Benefiz-Festival.',
    socials: [
      { platform: 'spotify', url: 'https://open.spotify.com/artist/5cgrt27pCo5qVNaIaElXBu' },
      { platform: 'instagram', url: 'https://www.instagram.com/_lebronjohnson' },
      { platform: 'youtube', url: 'https://www.youtube.com/@lebronjohnsonsoul' },
    ],
  },
  {
    slug: 'killabeatmaker',
    genres: ['Cumbia', 'Afrobeat', 'Global Bass', 'Electronic'],
    excerpt:
      'Der Produzent und DJ Killabeatmaker aus Medellín verschmilzt afrokolumbianische Wurzeln mit Cumbia, Afrobeat und treibendem Club-Sound.',
    bio: `Killabeatmaker, mit bürgerlichem Namen Hilder Brando, ist Produzent, DJ und Sänger aus Medellín, Kolumbien. Seit über 18 Jahren verbindet er die traditionellen Rhythmen seiner afrokolumbianischen und indigenen Wurzeln mit urbanen Beats und rohem Club-Sound – ein Stil, der zwischen Cumbia, Afrobeat, Amapiano und Global Bass changiert.

Live tritt er als Trio auf, das die mystischen Klänge der kolumbianischen Gaita, pulsierende Perkussion und sein eigenes Können als Beatboxer, Rapper und Sänger zusammenbringt. Damit stand er auf Bühnen in über 35 europäischen Städten sowie in Amerika, unter anderem bei WOMEX, BIME, SXSW und Sziget.

Zu seinen Veröffentlichungen zählen die Singles „Bambú" (2020) und „Matiela Suto" (2021) sowie das Album „UKUN" (2023). Bereits 2014 wurde er als Toningenieur für einen Latin Grammy nominiert.`,
    metaTitle: 'Killabeatmaker – e-Ventschau 2026',
    metaDescription:
      'Afrokolumbianischer Produzent und DJ aus Medellín zwischen Cumbia, Afrobeat und Global Bass – live beim e-Ventschau.',
    socials: [
      { platform: 'instagram', url: 'https://www.instagram.com/killabeatmaker/' },
      { platform: 'spotify', url: 'https://open.spotify.com/artist/37wP9xRIgEc1Bb25jvRjQb' },
      { platform: 'bandcamp', url: 'https://killabeatmaker.bandcamp.com/' },
      { platform: 'youtube', url: 'https://www.youtube.com/channel/UCOr3T8GigveEEzSa8q3Ohgw' },
      { platform: 'facebook', url: 'https://www.facebook.com/killabeatmaker/' },
    ],
    videos: [
      { videoId: 'RSujxSq9CBk', title: 'Killabeatmaker – Matiela Suto' },
      { videoId: 'XSvz6_LEvro', title: 'Killabeatmaker & Papá Kumbé – Bambú' },
    ],
  },
  {
    slug: 'jed-thomas-band',
    genres: ['Heavy Blues Rock', 'Blues Rock', 'Slide Blues'],
    website: 'https://www.jedthomas.com/',
    excerpt:
      'Junger Slide- und Blues-Rock-Gitarrist aus Harrogate, Yorkshire, im Geiste von Rory Gallagher, Hendrix und Stevie Ray Vaughan.',
    bio: `Die **Jed Thomas Band** stammt aus Harrogate in North Yorkshire (England) und spielt einen kraftvollen, vom Blues geprägten Rock mit deutlichem 70er-Jahre-Charme und viel Raum für Improvisation.

Frontmann Jed Thomas verbindet klassischen Delta-Blues, Slide-Gitarre und elektrischen Blues; stilistisch wird er gern zwischen Stevie Ray Vaughan, Jimi Hendrix und Rory Gallagher verortet. Für sein Spiel gab es Lob von Gitarrengrößen wie Joe Bonamassa und Buddy Guy.

Gemeinsam mit Paul Austwick (Hammond-Orgel), Nibbsy Toase (Bass) und Fiete Blümel (Schlagzeug) ist die Band regelmäßig in ganz Europa unterwegs und überzeugt im kleinen Club ebenso wie auf großen Festivalbühnen.`,
    metaTitle: 'Jed Thomas Band – e-Ventschau 2026',
    metaDescription:
      'Heavy-Blues-Rock aus Yorkshire um Slide-Gitarrist Jed Thomas – live beim e-Ventschau Benefiz-Festival.',
    socials: [{ platform: 'bandcamp', url: 'https://jedthomasband.bandcamp.com/' }],
    videos: [
      { videoId: '2c27OyXn_3k', title: 'Jed Thomas Band – Mercy (live)' },
      { videoId: 'OGdI-Cz_joU', title: 'Jed Thomas Band – As The Crow Flies' },
    ],
  },
  {
    slug: 'rovar',
    genres: ['Stoner Rock', '70s Rock', 'Heavy Rock'],
    website: 'https://rovar.band',
    excerpt:
      'Energiegeladener Riff-Rock mit Bluesnote und unverkennbarem 70s-Vibe – das Münsteraner Trio bringt rohe Live-Energie auf die Bühne.',
    bio: `ROVAR ist ein Heavy- und Stoner-Rock-Trio aus Münster. Luca (Gitarre, Gesang) und Paul (Bass) spielten zuvor gemeinsam in der Bluesrock-Band „Square Heads"; mit Schlagzeuger Bennet fanden sie eine neue, deutlich energiegeladenere Richtung. Ihren Namen und offiziellen Startpunkt markiert die selbstbetitelte EP vom Juli 2019.

Die Musik der Band verbindet bluesigen Riff-Rock mit hartem Rock'n'Roll und einem unverkennbaren 70er-Jahre-Vibe – modern und frisch zugleich. Durch das gemeinsame Einspielen in einem Raum, selbst bei Studioaufnahmen, entsteht ein rohes, ungeschliffenes Live-Gefühl.

Seit dem EP-Debüt folgten u. a. das Album „Miles" (2022) sowie weitere Singles und Releases; die Band ist regelmäßig in der Münsteraner und überregionalen Rock-/Stoner-Szene live unterwegs.`,
    metaTitle: 'ROVAR – e-Ventschau 2026',
    metaDescription:
      'Stoner- und 70s-Riff-Rock-Trio aus Münster – rohe Live-Energie beim e-Ventschau Benefiz-Festival.',
    socials: [
      { platform: 'instagram', url: 'https://www.instagram.com/rovarmusic/' },
      { platform: 'facebook', url: 'https://www.facebook.com/rovarband/' },
      { platform: 'youtube', url: 'https://www.youtube.com/@ROVARBAND' },
      { platform: 'spotify', url: 'https://open.spotify.com/artist/2iInOu4asDdgob7iDt4VFQ' },
      { platform: 'bandcamp', url: 'https://rovarband.bandcamp.com' },
    ],
    videos: [
      { videoId: 'nc8-CbRNkWg', title: 'ROVAR – On My Track (Official Video)' },
      { videoId: 'fazd3eqDkwY', title: 'ROVAR – Made of Stone (Official Video)' },
    ],
  },
  {
    slug: 'the-klaxon',
    genres: ['Ska', 'Reggae', 'Latin'],
    excerpt:
      'Seit 2000 mischt The Klaxon aus Bogotá Ska und Reggae mit Cumbia, Bolero und Salsa zu energiegeladenem kolumbianischem Latin-Sound.',
    metaTitle: 'The Klaxon – e-Ventschau 2026',
    metaDescription:
      'Kolumbianische Ska- und Reggae-Band aus Bogotá mit Latin-Einflüssen – live beim e-Ventschau Benefiz-Festival.',
    socials: [
      { platform: 'spotify', url: 'https://open.spotify.com/artist/35xfKANTP1bPYzVL71vSTY' },
      { platform: 'instagram', url: 'https://www.instagram.com/theklaxon/' },
      { platform: 'facebook', url: 'https://www.facebook.com/theklaxon/' },
      { platform: 'youtube', url: 'https://www.youtube.com/theklaxon' },
    ],
    videos: [{ videoId: 'jALlugOs0vc', title: 'The Klaxon – Miedo' }],
  },
  {
    slug: 'nanny-goats',
    excerpt: 'Nanny Goats sind ein semi-akustischer Live-Act aus der Region Lüneburg.',
    bio: `Nanny Goats sind ein semi-akustischer Live-Act aus der Region Lüneburg.

Die Band bringt ihr Programm in intimer, akustisch geprägter Besetzung auf die Bühne.`,
    metaTitle: 'Nanny Goats – e-Ventschau 2026',
    metaDescription: 'Semi-akustischer Live-Act aus der Region Lüneburg – beim e-Ventschau Benefiz-Festival.',
  },
]

function dedupeStrings(arr: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const s of arr) {
    const k = s.trim().toLowerCase()
    if (!k || seen.has(k)) continue
    seen.add(k)
    out.push(s.trim())
  }
  return out
}

async function main() {
  const tenant = await prisma.tenant.findUnique({ where: { slug: TENANT_SLUG } })
  if (!tenant) throw new Error(`Tenant '${TENANT_SLUG}' not found`)
  console.log(`Tenant: ${tenant.slug} (${tenant.id})${DRY ? '  [DRY RUN]' : ''}\n`)

  let filledFields = 0
  let addedSocials = 0
  let addedVideos = 0

  for (const seed of DATA) {
    const artist = await prisma.artist.findUnique({
      where: { tenantId_slug: { tenantId: tenant.id, slug: seed.slug } },
      include: { media: true },
    })
    if (!artist) {
      console.log(`✗ ${seed.slug}: NOT FOUND — skipped`)
      continue
    }

    const data: Record<string, unknown> = {}
    const log: string[] = []

    // Scalar text: fill only when empty.
    const scalars: [keyof ArtistSeed, string][] = [
      ['website', 'website'],
      ['excerpt', 'excerpt'],
      ['bio', 'bio'],
      ['metaTitle', 'metaTitle'],
      ['metaDescription', 'metaDescription'],
    ]
    for (const [key, col] of scalars) {
      const incoming = seed[key] as string | undefined
      const current = (artist as Record<string, unknown>)[col] as string | null | undefined
      if (incoming && (!current || current.trim() === '')) {
        data[col] = incoming
        log.push(`+${col}`)
        filledFields++
      }
    }

    // genres: union (never remove).
    if (seed.genres?.length) {
      const merged = dedupeStrings([...(artist.genres || []), ...seed.genres])
      if (merged.length !== artist.genres.length) {
        data.genres = merged
        log.push(`genres→[${merged.join(', ')}]`)
      }
    }

    // socials: merge, never remove existing. Dedupe by platform (one link per
    // platform) and by normalized url (ignore trailing slash / case).
    if (seed.socials?.length) {
      const existing: Social[] = Array.isArray(artist.socials) ? (artist.socials as Social[]) : []
      const normUrl = (u: string) => (u || '').toLowerCase().replace(/\/+$/, '')
      const havePlatforms = new Set(existing.map((s) => (s.platform || '').toLowerCase()))
      const haveUrls = new Set(existing.map((s) => normUrl(s.url)))
      const additions = seed.socials.filter(
        (s) => !havePlatforms.has(s.platform.toLowerCase()) && !haveUrls.has(normUrl(s.url)),
      )
      if (additions.length) {
        data.socials = [...existing, ...additions]
        addedSocials += additions.length
        log.push(`+${additions.length} social(s): ${additions.map((s) => s.platform).join(', ')}`)
      }
    }

    if (Object.keys(data).length && !DRY) {
      await prisma.artist.update({ where: { id: artist.id }, data })
    }

    // Videos: add ArtistMedia(kind=youtube) when videoId is new.
    const newVideos: string[] = []
    if (seed.videos?.length) {
      const haveVideoIds = new Set(artist.media.map((m) => m.videoId).filter(Boolean) as string[])
      let order = artist.media.length
      for (const v of seed.videos) {
        if (haveVideoIds.has(v.videoId)) continue
        newVideos.push(v.videoId)
        addedVideos++
        if (!DRY) {
          await prisma.artistMedia.create({
            data: {
              artistId: artist.id,
              kind: 'youtube',
              videoId: v.videoId,
              altText: v.title,
              caption: v.title,
              sortOrder: order++,
            },
          })
        }
      }
      if (newVideos.length) log.push(`+${newVideos.length} video(s)`)
    }

    console.log(`✓ ${seed.slug}: ${log.length ? log.join('  ') : '(nothing to add — already complete)'}`)
  }

  console.log(`\n=== ${DRY ? 'DRY RUN — ' : ''}done: ${filledFields} field(s), ${addedSocials} social(s), ${addedVideos} video(s) ===`)
}

main()
  .then(() => prisma.$disconnect())
  .then(() => process.exit(0))
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
