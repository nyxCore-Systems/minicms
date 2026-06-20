// Default content + content shapes for the editable Noir homepage elements
// (hero, manifest, donate). Used by the section components (as fallbacks when a
// HomepageSection has no/partial content), by the default homepage layout, and
// by the "import current homepage as elements" route to seed editable values.

export interface NoirCtaButton {
  label: string
  href: string
  variant?: 'primary' | 'secondary'
}

export interface NoirMetaTile {
  label: string
  value: string
}

export interface NoirHeroContent {
  /** Plain-text tagline. When omitted, the styled default tagline is rendered. */
  subtitle?: string
  buttons?: NoirCtaButton[]
  /** Editable meta tiles shown after the auto "Acts" + "Datum" tiles. */
  tiles?: NoirMetaTile[]
}

export interface NoirStat {
  value: string
  label: string
}

export interface NoirManifestContent {
  /** Plain-text heading. When omitted, the styled default heading is rendered. */
  heading?: string
  text?: string
  stats?: NoirStat[]
}

export interface NoirDonateContent {
  label?: string
  heading?: string
  text?: string
  chips?: string[]
  ctaLabel?: string
  ctaHref?: string
  cardHeading?: string
  cardSubtext?: string
  raised?: number
  target?: number
}

export const NOIR_HERO_DEFAULTS = {
  buttons: [
    { label: 'Programm ansehen', href: '#programm', variant: 'primary' as const },
    { label: 'Tickets & Spenden', href: '#spenden', variant: 'secondary' as const },
  ],
  tiles: [
    { label: 'Camping', value: 'Frei auf der Wiese' },
    { label: 'Zweck', value: '100% Benefiz' },
  ],
} satisfies Required<Omit<NoirHeroContent, 'subtitle'>>

export const NOIR_LINEUP_DEFAULTS = {
  label: 'Line-up 2026',
  intro:
    'Von skandinavischem Blues-Rock bis kolumbianischem Club-Beat – kuratiert für die Nacht, gespielt unter freiem Himmel.',
}

export const NOIR_TIMETABLE_DEFAULTS = {
  label: 'Timetable',
  heading: 'Der Ablauf',
  intro: 'Musik, Vorträge, Ausstellung und Kinderprogramm – zwei Tage durchgetaktet.',
}

export const NOIR_MANIFEST_DEFAULTS = {
  text:
    'Seit 2013 erinnert e-Ventschau an Tschernobyl und Fukushima – mit Musik, Kunst und Haltung. Ehrenamtlich organisiert, solidarisch finanziert, 100% Benefiz. Ein Hof, zwei Nächte, eine klare Botschaft: Kultur ist Widerstand.',
  stats: [
    { value: '11.', label: 'Ausgabe' },
    { value: '20', label: 'Ehrenamtliche' },
    { value: '2013', label: 'seit' },
    { value: '100%', label: 'Benefiz' },
  ],
} satisfies Required<Omit<NoirManifestContent, 'heading'>>

export const NOIR_DONATE_DEFAULTS = {
  label: 'Tickets & Spenden',
  heading: 'Zahl, was du kannst.',
  text:
    'Der Eintritt bleibt sozial verträglich – wer mehr gibt, sichert das Festival. Jeder Euro fließt in den Benefiz-Zweck.',
  chips: ['10 €', '25 €', '50 €', 'Frei'],
  ctaLabel: 'Jetzt spenden',
  ctaHref: '/unterstuetzung',
  cardHeading: 'Spendenziel 2026',
  cardSubtext: 'Für Technik, Bühne & Künstler:innen.',
  raised: 8420,
  target: 12000,
} satisfies Required<NoirDonateContent>

/** Format an integer euro amount the German way, e.g. 8420 → "8.420 €". */
export function formatEuro(n: number): string {
  return `${new Intl.NumberFormat('de-DE').format(Math.round(n))} €`
}

export const NOIR_ELEMENT_TYPES = [
  'noir_hero',
  'noir_marquee',
  'noir_lineup',
  'noir_timetable',
  'noir_manifest',
  'noir_donate',
] as const

export type NoirElementType = (typeof NOIR_ELEMENT_TYPES)[number]

/** Default ordered layout used for the import action and the no-sections fallback. */
export const NOIR_DEFAULT_LAYOUT: NoirElementType[] = [
  'noir_hero',
  'noir_marquee',
  'noir_lineup',
  'noir_timetable',
  'noir_manifest',
  'noir_donate',
]
